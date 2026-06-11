import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources } from './_source_bundle.js';

const bootController = bundleSources(
  ['../esm/native/ui/ui_boot_controller_runtime.ts', '../esm/native/ui/ui_boot_controller_viewport.ts'],
  import.meta.url,
  { stripNoise: true }
);

test('boot main primes the canonical default camera preset (not a closer boot-only camera)', () => {
  assert.match(bootController, /primeViewportBootCameraOrThrow\(App\)/);
  assert.doesNotMatch(bootController, /camera\.position\.set\(0, 1\.6, 2\.6\)/);
  assert.doesNotMatch(bootController, /controls\.target\.set\(0, 1\.2, 0\)/);
});
