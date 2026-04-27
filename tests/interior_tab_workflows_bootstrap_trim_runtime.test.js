import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteriorWorkflowControllerHarness } from './interior_tab_runtime_helpers.js';

function createFakeTimers() {
  const handles = [];
  return {
    handles,
    setTimeout(fn) {
      const handle = { fn, cleared: false };
      handles.push(handle);
      return handle;
    },
    clearTimeout(handle) {
      if (handle) handle.cleared = true;
    },
    flush() {
      for (const handle of handles) {
        if (!handle.cleared) handle.fn();
      }
    },
  };
}

test('[interior-workflows-controller] drawer bootstrap stays single-flight and cancels before direct toggle', () => {
  const timers = createFakeTimers();
  const { calls, controller } = createInteriorWorkflowControllerHarness({}, timers);

  controller.setInternalDrawersEnabled(true);
  controller.setInternalDrawersEnabled(true);

  assert.equal(calls.filter(entry => entry[0] === 'setInternalDrawersEnabled').length, 2);
  assert.equal(timers.handles.length, 1);

  controller.toggleIntDrawerMode();
  timers.flush();

  assert.equal(calls.filter(entry => entry[0] === 'toggleIntDrawerMode').length, 1);
});

test('[interior-workflows-controller] drawer bootstrap uses injected browser timers instead of global setTimeout', () => {
  const timers = createFakeTimers();
  const { calls, controller } = createInteriorWorkflowControllerHarness(
    {},
    {
      timers,
      setTimeout() {
        throw new Error('global setTimeout should not be used');
      },
    }
  );

  controller.setInternalDrawersEnabled(true);
  assert.equal(timers.handles.length, 1);
  timers.flush();

  assert.equal(calls.filter(entry => entry[0] === 'toggleIntDrawerMode').length, 1);
});

test('[interior-workflows-controller] stale drawer bootstrap callback is ignored after clear even if it fires late', () => {
  const timers = createFakeTimers();
  const { calls, controller } = createInteriorWorkflowControllerHarness({}, { timers });

  controller.setInternalDrawersEnabled(true);
  assert.equal(timers.handles.length, 1);

  const staleHandle = timers.handles[0];
  controller.setInternalDrawersEnabled(false);
  staleHandle.fn();

  assert.equal(calls.filter(entry => entry[0] === 'toggleIntDrawerMode').length, 0);
});

test('[interior-workflows-controller] disabling drawers clears pending bootstrap and same trim color stays no-op', () => {
  const timers = createFakeTimers();
  const { calls, colorCalls, controller } = createInteriorWorkflowControllerHarness(
    {
      modeOpts: { trimAxis: 'vertical', trimSpan: 'custom', sentinel: 7 },
      isDoorTrimMode: true,
      doorTrimColor: 'gold',
      doorTrimVerticalSpan: 'third',
      doorTrimVerticalCustomCm: 17,
      doorTrimVerticalCrossCm: 5,
    },
    timers
  );

  controller.setInternalDrawersEnabled(true);
  assert.equal(timers.handles.length, 1);
  controller.setInternalDrawersEnabled(false);
  timers.flush();
  assert.equal(calls.filter(entry => entry[0] === 'toggleIntDrawerMode').length, 0);

  calls.length = 0;
  controller.setDoorTrimColorAndMaybeRefresh('gold');
  assert.deepEqual(colorCalls, []);
  assert.equal(calls.filter(entry => entry[0] === 'enterPrimaryMode').length, 0);

  controller.activateDoorTrimMode('horizontal', 'half', 11, 3);
  controller.setDoorTrimColorAndMaybeRefresh('black');

  const enterDoorTrimCalls = calls.filter(entry => entry[0] === 'enterPrimaryMode');
  assert.equal(enterDoorTrimCalls.length, 2);
  assert.deepEqual(colorCalls, ['black']);
  assert.equal(enterDoorTrimCalls[0][2], 'door_trim');
  assert.equal(
    JSON.stringify(enterDoorTrimCalls[0][3].modeOpts),
    JSON.stringify({
      trimAxis: 'horizontal',
      trimColor: 'gold',
      trimSpan: 'half',
      trimSizeCm: 11,
      trimCrossSizeCm: 3,
    })
  );
  assert.equal(enterDoorTrimCalls[1][2], 'door_trim');
  assert.equal(
    JSON.stringify(enterDoorTrimCalls[1][3].modeOpts),
    JSON.stringify({
      trimAxis: 'vertical',
      trimSpan: 'custom',
      sentinel: 7,
      trimColor: 'black',
      trimSizeCm: 17,
      trimCrossSizeCm: 5,
    })
  );
});
