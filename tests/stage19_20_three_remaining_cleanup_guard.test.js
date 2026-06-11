import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const api = readServicesApiPublicSurface(import.meta.url);
const threeAccess = read('esm/native/runtime/three_access.ts');
const pickingPrimitives = read('esm/native/platform/picking_primitives.ts');
const geomPatchContracts = read('esm/native/platform/three_geometry_cache_patch_contracts.ts');
const handles = [
  read('esm/native/builder/handles.ts'),
  read('esm/native/builder/handles_apply.ts'),
  read('esm/native/builder/handles_apply_shared.ts'),
  read('esm/native/builder/handles_apply_doors.ts'),
  read('esm/native/builder/handles_apply_drawers.ts'),
].join('\n');
const cornerWing = read('esm/native/builder/corner_wing.ts');
const renderSurfaceRuntime = read('esm/native/services/render_surface_runtime.ts');

const strippedPickingPrimitives = stripNoise(pickingPrimitives);
const strippedGeomPatchContracts = stripNoise(geomPatchContracts);
const strippedHandles = stripNoise(handles);
const strippedCornerWing = stripNoise(cornerWing);
const strippedRenderSurfaceRuntime = stripNoise(renderSurfaceRuntime);

test('[stage19-20] remaining THREE consumers route through canonical dep helpers', () => {
  assert.match(threeAccess, /export function assertThreeViaDeps\(/);
  assert.match(api, /assertThreeViaDeps/);

  assert.match(pickingPrimitives, /assertThreeViaDeps\(root, 'platform\/picking_primitives\.THREE'\)/);
  assert.match(
    geomPatchContracts,
    /assertThreeViaDeps\(app, 'platform\/three_geometry_cache_patch\.THREE'\)/
  );
  assert.match(handles, /getThreeMaybe\(App\)/);
  assert.match(renderSurfaceRuntime, /assertThreeViaDeps\(App, 'services\/render_surface_runtime\.THREE'\)/);
});

test('[stage19-20] targeted files stop direct App.deps.THREE probing', () => {
  for (const src of [
    strippedPickingPrimitives,
    strippedGeomPatchContracts,
    strippedHandles,
    strippedCornerWing,
    strippedRenderSurfaceRuntime,
  ]) {
    assert.doesNotMatch(src, /App\.deps\.THREE/);
    assert.doesNotMatch(src, /app\.deps\.THREE/);
    assert.doesNotMatch(src, /deps\.THREE/);
  }
});
