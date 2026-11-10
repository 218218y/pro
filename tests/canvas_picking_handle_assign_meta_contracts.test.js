import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const handleAssignMeta = read('esm/native/services/canvas_picking_handle_assign_meta.ts');
const handleAssignFlow = read('esm/native/services/canvas_picking_handle_assign_flow.ts');

test('canvas picking handle-assignment writes use one immediate structural meta owner', () => {
  assert.match(
    handleAssignMeta,
    /export function createCanvasPickingHandleAssignStructuralMeta\(source: string\): ActionMetaLike/
  );
  assert.match(handleAssignMeta, /Canvas picking handle-assignment structural meta requires a source/);
  assert.match(handleAssignMeta, /immediate: true/);
  assert.doesNotMatch(handleAssignMeta, /noBuild:/);
  assert.doesNotMatch(handleAssignMeta, /noHistory:/);

  assert.match(
    handleAssignFlow,
    /import \{ createCanvasPickingHandleAssignStructuralMeta \} from '\.\/canvas_picking_handle_assign_meta\.js';/
  );
  assert.doesNotMatch(handleAssignFlow, /\{\s*source:\s*'handles:[^}]*immediate:\s*true\s*\}/);
  assert.doesNotMatch(handleAssignFlow, /\{\s*immediate:\s*true\s*,\s*source:\s*'handles:/);
  assert.match(
    handleAssignFlow,
    /setCfgHandlesMap\(App, map, createCanvasPickingHandleAssignStructuralMeta\('handles:assign'\)\)/
  );
  assert.doesNotMatch(handleAssignFlow, /\bwriteHandle\(/);
});
