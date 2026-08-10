import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearViewerMeasurementOverlayWithRuntime,
  getViewerMeasurementToolModeWithRuntime,
  setViewerMeasurementToolModeWithRuntime,
  tryHandleViewerMeasurementClickWithRuntime,
} from '../esm/native/services/viewer_measurement_tool_flow.ts';
import type { ViewerMeasurementFeatureRuntime } from '../esm/native/services/viewer_measurement_tool_runtime.ts';
import type {
  MeasurementOverlayState,
  ViewerMeasurementToolMode,
} from '../esm/native/services/viewer_measurement_tool_contracts.ts';

function createCapabilityRuntime() {
  let mode: ViewerMeasurementToolMode = 'part';
  let committed: MeasurementOverlayState | null = null;
  let hover: MeasurementOverlayState | null = null;
  const cursors: string[] = [];
  const nonFatal: Array<{ op: string; error: unknown }> = [];
  const pickingIssues: Array<{ op: string; error: unknown; throttleMs?: number }> = [];
  let touches = 0;
  let exits = 0;
  let chromeClears = 0;
  let hints = 0;

  const runtime: ViewerMeasurementFeatureRuntime = {
    geometry: {
      getCamera: () => null,
      getInternalGridMap: () => ({}),
      measureObjectLocalBox: () => null,
      projectWorldPointToLocal: () => null,
    },
    state: {
      readOverlay: slot => (slot === 'hover' ? hover : committed),
      writeOverlay: (slot, state) => {
        if (slot === 'hover') hover = state;
        else committed = state;
      },
      readToolMode: () => mode,
      writeToolMode: nextMode => {
        mode = nextMode;
      },
    },
    render: {
      readThree: () => null,
      readWardrobeGroup: () => null,
      readAddDimensionLine: () => null,
      touch: () => {
        touches += 1;
      },
    },
    ui: {
      writeCursor: cursor => {
        cursors.push(cursor);
      },
      clearModeChrome: () => {
        chromeClears += 1;
      },
      showPointDraftHint: () => {
        hints += 1;
      },
      exitPrimaryMode: () => {
        exits += 1;
      },
    },
    diagnostics: {
      reportNonFatal: (op, error) => {
        nonFatal.push({ op, error });
      },
      reportPickingIssue: (error, op, throttleMs) => {
        pickingIssues.push({ op, error, throttleMs });
      },
    },
  };

  return {
    runtime,
    setCommitted(state: MeasurementOverlayState | null) {
      committed = state;
    },
    setHover(state: MeasurementOverlayState | null) {
      hover = state;
    },
    setReadMode(fn: () => ViewerMeasurementToolMode) {
      runtime.state.readToolMode = fn;
    },
    snapshot() {
      return {
        mode,
        committed,
        hover,
        cursors: [...cursors],
        nonFatal: [...nonFatal],
        pickingIssues: [...pickingIssues],
        touches,
        exits,
        chromeClears,
        hints,
      };
    },
  };
}

test('viewer measurement flow operates on injected feature capabilities without AppContainer', () => {
  const harness = createCapabilityRuntime();
  harness.setCommitted({ objects: [{} as never], targetKey: 'part:a' });
  harness.setHover({ objects: [{} as never], targetKey: 'part:b' });

  assert.equal(getViewerMeasurementToolModeWithRuntime(harness.runtime), 'part');
  setViewerMeasurementToolModeWithRuntime(harness.runtime, 'points', true);

  const afterMode = harness.snapshot();
  assert.equal(afterMode.mode, 'points');
  assert.equal(afterMode.committed, null);
  assert.equal(afterMode.hover, null);
  assert.equal(afterMode.touches, 1);
  assert.match(afterMode.cursors.at(-1) || '', /crosshair/);

  assert.equal(
    tryHandleViewerMeasurementClickWithRuntime({ runtime: harness.runtime, hitState: null }),
    true
  );
  const afterEmptyClick = harness.snapshot();
  assert.equal(afterEmptyClick.exits, 1);
  assert.equal(afterEmptyClick.chromeClears, 1);
  assert.equal(afterEmptyClick.touches, 2);
  assert.equal(afterEmptyClick.nonFatal.length, 0);
  assert.equal(afterEmptyClick.pickingIssues.length, 0);
});

test('viewer measurement flow reports mode-read rejection and still fails soft through injected capabilities', () => {
  const harness = createCapabilityRuntime();
  const failure = new Error('mode unavailable');
  harness.setReadMode(() => {
    throw failure;
  });

  assert.equal(
    tryHandleViewerMeasurementClickWithRuntime({ runtime: harness.runtime, hitState: null }),
    true
  );

  const snapshot = harness.snapshot();
  assert.deepEqual(snapshot.nonFatal, [{ op: 'readToolMode', error: failure }]);
  assert.equal(snapshot.exits, 1);
  assert.equal(snapshot.chromeClears, 1);
  assert.equal(snapshot.touches, 1);
});

test('viewer measurement overlay cleanup is capability-owned and does not require an application object', () => {
  const harness = createCapabilityRuntime();
  harness.setCommitted({ objects: [{} as never], targetKey: 'part:a' });
  harness.setHover({ objects: [{} as never], targetKey: 'part:b' });

  clearViewerMeasurementOverlayWithRuntime(harness.runtime, true);

  const snapshot = harness.snapshot();
  assert.equal(snapshot.committed, null);
  assert.equal(snapshot.hover, null);
  assert.equal(snapshot.touches, 1);
});
