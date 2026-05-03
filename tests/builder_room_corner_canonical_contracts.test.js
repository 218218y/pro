import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

test('room owner resolves active room design state through canonical shared selection helpers', () => {
  const room = read('esm/native/builder/room.ts');
  const activeState = read('esm/native/builder/room_active_state.ts');
  const lifecycle = read('esm/native/builder/room_lifecycle.ts');
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

  assert.match(activeState, /__readRoomUiSelectionState/);
  assert.match(activeState, /const uiSelection = __readRoomUiSelectionState\(__readUi\(A\), \{/);
  assert.match(
    activeState,
    /const style = __wp_room_resolveStyle\(uiSelection\.floorType, uiSelection\.floorStyleId\);/
  );
  assert.match(activeState, /wallColor: uiSelection\.wallColor \|\| DEFAULT_WALL_COLOR/);
  assert.doesNotMatch(activeState, /typeof ui\.lastSelectedWallColor === 'string'/);
  assert.match(lifecycle, /resolveActiveRoomDesignState\(A\)/);
  assert.doesNotMatch(room + activeState + lifecycle, /export default\s+/);
});

test('corner special interior owner derives folded-clothes placement from canonical content plans', () => {
  const facade = read('esm/native/builder/corner_connector_interior_special.ts');
  const types = read('esm/native/builder/corner_connector_interior_special_types.ts');
  const metrics = read('esm/native/builder/corner_connector_interior_special_metrics.ts');
  const contents = read('esm/native/builder/corner_connector_interior_special_contents.ts');
  const apply = read('esm/native/builder/corner_connector_interior_special_apply.ts');

  assert.match(facade, /corner_connector_interior_special_apply\.js/);
  assert.match(facade, /createLeftShelvesContentsPlanImpl\(args\)/);
  assert.match(facade, /createPentagonTopContentsPlanImpl\(args\)/);
  assert.doesNotMatch(facade, /function emitFoldedClothesPlan\(/);

  assert.match(types, /export type FoldedClothesSurfacePlan = \{/);
  assert.match(metrics, /function readCentimetersAsMeters\(/);
  assert.match(metrics, /const postDepth = readCentimetersAsMeters\(postDepthCmRaw, 0\.55\);/);
  assert.match(metrics, /const postH = readCentimetersAsMeters\(postHeightCmRaw, 1\.8\);/);
  assert.match(metrics, /const cellH = readCentimetersAsMeters\(topCellHCmRaw, 0\.3\);/);

  assert.match(contents, /function emitFoldedClothesPlan\(/);
  assert.match(contents, /export function createLeftShelvesContentsPlan\(/);
  assert.match(contents, /export function createPentagonTopContentsPlan\(/);
  assert.match(contents, /export function emitFoldedClothesPlans\(/);
  assert.match(contents, /op: 'special:leftSurface:floor'/);
  assert.match(contents, /op: 'special:topContents:lower'/);

  assert.match(apply, /const plans = createLeftShelvesContentsPlan\(\{/);
  assert.match(apply, /const plans = createPentagonTopContentsPlan\(\{/);
  assert.match(
    apply,
    /emitFoldedClothesPlans\(plans, cornerGroup, emitFoldedClothes, reportErrorThrottled, App\);/
  );
});

test('room owner keeps low-level scene primitives and floor texture work delegated to dedicated owners', () => {
  const room = read('esm/native/builder/room.ts');
  const lifecycle = read('esm/native/builder/room_lifecycle.ts');
  const floorTexture = read('esm/native/builder/room_floor_texture.ts');
  const scenePrimitives = read('esm/native/builder/room_scene_primitives.ts');

  assert.match(room, /from '\.\/room_floor_texture\.js';/);
  assert.match(lifecycle, /from '\.\/room_scene_primitives\.js';/);
  assert.match(room, /createProceduralFloorTexture/);
  assert.match(lifecycle, /createRoomScenePrimitives\(T\)/);
  assert.doesNotMatch(room + lifecycle, /CanvasTextureCtor/);
  assert.doesNotMatch(room + lifecycle, /PlaneGeometryCtor/);
  assert.doesNotMatch(room + lifecycle, /MeshStandardMaterialCtor/);
  assert.doesNotMatch(room + lifecycle, /MeshBasicMaterialCtor/);

  assert.match(floorTexture, /export function createProceduralFloorTexture\(/);
  assert.match(floorTexture, /createCanvasViaPlatform\(A, 512, 512\)/);
  assert.match(scenePrimitives, /export function createRoomScenePrimitives\(/);
});
