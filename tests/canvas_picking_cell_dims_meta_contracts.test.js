import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertMatchesAll, readSource } from './_source_bundle.js';
import { getCallFacts, getFunctionSignatureFact } from './_semantic_source_contracts.js';

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
      /Canvas picking cell-dims meta requires a source/,
    ],
    'cell-dims meta owner'
  );
  assert.deepEqual(
    getFunctionSignatureFact(
      cellDimsMeta,
      'createCanvasPickingCellDimsStructuralMeta',
      'esm/native/services/canvas_picking_cell_dims_meta.ts'
    ),
    {
      name: 'createCanvasPickingCellDimsStructuralMeta',
      async: false,
      params: [{ name: 'source', optional: false, type: 'string' }],
      returnType: 'CanvasPickingCellDimsMeta',
    }
  );
  assert.deepEqual(
    getFunctionSignatureFact(
      cellDimsMeta,
      'createCanvasPickingCellDimsRefreshGatedMeta',
      'esm/native/services/canvas_picking_cell_dims_meta.ts'
    ),
    {
      name: 'createCanvasPickingCellDimsRefreshGatedMeta',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'source', optional: false, type: 'string' },
        { name: 'baseMeta', optional: true, type: 'CanvasPickingCellDimsMeta' },
      ],
      returnType: 'ActionMetaLike',
    }
  );
  assert.deepEqual(getCallFacts(cellDimsMeta, '__wp_metaNoBuild'), [
    {
      callee: '__wp_metaNoBuild',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'normalized' },
        {
          kind: 'binary',
          operator: '||',
          left: { kind: 'identifier', name: 'baseMeta' },
          right: {
            kind: 'call',
            callee: 'createCanvasPickingCellDimsStructuralMeta',
            args: [{ kind: 'identifier', name: 'normalized' }],
          },
        },
      ],
    },
  ]);

  assertMatchesAll(
    assert,
    cellDimsLinearApply,
    [
      /import \{ createCanvasPickingCellDimsRefreshGatedMeta \} from '\.\/canvas_picking_cell_dims_meta\.js';/,
    ],
    'linear cell-dims apply'
  );
  assert.equal(getCallFacts(cellDimsLinearApply, 'createCanvasPickingCellDimsRefreshGatedMeta').length, 2);
  assert.deepEqual(getCallFacts(cellDimsLinearApply, 'requestCanvasPickingCommitStructuralRefresh'), [
    {
      callee: 'requestCanvasPickingCommitStructuralRefresh',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'source' },
      ],
    },
  ]);
  assert.equal(getCallFacts(cellDimsLinearShared + '\n' + cellDimsLinearApply, '__wp_metaNoBuild').length, 0);
  assert.equal(
    getCallFacts(cellDimsLinearShared + '\n' + cellDimsLinearApply, 'createHistoryableNoBuildMeta').length,
    0
  );

  assertMatchesAll(
    assert,
    cellDimsCornerEffects,
    [
      /import \{ createCanvasPickingCellDimsRefreshGatedMeta \} from '\.\/canvas_picking_cell_dims_meta\.js';/,
    ],
    'corner cell-dims effects'
  );
  assert.equal(getCallFacts(cellDimsCornerEffects, 'createCanvasPickingCellDimsRefreshGatedMeta').length, 2);
  assert.deepEqual(getCallFacts(cellDimsCornerEffects, 'requestCanvasPickingCommitStructuralRefresh'), [
    {
      callee: 'requestCanvasPickingCommitStructuralRefresh',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'source' },
      ],
    },
  ]);
  assert.equal(
    getCallFacts(cellDimsCornerEffects + '\n' + cellDimsCornerShared, '__wp_metaNoBuild').length,
    0
  );
  assert.equal(
    getCallFacts(cellDimsCornerEffects + '\n' + cellDimsCornerShared, 'createHistoryableNoBuildMeta').length,
    0
  );

  assert.ok(
    audit.includes(
      '`services/canvas_picking_cell_dims_meta.ts` owns Canvas picking cell-dims structural and refresh-gated meta so linear and corner dimension writes stay source-normalized while explicit commit refreshes avoid duplicate reactive builds'
    )
  );
});
