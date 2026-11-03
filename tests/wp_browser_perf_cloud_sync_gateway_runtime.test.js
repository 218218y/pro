import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserPerfCloudSyncGatewayIsolation } from '../tools/wp_browser_perf_cloud_sync_gateway.js';

async function createGateway() {
  let handler;
  await installBrowserPerfCloudSyncGatewayIsolation(
    {
      async route(pattern, callback) {
        assert.equal(pattern, '**/functions/v1/wp-cloud-sync-room');
        handler = callback;
      },
    },
    room => ({ room, token: 'test-token', expiresAt: '2099-01-01T00:00:00.000Z' })
  );
  return async (body, method = 'POST') => {
    let response;
    await handler({
      request: () => ({ method: () => method, postData: () => JSON.stringify(body) }),
      async fulfill(value) {
        response = { status: value.status, body: value.body ? JSON.parse(value.body) : null };
      },
    });
    assert.ok(response);
    return response;
  };
}

test('browser perf gateway publishes and clears sketches without a client revision', async () => {
  const gateway = await createGateway();
  const publish = payload => gateway({ action: 'publish-sketch', room: 'sketch', clientId: 'test', payload });
  const saved = await publish({ sketch: { width: 100 }, sketchHash: 'hash-1', sketchRev: 10 });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.changed, true);
  assert.equal(saved.body.row.revision, 1);
  const duplicate = await publish({ sketch: { width: 100 }, sketchHash: 'hash-1', sketchRev: 20 });
  assert.equal(duplicate.body.changed, false);
  assert.deepEqual(duplicate.body.row, saved.body.row);
  const cleared = await publish({ sketch: null, sketchHash: null, sketchRev: 30 });
  assert.equal(cleared.body.changed, true);
  assert.equal(cleared.body.row.revision, 2);
  assert.equal(cleared.body.row.payload.sketch, null);
  const clearedAgain = await publish({ sketch: null, sketchHash: null, sketchRev: 40 });
  assert.equal(clearedAgain.body.changed, false);
  assert.deepEqual(clearedAgain.body.row, cleared.body.row);
  assert.deepEqual((await gateway({ action: 'read', room: 'sketch' })).body.row, cleared.body.row);
});

test('browser perf gateway retains collection revision conflicts and room isolation', async () => {
  const gateway = await createGateway();
  const write = { action: 'write', room: 'collections', expectedRevision: 0, payload: { savedColors: [] } };
  assert.equal((await gateway(write)).status, 200);
  const conflict = await gateway(write);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'revision_conflict');
  assert.equal(conflict.body.row.revision, 1);
  assert.equal((await gateway({ action: 'read', room: 'other' })).body.row, null);
  const credential = await gateway({ action: 'renew-room', room: 'collections' });
  assert.equal(credential.body.credential.room, 'collections');
  assert.equal((await gateway({ action: 'unsupported' })).status, 400);
  assert.equal((await gateway({}, 'GET')).status, 405);
});
