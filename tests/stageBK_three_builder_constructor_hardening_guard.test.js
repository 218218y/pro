import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const threeTypes = fs.readFileSync(new URL('../types/three.ts', import.meta.url), 'utf8');
const buildTypes = readBuildTypesBundle(import.meta.url);
const renderOps = [
  '../esm/native/builder/render_ops.ts',
  '../esm/native/builder/render_ops_shared.ts',
  '../esm/native/builder/render_ops_shared_contracts.ts',
  '../esm/native/builder/render_ops_shared_args.ts',
  '../esm/native/builder/render_ops_shared_state.ts',
  '../esm/native/builder/render_ops_shared_mirror.ts',
]
  .map(rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8'))
  .join('\n');
const postBuildExtras = fs.readFileSync(
  new URL('../esm/native/builder/post_build_extras_pipeline.ts', import.meta.url),
  'utf8'
);
const postBuildShared = fs.readFileSync(
  new URL('../esm/native/builder/post_build_extras_shared.ts', import.meta.url),
  'utf8'
);
const bootEntry = fs.readFileSync(
  new URL('../esm/native/runtime/boot_entry_access.ts', import.meta.url),
  'utf8'
);

function countUnknownArgRests(src) {
  return (src.match(/\.\.\.args: unknown\[\]/g) || []).length;
}

test('[stageBK] three/builder constructor seams use shared typed contracts instead of local unknown[] ctor bags', () => {
  assert.match(threeTypes, /export type ThreeBoxGeometryCtor = new \(/);
  assert.match(threeTypes, /export type ThreeCylinderGeometryCtor = new \(/);
  assert.match(
    threeTypes,
    /export type ThreeExtrudeGeometryCtor = new \(shape\?: unknown, options\?: UnknownRecord\) => GeometryLike;/
  );
  assert.match(
    threeTypes,
    /export type ThreeWebGLRendererCtor = new \(params\?: UnknownRecord\) => WebGLRendererLike;/
  );
  assert.match(threeTypes, /Group: ThreeGroupCtor;/);
  assert.match(threeTypes, /BoxGeometry: ThreeBoxGeometryCtor;/);
  assert.match(threeTypes, /ExtrudeGeometry: ThreeExtrudeGeometryCtor;/);

  assert.match(buildTypes, /export type BuilderCreateBoardFn = \{/);
  assert.match(buildTypes, /\(args: BuilderCreateBoardArgsLike\): Object3DLike;/);
  assert.match(
    buildTypes,
    /export type BuilderGetMirrorMaterialFn = \(args\?: BuilderRenderCommonArgsLike \| null\) => unknown;/
  );
  assert.match(buildTypes, /createBoard\?: BuilderCreateBoardFn;/);
  assert.match(buildTypes, /getMirrorMaterial\?: BuilderGetMirrorMaterialFn;/);

  assert.match(renderOps, /type RenderThreeLike = Pick</);
  assert.doesNotMatch(renderOps, /type ThreeCtorLike = \{/);
  assert.match(postBuildShared, /export type CanvasDrawImageArgsLike =/);
  assert.match(bootEntry, /UnknownCallable/);
});

test('[stageBK] targeted files shrink raw unknown[] rest signatures materially', () => {
  assert.equal(
    countUnknownArgRests(threeTypes),
    0,
    'types/three.ts should not keep raw unknown[] rest constructors'
  );
  assert.equal(
    countUnknownArgRests(renderOps),
    0,
    'render_ops.ts should not keep local raw unknown[] rest constructor bags'
  );
  assert.ok(
    countUnknownArgRests(postBuildExtras) <= 1,
    'post_build_extras_pipeline.ts should only keep at most one generic unknown[] rest seam'
  );
});
