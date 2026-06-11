import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCornerConfigurationSnapshotForStack,
  readCornerConfigurationCellForStack,
} from '../esm/native/features/modules_configuration/corner_cells_api.ts';
import { readInteriorModuleConfigRef } from '../esm/native/services/canvas_picking_hover_targets_config.ts';
import { readHoverModuleConfig } from '../esm/native/services/canvas_picking_interior_hover_config.ts';
import { readCellDimsSpecialDims } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts';

type AnyRecord = Record<string, any>;

function createApp(config: AnyRecord) {
  return {
    store: {
      getState() {
        return {
          config,
          ui: { raw: {} },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
      patch() {},
    },
  } as any;
}

test('corner reader helpers: bottom stack snapshot is canonical + detached from top corner root', () => {
  const cfg: AnyRecord = {
    cornerConfiguration: {
      specialDims: { widthCm: 111 },
      connectorSpecialDims: { widthCm: 222 },
      modulesConfiguration: [null, { layout: 'top-cell', specialDims: { widthCm: 51 } }],
      stackSplitLower: {
        specialDims: { widthCm: 333 },
        modulesConfiguration: [null, { layout: 'bottom-cell', specialDims: { widthCm: 444 } }],
      },
    },
  };

  const topRoot = readCornerConfigurationSnapshotForStack(cfg, 'top') as AnyRecord;
  const bottomRoot = readCornerConfigurationSnapshotForStack(cfg, 'bottom') as AnyRecord;

  assert.equal((topRoot.specialDims as AnyRecord).widthCm, 111);
  assert.equal((bottomRoot.specialDims as AnyRecord).widthCm, 333);
  assert.equal(
    (topRoot.modulesConfiguration as AnyRecord[])[0] &&
      typeof (topRoot.modulesConfiguration as AnyRecord[])[0],
    'object'
  );
  assert.equal((bottomRoot.modulesConfiguration as AnyRecord[])[1].layout, 'bottom-cell');

  (bottomRoot.specialDims as AnyRecord).widthCm = 999;
  (bottomRoot.modulesConfiguration as AnyRecord[])[1].layout = 'mutated-bottom';
  assert.equal((cfg.cornerConfiguration.stackSplitLower.specialDims as AnyRecord).widthCm, 333);
  assert.equal(
    (cfg.cornerConfiguration.stackSplitLower.modulesConfiguration as AnyRecord[])[1].layout,
    'bottom-cell'
  );

  const bottomCell = readCornerConfigurationCellForStack(cfg, 'bottom', 1) as AnyRecord;
  assert.equal(bottomCell.layout, 'bottom-cell');
  bottomCell.layout = 'mutated';
  assert.equal(
    (cfg.cornerConfiguration.stackSplitLower.modulesConfiguration as AnyRecord[])[1].layout,
    'bottom-cell'
  );
});

test('canvas picking readers: generic bottom-corner root + cell reads use lower corner snapshot instead of top root', () => {
  const App = createApp({
    cornerConfiguration: {
      specialDims: { widthCm: 111, heightCm: 211 },
      connectorSpecialDims: { widthCm: 222 },
      modulesConfiguration: [{ layout: 'top-root-cell', specialDims: { widthCm: 51 } }],
      stackSplitLower: {
        layout: 'drawers',
        specialDims: { widthCm: 333, heightCm: 433 },
        modulesConfiguration: [{ layout: 'bottom-root-cell', specialDims: { widthCm: 444, heightCm: 544 } }],
      },
    },
  });

  const bottomCornerRoot = readInteriorModuleConfigRef(App, 'corner', true) as AnyRecord;
  assert.equal(bottomCornerRoot.layout, 'drawers');
  assert.equal((bottomCornerRoot.specialDims as AnyRecord).widthCm, 333);
  assert.equal((bottomCornerRoot.modulesConfiguration as AnyRecord[])[0].layout, 'bottom-root-cell');

  const topCornerRoot = readInteriorModuleConfigRef(App, 'corner', false) as AnyRecord;
  assert.equal((topCornerRoot.specialDims as AnyRecord).widthCm, 111);
  assert.equal((topCornerRoot.modulesConfiguration as AnyRecord[])[0].layout, 'top-root-cell');

  const hoverBottomCell = readHoverModuleConfig(App, 'corner:0', true) as AnyRecord;
  assert.equal(hoverBottomCell.layout, 'bottom-root-cell');
  const hoverTopCell = readHoverModuleConfig(App, 'corner:0', false) as AnyRecord;
  assert.equal(hoverTopCell.layout, 'top-root-cell');

  const bottomCornerDims = readCellDimsSpecialDims(App, { hitModuleKey: 'corner', isBottom: true } as any);
  assert.equal((bottomCornerDims.widthSd as AnyRecord).widthCm, 333);
  assert.equal((bottomCornerDims.heightDepthSd as AnyRecord).heightCm, 433);

  const topCornerDims = readCellDimsSpecialDims(App, { hitModuleKey: 'corner', isBottom: false } as any);
  assert.equal((topCornerDims.widthSd as AnyRecord).widthCm, 222);
  assert.equal((topCornerDims.heightDepthSd as AnyRecord).heightCm, 211);

  const bottomCellDims = readCellDimsSpecialDims(App, { hitModuleKey: 'corner:0', isBottom: true } as any);
  assert.equal((bottomCellDims.widthSd as AnyRecord).widthCm, 333);
  assert.equal((bottomCellDims.heightDepthSd as AnyRecord).heightCm, 433);
});
