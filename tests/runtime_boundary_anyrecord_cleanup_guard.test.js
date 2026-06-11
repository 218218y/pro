import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const throttled = fs.readFileSync(
  new URL('../esm/native/runtime/throttled_errors.ts', import.meta.url),
  'utf8'
);
const bootFinalizers = fs.readFileSync(
  new URL('../esm/native/services/boot_finalizers.ts', import.meta.url),
  'utf8'
);
const cameraAccess = fs.readFileSync(
  new URL('../esm/native/services/camera_access.ts', import.meta.url),
  'utf8'
);
const cameraPresets = fs.readFileSync(
  new URL('../esm/native/services/camera_presets.ts', import.meta.url),
  'utf8'
);

test('runtime/service seams keep pushing AnyRecord out toward explicit surfaces', () => {
  assert.match(throttled, /import type \{ UnknownRecord \} from '\.\.\/\.\.\/\.\.\/types\/index\.js';/);
  assert.doesNotMatch(throttled, /type AnyRecord = Record<string, unknown>;/);

  assert.match(bootFinalizers, /installBootFinalizers\(App: AppContainer\): CommandsServiceLike \| null/);
  assert.doesNotMatch(bootFinalizers, /installBootFinalizers\(App: AppContainer\): AnyRecord \| null/);

  assert.match(
    cameraAccess,
    /import type \{ AppContainer, CameraMoveFn, CameraServiceLike \} from '\.\.\/\.\.\/\.\.\/types';/
  );
  assert.match(cameraAccess, /function asCameraService\(value: unknown\): CameraServiceLike \| null/);
  assert.doesNotMatch(cameraAccess, /AnyRecord/);
  assert.doesNotMatch(cameraAccess, /UnknownRecord/);

  assert.match(
    cameraPresets,
    /type UiSnapshotLike = UnknownRecord & \{ raw\?: UnknownRecord \| null; width\?: unknown \};/
  );
  assert.doesNotMatch(cameraPresets, /AnyRecord/);
});
