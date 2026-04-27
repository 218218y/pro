import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

test('room owner resolves active room design state through canonical shared selection helpers', () => {
  const room = read('esm/native/builder/room.ts');
  const sharedBarrel = read('esm/native/builder/room_internal_shared.ts');
  const sharedTypes = read('esm/native/builder/room_shared_types.ts');
  const sharedState = read('esm/native/builder/room_shared_state.ts');

  assert.match(sharedBarrel, /export \* from '\.\/room_shared_types\.js';/);
  assert.match(sharedBarrel, /export \* from '\.\/room_shared_state\.js';/);
  assert.match(sharedTypes, /export type RoomUiSelectionState = \{/);
  assert.match(sharedState, /export function __readRoomFloorStyleId\(/);
  assert.match(sharedState, /export function __readRoomWallColor\(/);
  assert.match(sharedState, /export function __readRoomUiSelectionState\(/);
  assert.match(sharedState, /export function __buildRoomLastStyleUiPatch\(/);
  assert.match(
    sharedState,
    /patchUiSoft\(A, __buildRoomLastStyleUiPatch\(type, styleId\), __metaUiOnly\(A, 'room:setLastStyleId'\)\)/
  );
  assert.match(sharedState, /return __readRoomUiSelectionState\(__readUi\(A\)\)\.floorType;/);
  assert.match(sharedState, /return __readRoomFloorStyleId\(__readUi\(A\), type\);/);

  assert.match(room, /__readRoomUiSelectionState/);
  assert.match(room, /const uiSelection = __readRoomUiSelectionState\(__readUi\(A\), \{/);
  assert.match(
    room,
    /const style = __wp_room_resolveStyle\(uiSelection\.floorType, uiSelection\.floorStyleId\);/
  );
  assert.match(room, /wallColor: uiSelection\.wallColor \|\| DEFAULT_WALL_COLOR/);
  assert.doesNotMatch(room, /typeof ui\.lastSelectedWallColor === 'string'/);
  assert.doesNotMatch(room, /export default\s+/);
});

test('corner special interior owner derives folded-clothes placement from canonical content plans', () => {
  const special = read('esm/native/builder/corner_connector_interior_special.ts');

  assert.match(special, /type FoldedClothesSurfacePlan = \{/);
  assert.match(special, /function readCentimetersAsMeters\(/);
  assert.match(special, /function emitFoldedClothesPlan\(/);
  assert.match(special, /function createLeftShelvesContentsPlan\(/);
  assert.match(special, /function createPentagonTopContentsPlan\(/);
  assert.match(special, /const plans = createLeftShelvesContentsPlan\(\{/);
  assert.match(special, /const plans = createPentagonTopContentsPlan\(\{/);
  assert.match(special, /function emitFoldedClothesPlans\(/);
  assert.match(
    special,
    /emitFoldedClothesPlans\(plans, cornerGroup, emitFoldedClothes, reportErrorThrottled, App\);/
  );
  assert.match(special, /const postDepth = readCentimetersAsMeters\(postDepthCmRaw, 0\.55\);/);
  assert.match(special, /const postH = readCentimetersAsMeters\(postHeightCmRaw, 1\.8\);/);
  assert.match(special, /const cellH = readCentimetersAsMeters\(topCellHCmRaw, 0\.3\);/);
  assert.match(special, /op: 'special:leftSurface:floor'/);
  assert.match(special, /op: 'special:topContents:lower'/);
});

test('room owner keeps low-level scene primitives and floor texture work delegated to dedicated owners', () => {
  const room = read('esm/native/builder/room.ts');
  const floorTexture = read('esm/native/builder/room_floor_texture.ts');
  const scenePrimitives = read('esm/native/builder/room_scene_primitives.ts');

  assert.match(room, /from '\.\/room_floor_texture\.js';/);
  assert.match(room, /from '\.\/room_scene_primitives\.js';/);
  assert.match(room, /createProceduralFloorTexture,/);
  assert.match(room, /createRoomScenePrimitives\(T\)/);
  assert.doesNotMatch(room, /CanvasTextureCtor/);
  assert.doesNotMatch(room, /PlaneGeometryCtor/);
  assert.doesNotMatch(room, /MeshStandardMaterialCtor/);
  assert.doesNotMatch(room, /MeshBasicMaterialCtor/);

  assert.match(floorTexture, /export function createProceduralFloorTexture\(/);
  assert.match(floorTexture, /createCanvasViaPlatform\(A, 512, 512\)/);
  assert.match(scenePrimitives, /export function createRoomScenePrimitives\(/);
});
