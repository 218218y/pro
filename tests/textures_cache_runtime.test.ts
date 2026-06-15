import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const RETIRED_SURFACE_PATTERNS = [
  /installTexturesCacheService/,
  /getCustomUploadedTextureMaybe/,
  /setCustomUploadedTextureViaService/,
  /hasCustomUploadedTexture/,
  /customUploadedTexture/,
  /texturesCache/,
];

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

test('uploaded front textures stay data-url only without a live texture-cache service', () => {
  assert.equal(existsSync('esm/native/runtime/textures_cache_access.ts'), false);
  assert.equal(existsSync('esm/native/services/textures_cache.ts'), false);

  for (const file of [
    'esm/boot/boot_manifest_steps.ts',
    'esm/native/engine/install.ts',
    'esm/native/services/install.ts',
    'esm/native/services/api.ts',
    'esm/native/services/api_services_surface.ts',
    'esm/native/services/api_services_project_surface.ts',
    'types/build_runtime.ts',
  ]) {
    const source = read(file);
    for (const pattern of RETIRED_SURFACE_PATTERNS) {
      assert.doesNotMatch(source, pattern, `${file} should not expose the retired texture-cache surface`);
    }
  }
});
