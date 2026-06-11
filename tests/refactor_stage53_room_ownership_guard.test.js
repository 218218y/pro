import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 53 room ownership split is anchored', () => {
  const facade = read('esm/native/builder/room.ts');
  const activeState = read('esm/native/builder/room_active_state.ts');
  const lifecycle = read('esm/native/builder/room_lifecycle.ts');
  const surface = read('esm/native/builder/room_design_surface.ts');
  const install = read('esm/native/builder/install.ts');
  const roomRuntimeTests = read('tests/builder_room_runtime.test.ts');
  const slotRuntimeTests = read('tests/room_design_service_slot_runtime.test.ts');

  assert.ok(
    lineCount(facade) <= 45,
    'room.ts must stay a small public facade instead of regrowing build lifecycle or installer internals'
  );
  for (const owner of ['room_lifecycle.js', 'room_design_surface.js', 'room_floor_texture.js']) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `facade must compose ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /WeakMap|installStableSurfaceMethod|createRoomScenePrimitives\(|setRuntimeScalar\(|applyResolvedActiveRoomDesign\(/,
    'room facade must not own install-surface, lifecycle, runtime scalar, or visual-apply orchestration'
  );

  assert.match(activeState, /export function resolveActiveRoomDesignState\(/);
  assert.match(activeState, /export function readRuntimeRoomDesignActive\(/);
  assert.match(activeState, /__readRoomUiSelectionState/);
  assert.match(activeState, /__readRoomDesignRuntimeFlags/);
  assert.doesNotMatch(activeState, /installStableSurfaceMethod|createRoomScenePrimitives|setRuntimeScalar/);

  assert.match(lifecycle, /export function buildRoom\(/);
  assert.match(lifecycle, /export function setRoomDesignActive\(/);
  assert.match(lifecycle, /createRoomScenePrimitives\(T\)/);
  assert.match(lifecycle, /setRuntimeScalar\(A, 'roomDesignActive'/);
  assert.match(lifecycle, /resolveActiveRoomDesignState\(A\)/);
  assert.doesNotMatch(lifecycle, /WeakMap|installStableSurfaceMethod|ROOM_DESIGN_SURFACE_BINDINGS/);

  assert.match(surface, /const ROOM_DESIGN_SURFACE_BINDINGS/);
  assert.match(surface, /stableKey: '__wpRoomSetActive'/);
  assert.match(surface, /setRoomDesignActive\(on, meta, context\.App\)/);
  assert.match(surface, /export function installRoomDesign\(/);
  assert.match(surface, /hasCallableContract<RoomDesignServiceState>/);
  assert.doesNotMatch(surface, /createRoomScenePrimitives\(|addToScene\(|removeFromSceneByName\(/);

  assert.match(install, /from '\.\/room\.js'/);
  assert.doesNotMatch(
    install,
    /room_(active_state|lifecycle|design_surface)\.js/,
    'builder installer must keep using the public room facade instead of private owners'
  );
  assert.match(roomRuntimeTests, /from '\.\.\/esm\/native\/builder\/room\.ts'/);
  assert.match(slotRuntimeTests, /from '\.\.\/esm\/native\/builder\/room\.ts'/);
  assert.doesNotMatch(
    roomRuntimeTests + slotRuntimeTests,
    /room_(active_state|lifecycle|design_surface)\.ts/,
    'room runtime tests should exercise the public facade contract, not private owners'
  );
  assert.doesNotMatch(facade + activeState + lifecycle + surface, /export default\s+/);
});
