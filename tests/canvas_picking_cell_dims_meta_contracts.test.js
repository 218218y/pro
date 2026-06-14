import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const cellDimsMeta = readSource('../esm/native/services/canvas_picking_cell_dims_meta.ts', import.meta.url);
const cellDimsLinearShared = read('esm/native/services/canvas_picking_cell_dims_linear_shared.ts');
const cellDimsLinearApply = read('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const cellDimsCornerEffects = read('esm/native/services/canvas_picking_cell_dims_corner_effects.ts');
const cellDimsCornerShared = read('esm/native/services/canvas_picking_cell_dims_corner_shared.ts');
const audit = read('docs/layering_completion_audit.md');

test('[canvas-picking/cell-dims-meta] linear and corner dimension writes use the focused meta owner', () => {
  assertMatchesAll(
    assert,
    cellDimsMeta,
    [
      /export type CanvasPickingCellDimsMeta = ActionMetaLike & \{ immediate\?: boolean \};/,
      /export function createCanvasPickingCellDimsStructuralMeta\(source: string\): CanvasPickingCellDimsMeta/,
      /export function createCanvasPickingCellDimsRefreshGatedMeta\([\s\S]*App: AppContainer,[\s\S]*source: string,[\s\S]*baseMeta\?: CanvasPickingCellDimsMeta[\s\S]*\): ActionMetaLike/,
      /Canvas picking cell-dims meta requires a source/,
      /__wp_metaNoBuild\(App, normalized, baseMeta \|\| createCanvasPickingCellDimsStructuralMeta\(normalized\)\)/,
    ],
    'cell-dims meta owner'
  );

  assertMatchesAll(
    assert,
    cellDimsLinearApply,
    [
      /import \{ createCanvasPickingCellDimsRefreshGatedMeta \} from '\.\/canvas_picking_cell_dims_meta\.js';/,
      /const metaCfg = createCanvasPickingCellDimsRefreshGatedMeta\(App, source\);/,
      /patchUiSoft\(App, \{ raw: rawPatch \}, createCanvasPickingCellDimsRefreshGatedMeta\(App, source\)\)/,
      /requestCanvasPickingCommitStructuralRefresh\(App, source\)/,
    ],
    'linear cell-dims apply'
  );
  assertLacksAll(
    assert,
    cellDimsLinearShared + '\n' + cellDimsLinearApply,
    [/__wp_metaNoBuild\(/, /createHistoryableNoBuildMeta/],
    'linear cell-dims meta leakage'
  );

  assertMatchesAll(
    assert,
    cellDimsCornerEffects,
    [
      /import \{ createCanvasPickingCellDimsRefreshGatedMeta \} from '\.\/canvas_picking_cell_dims_meta\.js';/,
      /const meta = createCanvasPickingCellDimsRefreshGatedMeta\(App, source\);/,
      /const uiMeta = createCanvasPickingCellDimsRefreshGatedMeta\(App, source\);/,
      /requestCanvasPickingCommitStructuralRefresh\(App, source\)/,
    ],
    'corner cell-dims effects'
  );
  assertLacksAll(
    assert,
    cellDimsCornerEffects + '\n' + cellDimsCornerShared,
    [/__wp_metaNoBuild\(/, /createHistoryableNoBuildMeta/],
    'corner cell-dims meta leakage'
  );

  assert.ok(
    audit.includes(
      '`services/canvas_picking_cell_dims_meta.ts` owns Canvas picking cell-dims structural and refresh-gated meta so linear and corner dimension writes stay source-normalized while explicit commit refreshes avoid duplicate reactive builds'
    )
  );
});
