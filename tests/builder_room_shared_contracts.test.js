import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

const roomShared = read('esm/native/builder/room_internal_shared.ts');
const roomSharedTypes = read('esm/native/builder/room_shared_types.ts');
const roomSharedUtils = read('esm/native/builder/room_shared_utils.ts');
const roomSharedState = read('esm/native/builder/room_shared_state.ts');

test('[builder-room-shared] room_internal_shared now stays a thin barrel over focused room owners', () => {
  assert.match(roomShared, /export \* from '\.\/room_shared_types\.js';/);
  assert.match(roomShared, /export \* from '\.\/room_shared_utils\.js';/);
  assert.match(roomShared, /export \* from '\.\/room_shared_state\.js';/);
  assert.doesNotMatch(roomShared, /export const FLOOR_STYLES/);
  assert.doesNotMatch(roomShared, /export function __readRoomSceneNodes/);
  assert.doesNotMatch(roomShared, /export function __roomHandleCatch/);
});

test('[builder-room-shared] focused room owners keep palettes, low-level helpers, and runtime/UI readers separated', () => {
  assert.match(
    roomSharedTypes,
    /export const FLOOR_STYLES: Record<FloorType, readonly FloorStyleEntry\[]> = \{/
  );
  assert.match(roomSharedTypes, /export const WALL_COLORS: readonly WallColorEntry\[] = \[/);
  assert.match(roomSharedUtils, /export function __roomHandleCatch\(/);
  assert.match(roomSharedUtils, /export function __ensureTHREE\(passedApp: unknown\): ThreeLike \{/);
  assert.match(roomSharedState, /export function __readRoomSceneNodes\(A: AppContainer\): RoomSceneNodes \{/);
  assert.match(
    roomSharedState,
    /export function __wp_room_resolveStyle\(type: FloorType, styleId\?: string \| null\): FloorStyleEntry \| null \{/
  );
});
