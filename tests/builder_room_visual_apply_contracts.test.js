import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

test('room owner delegates visual mutation sessions to dedicated room visual owners', () => {
  const room = read('esm/native/builder/room.ts');
  const lifecycle = read('esm/native/builder/room_lifecycle.ts');
  const apply = read('esm/native/builder/room_visual_apply.ts');
  const context = read('esm/native/builder/room_visual_context.ts');

  assert.match(lifecycle, /from '\.\/room_visual_apply\.js';/);
  assert.match(apply, /export function updateRoomFloorTexture\(/);
  assert.match(apply, /export function updateRoomWallColor\(/);
  assert.match(apply, /export function resetRoomVisualDefaults\(/);
  assert.match(apply, /export function applyResolvedActiveRoomDesign\(/);
  assert.match(context, /export function createRoomVisualMutationContext\(/);
  assert.match(context, /export function shouldTriggerRoomRender\(/);
  assert.match(context, /export function canApplyActiveRoomDesign\(/);

  assert.doesNotMatch(room + lifecycle, /syncRoomNodeVisibility\(/);
  assert.doesNotMatch(room + lifecycle, /markAppliedRoomWallColor\(/);
  assert.doesNotMatch(room + lifecycle, /markAppliedRoomFloorSignature\(/);
  assert.doesNotMatch(room + lifecycle, /resetRoomFloorMaterialToDefault\(/);
});
