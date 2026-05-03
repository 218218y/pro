import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 65 render carcass cornice ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_carcass_ops_cornice.ts');
  const apply = read('esm/native/builder/render_carcass_ops_cornice_apply.ts');
  const segments = read('esm/native/builder/render_carcass_ops_cornice_segments.ts');
  const miter = read('esm/native/builder/render_carcass_ops_cornice_miter.ts');
  const finalize = read('esm/native/builder/render_carcass_ops_cornice_finalize.ts');
  const legacy = read('esm/native/builder/render_carcass_ops_cornice_legacy.ts');
  const types = read('esm/native/builder/render_carcass_ops_cornice_types.ts');
  const carcassOwner = read('esm/native/builder/render_carcass_ops.ts');

  assert.ok(lineCount(facade) <= 4, 'cornice public module must stay a tiny facade');
  assert.match(facade, /render_carcass_ops_cornice_apply\.js/);
  assert.doesNotMatch(
    facade,
    /function applyCarcassCorniceOps|function applyCorniceSegment|new THREE|__stripMiterCaps|CylinderGeometry/,
    'cornice facade must not own render orchestration, geometry, miter trimming, or legacy cylinder creation'
  );

  assert.match(apply, /export function createApplyCarcassCorniceOps\(/);
  assert.match(apply, /function applyCarcassCorniceOps\(/);
  assert.match(apply, /export function applyCorniceSegment\(/);
  assert.match(apply, /createWaveFrontSegment\(/);
  assert.match(apply, /createWaveSideSegment\(/);
  assert.match(apply, /createProfileSegment\(/);
  assert.match(apply, /applyLegacyCornice\(/);
  assert.match(apply, /const segMat = corniceMat \|\| ctx\.bodyMat;/);
  assert.doesNotMatch(apply, /new THREE\.(Shape|ExtrudeGeometry|CylinderGeometry|Group)\(/);
  assert.doesNotMatch(apply, /__stripMiterCaps|computeVertexNormals\(/);

  assert.match(segments, /export function createWaveFrontSegment\(/);
  assert.match(segments, /export function createWaveSideSegment\(/);
  assert.match(segments, /export function createProfileSegment\(/);
  assert.match(segments, /new ShapeCtor\(/);
  assert.match(segments, /new ExtrudeGeometryCtor\(/);
  assert.match(segments, /applyMiterTrims\(/);
  assert.doesNotMatch(segments, /reg\(App|wardrobeGroup\.add|CylinderGeometry|__readArray\(/);

  assert.match(miter, /export function applyMiterTrims\(/);
  assert.match(miter, /__stripMiterCaps\(/);
  assert.match(miter, /export function computeCorniceVertexNormals\(/);
  assert.doesNotMatch(miter, /new THREE|wardrobeGroup\.add|CylinderGeometry/);

  assert.match(finalize, /export function finalizeCorniceMesh\(/);
  assert.match(finalize, /reg\(App, args\.segPid, mesh, 'cornice'\)/);
  assert.match(finalize, /wardrobeGroup\.add\(mesh\)/);
  assert.doesNotMatch(finalize, /new THREE|__stripMiterCaps|CylinderGeometry/);

  assert.match(legacy, /export function applyLegacyCornice\(/);
  assert.match(legacy, /new THREE\.CylinderGeometry\(/);
  assert.match(legacy, /new THREE\.Group\(/);
  assert.doesNotMatch(legacy, /createWaveFrontSegment|applyMiterTrims|__readArray\(/);

  for (const exportedType of [
    'CorniceThreeRuntime',
    'CorniceSegmentMeshArgs',
    'CorniceMeshPlacementArgs',
    'CorniceMeshLike',
  ]) {
    assert.match(types, new RegExp(`export (type|interface) ${exportedType}`));
  }
  assert.doesNotMatch(types, /function |new THREE|wardrobeGroup\.add|__stripMiterCaps/);

  assert.match(carcassOwner, /from '\.\/render_carcass_ops_cornice\.js';/);
  assert.doesNotMatch(
    carcassOwner,
    /render_carcass_ops_cornice_(apply|segments|miter|finalize|legacy|types)\.js/,
    'carcass owner must keep using the public cornice facade instead of private cornice owners'
  );

  assert.doesNotMatch(facade + apply + segments + miter + finalize + legacy + types, /export default\s+/);
});
