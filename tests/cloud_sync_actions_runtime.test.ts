import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteTemporaryColors,
  copyCloudSyncShareLink,
  deleteTemporaryModels,
  goCloudSyncPrivate,
  goCloudSyncPublic,
  setFloatingSketchSyncEnabled,
  syncSketchNow,
  toggleSite2TabsGate,
} from '../esm/native/ui/react/actions/cloud_sync_actions.ts';
import {
  getCloudDeleteTempToast,
  getCloudSketchSyncToast,
  getCloudSyncRoomModeToast,
  getCloudSyncShareLinkToast,
  getFloatingSketchSyncPinToast,
  getSite2TabsGateToast,
} from '../esm/native/ui/cloud_sync_action_feedback.ts';

test('cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping', async () => {
  const App = {
    services: {
      cloudSync: {
        panelApi: {
          goPublic() {
            return {
              ok: true,
              changed: true,
              mode: 'public',
              room: 'public',
              shareLink: 'https://site2.test/',
            };
          },
          goPrivate() {
            return {
              ok: true,
              changed: true,
              mode: 'private',
              room: 'room-2',
              shareLink: 'https://site2.test/?room=room-2',
            };
          },
          copyShareLink() {
            return Promise.resolve({ ok: true, prompted: true, link: 'https://site2.test/?room=room-2' });
          },
          setSite2TabsGateOpen(open: boolean) {
            return Promise.resolve({ ok: true, changed: true, open: !!open, until: 1234 });
          },
          syncSketchNow() {
            return Promise.resolve({ ok: true, changed: false, reason: 'noop', hash: 'abc' });
          },
          deleteTemporaryModels() {
            return Promise.resolve({ ok: true, removed: 1 });
          },
          deleteTemporaryColors() {
            return Promise.resolve({ ok: false, removed: 0, reason: 'busy' });
          },
          setFloatingSketchSyncEnabled(enabled: boolean) {
            return Promise.resolve({ ok: true, changed: true, enabled: !!enabled });
          },
        },
      },
    },
  } as any;

  const publicResult = goCloudSyncPublic(App);
  assert.deepEqual(publicResult, {
    ok: true,
    changed: true,
    mode: 'public',
    room: 'public',
    shareLink: 'https://site2.test/',
  });
  assert.equal(getCloudSyncRoomModeToast(publicResult), null);

  const privateResult = goCloudSyncPrivate(App);
  assert.deepEqual(privateResult, {
    ok: true,
    changed: true,
    mode: 'private',
    room: 'room-2',
    shareLink: 'https://site2.test/?room=room-2',
  });

  const shareResult = await copyCloudSyncShareLink(App);
  assert.deepEqual(shareResult, { ok: true, prompted: true, link: 'https://site2.test/?room=room-2' });
  assert.deepEqual(getCloudSyncShareLinkToast(shareResult), {
    message: 'פתחתי חלון להעתקת הקישור',
    type: 'info',
  });

  const gateResult = await toggleSite2TabsGate(App, true, { source: 'react:site2:tabsGate' });
  assert.deepEqual(gateResult, { ok: true, changed: true, open: true, until: 1234 });
  assert.equal(getSite2TabsGateToast(gateResult), null);

  const sketchResult = await syncSketchNow(App);
  assert.deepEqual(sketchResult, { ok: true, changed: false, reason: 'noop', hash: 'abc' });
  assert.deepEqual(getCloudSketchSyncToast(sketchResult), {
    message: 'הסקיצה כבר מעודכנת בענן',
    type: 'info',
  });

  const deleteModelsResult = await deleteTemporaryModels(App);
  assert.deepEqual(deleteModelsResult, { ok: true, removed: 1 });
  assert.deepEqual(getCloudDeleteTempToast(deleteModelsResult, 'models'), {
    message: 'נמחקו 1 דגמים',
    type: 'success',
  });

  const deleteColorsResult = await deleteTemporaryColors(App);
  assert.deepEqual(deleteColorsResult, { ok: false, removed: 0, reason: 'busy' });
  assert.deepEqual(getCloudDeleteTempToast(deleteColorsResult, 'colors'), {
    message: 'מחיקת צבעים זמניים כבר בתהליך',
    type: 'warning',
  });

  const pinResult = await setFloatingSketchSyncEnabled(App, true);
  assert.deepEqual(pinResult, { ok: true, changed: true, enabled: true });
  assert.equal(getFloatingSketchSyncPinToast(pinResult), null);

  assert.deepEqual(getSite2TabsGateToast({ ok: false, reason: 'busy' }), {
    message: 'סנכרון טאבי Site2 כבר בתהליך',
    type: 'warning',
  });
  assert.deepEqual(getFloatingSketchSyncPinToast({ ok: false, reason: 'busy' }), {
    message: 'סנכרון ההצמדה כבר בתהליך',
    type: 'warning',
  });
});

test('cloud sync actions keep local site2 fallback and report missing cloud mutation services explicitly', async () => {
  const App = {} as any;
  const gateResult = await toggleSite2TabsGate(App, true, { source: 'react:site2:tabsGate', noBuild: true });
  assert.deepEqual(gateResult, { ok: true, changed: true, open: true, until: 0 });

  const sketchResult = await syncSketchNow(App);
  assert.deepEqual(sketchResult, { ok: false, reason: 'not-installed' });
  assert.deepEqual(getCloudSketchSyncToast(sketchResult), {
    message: 'סנכרון הסקיצה לא זמין כרגע',
    type: 'error',
  });

  const deleteModelsResult = await deleteTemporaryModels(App);
  assert.deepEqual(deleteModelsResult, { ok: false, removed: 0, reason: 'not-installed' });
  assert.deepEqual(getCloudDeleteTempToast(deleteModelsResult, 'models'), {
    message: 'מחיקת דגמים זמניים לא זמינה כרגע',
    type: 'error',
  });

  assert.deepEqual(goCloudSyncPublic(App), { ok: false, mode: 'public', reason: 'not-installed' });
  assert.deepEqual(goCloudSyncPrivate(App), { ok: false, mode: 'private', reason: 'not-installed' });
  assert.deepEqual(await copyCloudSyncShareLink(App), { ok: false, reason: 'not-installed' });

  const pinResult = await setFloatingSketchSyncEnabled(App, true);
  assert.deepEqual(pinResult, { ok: false, reason: 'not-installed' });
});
