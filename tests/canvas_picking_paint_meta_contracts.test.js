import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import { getCallFacts, getFunctionSignatureFact } from './_semantic_source_contracts.js';

const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => normalizeWhitespace(readRaw(rel));

const paintMeta = read('esm/native/services/canvas_picking_paint_meta.ts');
const paintMetaRaw = readRaw('esm/native/services/canvas_picking_paint_meta.ts');
const paintShared = read('esm/native/services/canvas_picking_paint_flow_shared.ts');
const paintApplyCommit = read('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintApplyCommitRaw = readRaw('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintApplyDoorStyle = read('esm/native/services/canvas_picking_paint_flow_apply_door_style.ts');
const paintApplyDoorStyleRaw = readRaw('esm/native/services/canvas_picking_paint_flow_apply_door_style.ts');

test('canvas picking paint writes use dedicated structural and material-refresh meta owners', () => {
  assert.deepEqual(
    getFunctionSignatureFact(
      paintMetaRaw,
      'createCanvasPickingPaintStructuralMeta',
      'esm/native/services/canvas_picking_paint_meta.ts'
    ),
    {
      name: 'createCanvasPickingPaintStructuralMeta',
      async: false,
      params: [{ name: 'source', optional: false, type: 'string' }],
      returnType: 'CanvasPickingPaintMeta',
    }
  );
  assert.deepEqual(
    getFunctionSignatureFact(
      paintMetaRaw,
      'createCanvasPickingPaintMaterialRefreshMeta',
      'esm/native/services/canvas_picking_paint_meta.ts'
    ),
    {
      name: 'createCanvasPickingPaintMaterialRefreshMeta',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'source', optional: false, type: 'string' },
        { name: 'baseMeta', optional: true, type: 'CanvasPickingPaintMeta' },
      ],
      returnType: 'ActionMetaLike',
    }
  );
  assert.match(paintMeta, /Canvas picking paint meta requires a source/);
  assert.match(paintMeta, /immediate: true/);
  assert.deepEqual(getCallFacts(paintMetaRaw, '__wp_metaNoBuild'), [
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
            callee: 'createCanvasPickingPaintStructuralMeta',
            args: [{ kind: 'identifier', name: 'normalized' }],
          },
        },
      ],
    },
  ]);

  assert.doesNotMatch(paintShared, /export function createImmediateMeta/);
  assert.doesNotMatch(paintShared, /export type PaintMetaLike/);

  assert.match(
    paintApplyCommit,
    /import \{[\s\S]*createCanvasPickingPaintMaterialRefreshMeta,[\s\S]*createCanvasPickingPaintStructuralMeta,[\s\S]*\} from '\.\/canvas_picking_paint_meta\.js';/
  );
  assert.deepEqual(getCallFacts(paintApplyCommitRaw, 'createCanvasPickingPaintStructuralMeta'), [
    { callee: 'createCanvasPickingPaintStructuralMeta', args: [{ kind: 'identifier', name: 'paintSource' }] },
  ]);
  assert.deepEqual(getCallFacts(paintApplyCommitRaw, 'createCanvasPickingPaintMaterialRefreshMeta'), [
    {
      callee: 'createCanvasPickingPaintMaterialRefreshMeta',
      args: [
        { kind: 'identifier', name: 'App' },
        { kind: 'identifier', name: 'paintSource' },
        { kind: 'identifier', name: 'baseMeta' },
      ],
    },
  ]);
  assert.doesNotMatch(paintApplyCommit, /__wp_metaNoBuild/);
  assert.doesNotMatch(paintApplyCommit, /createImmediateMeta/);

  assert.match(
    paintApplyDoorStyle,
    /import \{ createCanvasPickingPaintStructuralMeta \} from '\.\/canvas_picking_paint_meta\.js';/
  );
  assert.match(paintApplyDoorStyle, /type ResolvedCanvasPaintCommand/);
  assert.match(paintApplyDoorStyle, /command: ResolvedCanvasPaintCommand;/);
  assert.deepEqual(getCallFacts(paintApplyDoorStyleRaw, 'createCanvasPickingPaintStructuralMeta'), [
    {
      callee: 'createCanvasPickingPaintStructuralMeta',
      args: [{ kind: 'member', path: 'args.command.sourceTag' }],
    },
  ]);
  assert.doesNotMatch(paintApplyDoorStyle, /args\.paintSource/);
  assert.doesNotMatch(paintApplyDoorStyle, /createImmediateMeta/);
});
