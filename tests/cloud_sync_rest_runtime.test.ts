import test from 'node:test';
import assert from 'node:assert/strict';

import { getRow, upsertRow } from '../esm/native/services/cloud_sync_rest.ts';

test('cloud sync rest preserves control-row payload fields on getRow', async () => {
  const row = await getRow(
    async () => ({
      ok: true,
      json: async () => ({
        room: 'public::sketch',
        updated_at: '2026-03-16T20:00:00Z',
        payload: {
          sketchRev: 123,
          sketchHash: 'hash-1',
          sketchBy: 'client-a',
          sketch: { foo: 'bar' },
        },
      }),
    }),
    'https://example.test/rest/v1/wp_shared_state',
    'anon',
    'public::sketch'
  );

  assert.ok(row);
  assert.equal(row?.room, 'public::sketch');
  assert.equal((row?.payload as Record<string, unknown>).sketchRev, 123);
  assert.equal((row?.payload as Record<string, unknown>).sketchHash, 'hash-1');
  assert.deepEqual((row?.payload as Record<string, unknown>).sketch, { foo: 'bar' });
});

test('cloud sync rest getRow accepts array responses and returns null for missing rows without object-only 406 semantics', async () => {
  const seen: Array<{ url: string; headers: Record<string, unknown> | undefined }> = [];
  const row = await getRow(
    async (url, init) => {
      seen.push({
        url: String(url),
        headers: (init?.headers || undefined) as Record<string, unknown> | undefined,
      });
      return {
        ok: true,
        json: async () => [
          {
            room: 'public::sketch::toSite2',
            updated_at: '2026-03-30T08:00:00.000Z',
            payload: { sketchRev: 7, sketchHash: 'hash-array' },
          },
        ],
      };
    },
    'https://example.test/rest/v1/wp_shared_state',
    'anon',
    'public::sketch::toSite2'
  );

  assert.equal(row?.room, 'public::sketch::toSite2');
  assert.equal((row?.payload as Record<string, unknown>).sketchHash, 'hash-array');
  assert.match(seen[0]?.url || '', /limit=1/);
  assert.equal(String(seen[0]?.headers?.Accept || ''), 'application/json');
});

test('cloud sync rest getRow returns null for empty array responses', async () => {
  const row = await getRow(
    async () => ({
      ok: true,
      json: async () => [],
    }),
    'https://example.test/rest/v1/wp_shared_state',
    'anon',
    'public::sketch::toMain'
  );

  assert.equal(row, null);
});
test('cloud sync rest preserves tabs gate payload fields on upsert response', async () => {
  const res = await upsertRow(
    async () => ({
      ok: true,
      json: async () => [
        {
          room: 'private::tabsGate',
          updated_at: '2026-03-16T20:00:01Z',
          payload: {
            tabsGateOpen: true,
            tabsGateUntil: 123456,
            tabsGateBy: 'client-b',
          },
        },
      ],
    }),
    'https://example.test/rest/v1/wp_shared_state',
    'anon',
    'private::tabsGate',
    { tabsGateOpen: true },
    { returnRepresentation: true }
  );

  assert.equal(res.ok, true);
  assert.ok(res.row);
  assert.equal((res.row?.payload as Record<string, unknown>).tabsGateOpen, true);
  assert.equal((res.row?.payload as Record<string, unknown>).tabsGateUntil, 123456);
  assert.equal((res.row?.payload as Record<string, unknown>).tabsGateBy, 'client-b');
});

test('cloud sync rest sanitizes saved collections while preserving control rows and extra payload fields', async () => {
  const row = await getRow(
    async () => ({
      ok: true,
      json: async () => ({
        room: 'public',
        updated_at: '2026-03-16T20:00:02Z',
        payload: {
          savedModels: [{ id: 'm-1', name: 'Valid model' }, { id: 'm-2' }],
          savedColors: [{ id: 'c-1', value: '#fff' }, { value: '#000' }],
          colorSwatchesOrder: ['c-1', 2, null, { bad: true }],
          presetOrder: ['preset-a', false, 7],
          hiddenPresets: [null, 'hidden-a', {}],
          tabsGateBy: 'client-z',
        },
      }),
    }),
    'https://example.test/rest/v1/wp_shared_state',
    'anon',
    'public'
  );

  assert.deepEqual(row, {
    room: 'public',
    updated_at: '2026-03-16T20:00:02Z',
    payload: {
      savedModels: [{ id: 'm-1', name: 'Valid model' }],
      savedColors: [{ id: 'c-1', value: '#fff' }],
      colorSwatchesOrder: ['c-1', 2, null],
      presetOrder: ['preset-a', 7],
      hiddenPresets: [null, 'hidden-a'],
      tabsGateBy: 'client-z',
    },
  });
});
