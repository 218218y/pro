import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCloudDeleteTempToast,
  getCloudSketchSyncToast,
  getCloudSyncRoomModeToast,
  getCloudSyncShareLinkToast,
  getFloatingSketchSyncPinToast,
  getSite2TabsGateToast,
  reportCloudDeleteTempResult,
  reportCloudSketchSyncResult,
  reportCloudSyncRoomModeResult,
  reportCloudSyncShareLinkResult,
  reportFloatingSketchSyncPinResult,
  reportSite2TabsGateResult,
  type CloudSyncActionToastLike,
} from '../esm/native/ui/cloud_sync_action_feedback.ts';

type ToastSpy = {
  seen: CloudSyncActionToastLike[];
  toast: (message: string, type?: CloudSyncActionToastLike['type']) => void;
};

function createToastSpy(): ToastSpy {
  const seen: CloudSyncActionToastLike[] = [];
  return {
    seen,
    toast(message, type) {
      seen.push({ message, type: (type || 'info') as CloudSyncActionToastLike['type'] });
    },
  };
}

test('cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required', () => {
  const shareFb = createToastSpy();
  const shareResult = { ok: true, copied: true, link: 'https://site2.test' };
  assert.deepEqual(getCloudSyncShareLinkToast(shareResult), { message: 'הקישור הועתק', type: 'success' });
  assert.deepEqual(reportCloudSyncShareLinkResult(shareFb, shareResult), {
    message: 'הקישור הועתק',
    type: 'success',
  });
  assert.deepEqual(shareFb.seen, [{ message: 'הקישור הועתק', type: 'success' }]);

  const roomFb = createToastSpy();
  assert.equal(getCloudSyncRoomModeToast({ ok: true, changed: true, mode: 'public' }), null);
  assert.equal(reportCloudSyncRoomModeResult(roomFb, { ok: true, changed: true, mode: 'public' }), null);
  assert.deepEqual(roomFb.seen, []);

  const sketchFb = createToastSpy();
  const sketchResult = { ok: true, changed: false, reason: 'noop' };
  assert.deepEqual(getCloudSketchSyncToast(sketchResult), {
    message: 'הסקיצה כבר מעודכנת בענן',
    type: 'info',
  });
  assert.deepEqual(reportCloudSketchSyncResult(sketchFb, sketchResult), {
    message: 'הסקיצה כבר מעודכנת בענן',
    type: 'info',
  });
  assert.deepEqual(sketchFb.seen, [{ message: 'הסקיצה כבר מעודכנת בענן', type: 'info' }]);

  const deleteFb = createToastSpy();
  const deleteResult = { ok: false, removed: 0, reason: 'cancelled' };
  assert.deepEqual(getCloudDeleteTempToast(deleteResult, 'models'), {
    message: 'המחיקה בוטלה',
    type: 'info',
  });
  assert.deepEqual(reportCloudDeleteTempResult(deleteFb, deleteResult, 'models'), {
    message: 'המחיקה בוטלה',
    type: 'info',
  });
  assert.deepEqual(deleteFb.seen, [{ message: 'המחיקה בוטלה', type: 'info' }]);

  const site2Fb = createToastSpy();
  const gateResult = { ok: false, reason: 'busy' };
  assert.deepEqual(getSite2TabsGateToast(gateResult), {
    message: 'סנכרון טאבי Site2 כבר בתהליך',
    type: 'warning',
  });
  assert.deepEqual(reportSite2TabsGateResult(site2Fb, gateResult), {
    message: 'סנכרון טאבי Site2 כבר בתהליך',
    type: 'warning',
  });
  assert.deepEqual(site2Fb.seen, [{ message: 'סנכרון טאבי Site2 כבר בתהליך', type: 'warning' }]);

  const pinFb = createToastSpy();
  assert.equal(getFloatingSketchSyncPinToast({ ok: true, changed: true, enabled: true }), null);
  assert.deepEqual(reportFloatingSketchSyncPinResult(pinFb, { ok: true, changed: true, enabled: true }), {
    message: 'הצמדה הופעלה',
    type: 'success',
  });
  assert.deepEqual(pinFb.seen, [{ message: 'הצמדה הופעלה', type: 'success' }]);
});

test('cloud sync feedback prefers preserved error messages when available', () => {
  assert.deepEqual(
    getCloudSyncShareLinkToast({ ok: false, reason: 'error', message: 'clipboard exploded' }),
    {
      message: 'clipboard exploded',
      type: 'error',
    }
  );
  assert.deepEqual(
    getCloudSyncRoomModeToast({ ok: false, mode: 'public', reason: 'error', message: 'router failed' }),
    {
      message: 'router failed',
      type: 'error',
    }
  );
  assert.deepEqual(getCloudSketchSyncToast({ ok: false, reason: 'error', message: 'upload exploded' }), {
    message: 'upload exploded',
    type: 'error',
  });
  assert.deepEqual(
    getCloudDeleteTempToast({ ok: false, removed: 0, reason: 'error', message: 'delete exploded' }, 'models'),
    {
      message: 'delete exploded',
      type: 'error',
    }
  );
  assert.deepEqual(getFloatingSketchSyncPinToast({ ok: false, reason: 'error', message: 'pin exploded' }), {
    message: 'pin exploded',
    type: 'error',
  });
  assert.deepEqual(getSite2TabsGateToast({ ok: false, reason: 'error', message: 'gate exploded' }), {
    message: 'gate exploded',
    type: 'error',
  });
});
