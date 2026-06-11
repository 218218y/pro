import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const doorsAccess = [
  fs.readFileSync(new URL('../esm/native/runtime/doors_access.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/doors_access_services.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/doors_access_drawers.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/doors_access_doors.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/doors_access_shared.ts', import.meta.url), 'utf8'),
].join('\n');
const mapsAccess = [
  fs.readFileSync(new URL('../esm/native/runtime/maps_access.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/maps_access_runtime.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/maps_access_writers.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/maps_access_saved_collections.ts', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../esm/native/runtime/maps_access_shared.ts', import.meta.url), 'utf8'),
].join('\n');
const runtimeTypes = fs.readFileSync(new URL('../types/runtime.ts', import.meta.url), 'utf8');

test('maps/doors runtime seams use typed option/meta contracts instead of raw unknown bags', () => {
  assert.match(runtimeTypes, /export interface DoorsSyncVisualsOptionsLike extends UnknownRecord/);
  assert.match(runtimeTypes, /export interface DoorsReleaseEditHoldOptionsLike extends UnknownRecord/);
  assert.match(runtimeTypes, /export interface DoorsCaptureLocalOpenOptionsLike extends UnknownRecord/);

  assert.match(doorsAccess, /ActionMetaLike/);
  assert.match(doorsAccess, /DoorsSyncVisualsOptionsLike/);
  assert.match(doorsAccess, /DoorsReleaseEditHoldOptionsLike/);
  assert.match(doorsAccess, /DoorsCaptureLocalOpenOptionsLike/);
  assert.doesNotMatch(doorsAccess, /setOpen\?: \(open: boolean, meta\?: unknown\)/);
  assert.doesNotMatch(doorsAccess, /releaseEditHold\?: \(opts\?: unknown\)/);
  assert.doesNotMatch(doorsAccess, /syncVisualsNow\?: \(opts\?: unknown\)/);

  assert.match(mapsAccess, /MapsNamespaceLike/);
  assert.match(mapsAccess, /ActionMetaLike/);
  assert.match(mapsAccess, /export function writeMapKey<K extends string>/);
  assert.match(
    mapsAccess,
    /val: K extends KnownMapName \? KnownMapValue<Extract<K, KnownMapName>> : unknown,/
  );
  assert.doesNotMatch(
    mapsAccess,
    /setKey\?: \(mapName: string, key: string, val: unknown, meta\?: unknown\)/
  );
  assert.doesNotMatch(mapsAccess, /setSavedColors\?: \(arr: unknown, meta\?: unknown\)/);
});
