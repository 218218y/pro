import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteriorWorkflowControllerHarness } from './interior_tab_runtime_helpers.js';

test('[interior-workflows-controller] sketch/manual/layout flows route through one owner', () => {
  const { calls, colorCalls, controller } = createInteriorWorkflowControllerHarness();

  controller.enterLayout('shelves');
  controller.enterLayout('brace_shelves');
  controller.enterSketchShelfTool('glass');
  controller.enterSketchBoxTool(500, 500, '');
  controller.enterSketchBoxCorniceTool('flat');
  controller.enterSketchBoxBaseTool('legs');
  controller.enterSketchExtDrawersTool(3);
  controller.enterSketchIntDrawersTool(24);
  controller.enterManual('rod');
  controller.setGridDivisions(4);
  controller.setGridShelfVariant('glass');
  controller.enterExtDrawer('shoe', 2);
  controller.exitExtDrawer();
  controller.toggleDividerMode();
  controller.toggleIntDrawerMode();
  controller.setHandleControlEnabled(true);
  controller.setGlobalEdgeHandleVariant('long');
  controller.setHandleModeEdgeVariant('short');
  controller.setGlobalHandle('edge');
  controller.toggleHandleMode('none');

  assert.ok(calls.some(entry => entry[0] === 'enterLayoutMode' && entry[2] === 'shelves'));
  assert.ok(calls.some(entry => entry[0] === 'toggleBraceShelvesMode'));
  assert.ok(
    calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_shelf:glass@27')
  );
  assert.ok(calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_box:300@300'));
  assert.ok(
    calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_box_cornice:classic')
  );
  assert.ok(calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_box_base:legs'));
  assert.ok(calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_ext_drawers:3'));
  assert.ok(
    calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'sketch_int_drawers@24')
  );
  assert.ok(calls.some(entry => entry[0] === 'enterManualLayoutMode' && entry[2] === 'rod'));
  assert.ok(calls.some(entry => entry[0] === 'setGridDivisions' && entry[2] === 4));
  assert.ok(calls.some(entry => entry[0] === 'setGridShelfVariant' && entry[2] === 'glass'));
  assert.ok(calls.some(entry => entry[0] === 'enterExtDrawerMode' && entry[2] === 'shoe' && entry[3] === 2));
  assert.ok(calls.some(entry => entry[0] === 'exitPrimaryMode' && entry[2] === 'ext_drawer'));
  assert.ok(calls.some(entry => entry[0] === 'toggleDividerMode'));
  assert.ok(calls.some(entry => entry[0] === 'toggleIntDrawerMode'));
  assert.ok(calls.some(entry => entry[0] === 'setHandleControlEnabled' && entry[2] === true));
  assert.ok(calls.some(entry => entry[0] === 'setGlobalEdgeHandleVariant' && entry[2] === 'long'));
  assert.ok(calls.some(entry => entry[0] === 'setHandleModeEdgeVariant' && entry[2] === 'short'));
  assert.ok(calls.some(entry => entry[0] === 'setGlobalHandleType' && entry[2] === 'edge'));
  assert.ok(calls.some(entry => entry[0] === 'toggleHandleMode' && entry[2] === 'none'));
  assert.deepEqual(colorCalls, []);
});

test('[interior-workflows-controller] exit flow respects active primary mode ordering', () => {
  const makeHarness = overrides =>
    createInteriorWorkflowControllerHarness({
      doorTrimHorizontalCustomCm: '',
      doorTrimHorizontalCrossCm: '',
      doorTrimVerticalCustomCm: '',
      doorTrimVerticalCrossCm: '',
      ...overrides,
    });

  const calls = [];
  for (const overrides of [
    { isManualLayoutMode: true },
    { isLayoutMode: true },
    { isBraceShelvesMode: true },
    { isDoorTrimMode: true },
  ]) {
    const harness = makeHarness(overrides);
    harness.controller.exitLayoutOrManual();
    calls.push(...harness.calls);
  }
  const exitHarness = makeHarness({});
  exitHarness.controller.exitManual();
  calls.push(...exitHarness.calls);

  const exitCalls = calls.filter(entry => entry[0] === 'exitPrimaryMode');
  assert.equal(exitCalls.length, 5);
  assert.equal(
    JSON.stringify(exitCalls.map(entry => entry[2])),
    JSON.stringify(['manual_layout', 'layout', 'brace_shelves', 'door_trim', 'manual_layout'])
  );
  assert.equal(
    JSON.stringify(exitCalls.slice(0, 4).map(entry => entry[3])),
    JSON.stringify([{ closeDoors: true }, { closeDoors: true }, { closeDoors: true }, { closeDoors: true }])
  );
});
