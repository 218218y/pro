import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteriorViewStateControllerHarness } from './interior_tab_runtime_helpers.js';

test('[interior-view-state-controller] centralizes sketch and door-trim sync side-effects', () => {
  const { calls, controller } = createInteriorViewStateControllerHarness();

  controller.syncFromViewState({
    wardrobeType: 'sliding',
    isExtDrawerMode: true,
    modeExtDrawer: 'ext_drawer',
    isSketchToolActive: true,
    manualToolRaw: 'sketch_shelf:glass@27',
    isDoorTrimMode: true,
    modeOpts: {
      trimAxis: 'vertical',
      trimColor: 'gold',
      trimSpan: 'half',
      trimSizeCm: 14,
      trimCrossSizeCm: 4,
    },
    isManualLayoutMode: true,
    manualTool: 'rod',
  });

  controller.syncFromViewState({
    wardrobeType: 'hinged',
    isExtDrawerMode: false,
    modeExtDrawer: 'ext_drawer',
    isSketchToolActive: true,
    manualToolRaw: 'sketch_box:42@60@55',
    isDoorTrimMode: false,
    modeOpts: {},
    isManualLayoutMode: false,
    manualTool: 'shelf',
  });

  controller.syncSketchStorageHeightState(true, 'sketch_storage:66');
  controller.syncSketchBoxCorniceState(true, 'sketch_box_cornice:classic');
  controller.syncSketchBoxBaseState(true, 'sketch_box_base:legs');
  controller.syncSketchExtDrawersState(true, 'sketch_ext_drawers:3@28');
  controller.syncSketchIntDrawersState(true, 'sketch_int_drawers@24');

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      ['exitPrimaryMode', { id: 'app' }, 'ext_drawer'],
      ['setSketchShelvesOpen', true],
      ['setDoorTrimPanelOpen', true],
      ['setDoorTrimColor', 'gold'],
      ['setDoorTrimVerticalSpan', 'half'],
      ['setDoorTrimVerticalCustomCm', 14],
      ['setDoorTrimVerticalCustomDraft', '14'],
      ['setDoorTrimVerticalCrossCm', 4],
      ['setDoorTrimVerticalCrossDraft', '4'],
      ['setSketchShelfDepthByVariant', { regular: '', glass: 27 }],
      ['setSketchShelfDepthDraftByVariant', { regular: '', glass: '27' }],
      ['setManualUiTool', 'rod'],
      ['setSketchBoxPanelOpen', true],
      ['setSketchBoxHeightCm', 42],
      ['setSketchBoxHeightDraft', '42'],
      ['setSketchBoxWidthCm', 60],
      ['setSketchBoxWidthDraft', '60'],
      ['setSketchBoxDepthCm', 55],
      ['setSketchBoxDepthDraft', '55'],
      ['setSketchStorageHeightCm', 66],
      ['setSketchStorageHeightDraft', '66'],
      ['setSketchBoxCorniceType', 'classic'],
      ['setSketchBoxCornicePanelOpen', true],
      ['setSketchBoxBaseType', 'legs'],
      ['setSketchBoxLegStyle', 'tapered'],
      ['setSketchBoxLegColor', 'black'],
      ['setSketchBoxLegHeightCm', 12],
      ['setSketchBoxLegHeightDraft', '12'],
      ['setSketchBoxLegWidthCm', 4],
      ['setSketchBoxLegWidthDraft', '4'],
      ['setSketchBoxBasePanelOpen', true],
      ['setSketchExtDrawerCount', 3],
      ['setSketchExtDrawerHeightCm', 28],
      ['setSketchExtDrawerHeightDraft', '28'],
      ['setSketchExtDrawersPanelOpen', true],
      ['setSketchIntDrawerHeightCm', 24],
      ['setSketchIntDrawerHeightDraft', '24'],
    ])
  );
});
