export async function installBrowserPerfCloudSyncGatewayIsolation(context, buildRoomCredential) {
  const rows = new Map();
  await context.route('**/functions/v1/wp-cloud-sync-room', async route => {
    const request = route.request();
    const method = String(request.method() || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method !== 'POST') {
      await route.fulfill({ status: 405, contentType: 'application/json', body: '{"ok":false}' });
      return;
    }

    let body = {};
    try {
      const parsed = JSON.parse(String(request.postData() || '{}'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
    } catch {}
    const action = typeof body.action === 'string' ? body.action : '';
    const room = typeof body.room === 'string' ? body.room : '';
    if (action === 'issue-public' || action === 'create-room' || action === 'renew-room') {
      const issuedRoom =
        action === 'issue-public'
          ? 'public'
          : action === 'renew-room'
            ? room
            : `room_perf_${Date.now().toString(36)}`;
      await route.fulfill({
        status: action === 'create-room' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          credential: buildRoomCredential(issuedRoom),
        }),
      });
      return;
    }
    if (action === 'read') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, row: rows.get(room) || null }),
      });
      return;
    }
    if (action === 'publish-sketch') {
      const current = rows.get(room) || null;
      const payload =
        body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};
      const desiredHash = typeof payload.sketchHash === 'string' ? payload.sketchHash.trim() : '';
      const currentHash =
        typeof current?.payload?.sketchHash === 'string' ? current.payload.sketchHash.trim() : '';
      const clearNoop =
        !!current &&
        payload.sketch === null &&
        payload.sketchHash === null &&
        !current.payload.sketch &&
        !current.payload.sketchHash;
      const hashNoop = !!current && !!desiredHash && desiredHash === currentHash;
      if (clearNoop || hashNoop) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, changed: false, row: current }),
        });
        return;
      }
      const row = {
        room,
        payload,
        revision: (current?.revision || 0) + 1,
        updated_at: new Date().toISOString(),
        updated_by: typeof body.clientId === 'string' ? body.clientId : 'perf-client',
      };
      rows.set(room, row);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, changed: true, row }),
      });
      return;
    }
    if (action === 'write') {
      const current = rows.get(room) || null;
      const expectedRevision = typeof body.expectedRevision === 'number' ? body.expectedRevision : -1;
      if ((current?.revision || 0) !== expectedRevision) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, code: 'revision_conflict', row: current }),
        });
        return;
      }
      const row = {
        room,
        payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
        revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
        updated_by: typeof body.clientId === 'string' ? body.clientId : 'perf-client',
      };
      rows.set(room, row);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, row }),
      });
      return;
    }
    await route.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false}' });
  });
}
