import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const dividerMeta = read('esm/native/services/canvas_picking_drawer_mode_divider_meta.ts');
const dividerFlow = read('esm/native/services/canvas_picking_drawer_mode_flow_divider.ts');

test('canvas picking drawer-divider writes use one immediate structural meta owner', () => {
  assert.match(
    dividerMeta,
    /export function createCanvasPickingDrawerDividerStructuralMeta\(source: string\): ActionMetaLike/
  );
  assert.match(dividerMeta, /Canvas picking drawer-divider structural meta requires a source/);
  assert.match(dividerMeta, /immediate: true/);
  assert.doesNotMatch(dividerMeta, /noBuild:/);
  assert.doesNotMatch(dividerMeta, /noHistory:/);

  assert.match(
    dividerFlow,
    /import \{ createCanvasPickingDrawerDividerStructuralMeta \} from '\.\/canvas_picking_drawer_mode_divider_meta\.js';/
  );
  assert.match(
    dividerFlow,
    /const dividerMeta = createCanvasPickingDrawerDividerStructuralMeta\('divider:click'\);/
  );
  assert.match(dividerFlow, /toggleDividerViaActions\(App, dividerKey, dividerMeta\)/);
  assert.match(dividerFlow, /toggleDivider\(App, dividerKey, dividerMeta\)/);
  assert.doesNotMatch(dividerFlow, /\{\s*immediate:\s*true\s*,\s*source:\s*'divider:click'\s*\}/);
  assert.doesNotMatch(dividerFlow, /\{\s*source:\s*'divider:click'\s*,\s*immediate:\s*true\s*\}/);
  assert.doesNotMatch(dividerFlow, /toggleDivider\(App,\s*dividerKey,\s*\{\s*immediate:\s*true\s*\}\)/);
});
