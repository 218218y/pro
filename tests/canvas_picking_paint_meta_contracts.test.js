import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const paintMeta = read('esm/native/services/canvas_picking_paint_meta.ts');
const paintShared = read('esm/native/services/canvas_picking_paint_flow_shared.ts');
const paintApplyCommit = read('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintApplyDoorStyle = read('esm/native/services/canvas_picking_paint_flow_apply_door_style.ts');

test('canvas picking paint writes use dedicated structural and material-refresh meta owners', () => {
  assert.match(
    paintMeta,
    /export function createCanvasPickingPaintStructuralMeta\(source: string\): CanvasPickingPaintMeta/
  );
  assert.match(
    paintMeta,
    /export function createCanvasPickingPaintMaterialRefreshMeta\([\s\S]*App: AppContainer,[\s\S]*source: string,[\s\S]*baseMeta\?: CanvasPickingPaintMeta[\s\S]*\): ActionMetaLike/
  );
  assert.match(paintMeta, /Canvas picking paint meta requires a source/);
  assert.match(paintMeta, /immediate: true/);
  assert.match(
    paintMeta,
    /__wp_metaNoBuild\(App, normalized, baseMeta \|\| createCanvasPickingPaintStructuralMeta\(normalized\)\)/
  );

  assert.doesNotMatch(paintShared, /export function createImmediateMeta/);
  assert.doesNotMatch(paintShared, /export type PaintMetaLike/);

  assert.match(
    paintApplyCommit,
    /import \{[\s\S]*createCanvasPickingPaintMaterialRefreshMeta,[\s\S]*createCanvasPickingPaintStructuralMeta,[\s\S]*\} from '\.\/canvas_picking_paint_meta\.js';/
  );
  assert.match(paintApplyCommit, /const baseMeta = createCanvasPickingPaintStructuralMeta\(paintSource\);/);
  assert.match(paintApplyCommit, /createCanvasPickingPaintMaterialRefreshMeta\(App, paintSource, baseMeta\)/);
  assert.doesNotMatch(paintApplyCommit, /__wp_metaNoBuild/);
  assert.doesNotMatch(paintApplyCommit, /createImmediateMeta/);

  assert.match(
    paintApplyDoorStyle,
    /import \{ createCanvasPickingPaintStructuralMeta \} from '\.\/canvas_picking_paint_meta\.js';/
  );
  assert.match(
    paintApplyDoorStyle,
    /const baseMeta = createCanvasPickingPaintStructuralMeta\(args\.paintSource\);/
  );
  assert.doesNotMatch(paintApplyDoorStyle, /createImmediateMeta/);
});
