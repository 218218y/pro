import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const owner = read('esm/native/features/door_authoring/internal/removal.ts');
const consumers = [
  read('esm/native/builder/build_wardrobe_flow_context.ts'),
  read('esm/native/builder/corner_state_normalize_layout.ts'),
  read('esm/native/builder/post_build_removed_parts.ts'),
  read('esm/native/builder/corner_wing_cell_doors_rendering.ts'),
  read('esm/native/builder/corner_connector_door_emit_visuals.ts'),
].join('\n');

test('[door-removal-visibility] one feature owner resolves canonical UI and mode snapshots', () => {
  assert.match(owner, /export function isRemoveDoorModeFromSnapshot\(/);
  assert.match(owner, /export function resolveRemoveDoorsEnabledFromSnapshots\(/);
  assert.match(consumers, /isRemoveDoorModeFromSnapshot/);
  assert.match(consumers, /resolveRemoveDoorsEnabledFromSnapshots/);
  assert.doesNotMatch(consumers, /\bREMOVE_DOOR\b|['"]remove_door['"]/);
  assert.doesNotMatch(consumers, /uiAny\.removeDoors\b/);
});
