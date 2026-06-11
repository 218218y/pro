import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const buildTypes = normalizeWhitespace(readBuildTypesBundle(import.meta.url));
const renderOps = normalizeWhitespace(
  [
    '../esm/native/builder/render_ops.ts',
    '../esm/native/builder/render_ops_shared.ts',
    '../esm/native/builder/render_ops_shared_contracts.ts',
    '../esm/native/builder/render_ops_shared_args.ts',
    '../esm/native/builder/render_ops_shared_state.ts',
  ]
    .map(rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8'))
    .join('\n\n')
);
const renderOpsBundle = normalizeWhitespace(
  [
    '../esm/native/builder/render_ops.ts',
    '../esm/native/builder/render_ops_shared.ts',
    '../esm/native/builder/render_ops_shared_contracts.ts',
    '../esm/native/builder/render_ops_shared_args.ts',
    '../esm/native/builder/render_ops_shared_state.ts',
    '../esm/native/builder/render_ops_primitives.ts',
    '../esm/native/builder/render_ops_install.ts',
  ]
    .map(rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8'))
    .join('\n\n')
);
const room = normalizeWhitespace(
  fs.readFileSync(new URL('../esm/native/builder/room.ts', import.meta.url), 'utf8')
);
const roomSharedTypes = normalizeWhitespace(
  fs.readFileSync(new URL('../esm/native/builder/room_shared_types.ts', import.meta.url), 'utf8')
);
const renderExtras = normalizeWhitespace(
  ['../esm/native/builder/render_ops_extras.ts', '../esm/native/builder/render_ops_extras_shared.ts']
    .map(rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8'))
    .join('\n\n')
);

function assertMatchesAll(src, patterns, label) {
  for (const pattern of patterns) {
    assert.match(src, pattern, `${label} should match ${pattern}`);
  }
}

test('[stageBF] builder render + room seams expose shared typed contracts instead of ad-hoc unknown bags', () => {
  assertMatchesAll(
    buildTypes,
    [
      /export interface BuilderHandleMeshOptionsLike extends BuilderRenderCommonArgsLike \{/,
      /handleColor\?: string \| null;/,
      /edgeHandleVariant\?: string \| null;/,
      /export interface BuilderCreateBoardArgsLike extends BuilderRenderCommonArgsLike \{/,
      /export interface BuilderCreateModuleHitBoxArgsLike extends BuilderRenderCommonArgsLike \{/,
      /export interface BuilderCreateDrawerShadowPlaneArgsLike extends BuilderRenderCommonArgsLike \{/,
      /export interface RoomTextureParamsLike extends UnknownRecord \{/,
      /export type BuilderCreateHandleMeshFn = \(/,
      /export type BuilderCreateBoardFn = \{/,
      /createHandleMesh\?: BuilderCreateHandleMeshFn;/,
      /createBoard\?: BuilderCreateBoardFn;/,
      /createModuleHitBox\?: \(args: BuilderCreateModuleHitBoxArgsLike\) => unknown;/,
      /createDrawerShadowPlane\?: \(args: BuilderCreateDrawerShadowPlaneArgsLike\) => unknown;/,
      /getMirrorMaterial\?: BuilderGetMirrorMaterialFn;/,
      /addDimensionLine\?: BuilderDimensionLineFn;/,
      /createProceduralFloorTexture\?: \(type: string, params: RoomTextureParamsLike\) => unknown;/,
    ],
    'types/build.ts'
  );

  assertMatchesAll(
    renderOps,
    [
      /export function createHandleMesh\(\s*type: string,\s*w: number,\s*h: number,\s*isLeftHinge: boolean,\s*optsIn: BuilderHandleMeshOptionsLike \| null \| undefined\s*\)/,
      /export function createBoard\(argsIn: BuilderCreateBoardArgsLike \| null \| undefined\)/,
      /export function createModuleHitBox\(argsIn: BuilderCreateModuleHitBoxArgsLike \| null \| undefined\)/,
      /export function createDrawerShadowPlane\(argsIn: BuilderCreateDrawerShadowPlaneArgsLike \| null \| undefined\)/,
      /type RenderThreeLike = Pick</,
    ],
    'render_ops.ts'
  );

  assertMatchesAll(
    renderOpsBundle,
    [
      /export function createBuilderRenderPrimitiveOps\(deps: RenderOpsPrimitiveDeps\)/,
      /function bindHandleMesh\(fn: NonNullable<RenderOpsLike\['createHandleMesh'\]>\)/,
      /export function createBuilderRenderOpsInstall\(deps: RenderOpsInstallDeps\)/,
    ],
    'render_ops bundle'
  );

  assert.match(
    roomSharedTypes,
    /export type RoomTextureParams = RoomTextureParamsLike;/,
    'room shared types should keep RoomTextureParams mapped to RoomTextureParamsLike while room.ts stays a facade'
  );
  assert.match(
    renderExtras,
    /type CacheTouchFn = \(meta: CacheTouchMetaLike, key: string\) => unknown;/,
    'render_ops_extras.ts should narrow cacheTouch meta'
  );
});
