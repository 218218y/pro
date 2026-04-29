#!/usr/bin/env node
import { readSourceText } from './wp_source_text.mjs';

function read(file) {
  return readSourceText(file);
}

const errors = [];

function requirePattern(file, pattern) {
  const source = read(file);
  if (!pattern.test(source)) errors.push(`${file}: missing ${pattern}`);
}

function forbidPattern(file, pattern) {
  const source = read(file);
  if (pattern.test(source)) errors.push(`${file}: forbidden ${pattern}`);
}

// String normalization is an explicit builder owner, not an ad-hoc fallback in setup.
requirePattern('esm/native/builder/build_string_normalizer.ts', /export type BuildStringNormalizer/);
requirePattern(
  'esm/native/builder/build_string_normalizer.ts',
  /export function normalizeBuildStringDefault/
);
requirePattern(
  'esm/native/builder/build_string_normalizer.ts',
  /export function createBuildStringNormalizer/
);
requirePattern(
  'esm/native/builder/build_wardrobe_flow_context_setup.ts',
  /import \{ createBuildStringNormalizer \} from '\.\/build_string_normalizer\.js';/
);
forbidPattern('esm/native/builder/build_wardrobe_flow_context_setup.ts', /function fallbackToBuildString/);

// Live orchestration after the entry/prepare seam must flow through prepared/context objects.
requirePattern(
  'esm/native/builder/build_wardrobe_flow_execute.ts',
  /export function executeBuildWardrobeFlow\(prepared: PreparedBuildWardrobeFlow\): BuildContextLike \| null/
);
requirePattern(
  'esm/native/builder/build_wardrobe_flow_runtime.ts',
  /export function runPreparedBuildWardrobeFlow\([\s\S]*prepared: PreparedBuildWardrobeFlow/
);
requirePattern(
  'esm/native/builder/module_loop_pipeline.ts',
  /export function buildModulesLoop\(ctx: unknown\)/
);
requirePattern(
  'esm/native/builder/sliding_doors_pipeline.ts',
  /export function applySlidingDoorsIfNeeded\(ctx: BuildContextLike\)/
);
requirePattern(
  'esm/native/builder/external_drawers_pipeline.ts',
  /export function applyExternalDrawersForModule\(\n  params: ApplyExternalDrawersForModuleParams \| null \| undefined\n\): boolean/
);
requirePattern(
  'esm/native/builder/internal_drawers_pipeline.ts',
  /export function makeInternalDrawerCreator\(params: InternalDrawerCreatorParams\): BuilderInternalDrawerCreator/
);

// Deps resolver owns fail-fast dependency validation and should not use broad `args && args.*` probing.
requirePattern('esm/native/builder/builder_deps_resolver.ts', /export type ResolveBuilderDepsRequest/);
requirePattern(
  'esm/native/builder/builder_deps_resolver.ts',
  /request: ResolveBuilderDepsRequest \| null \| undefined/
);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /function readBuilderDepsSection/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /function bindKnownFunction<Fn>/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /Reflect\.apply\(fn, owner, args\)/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /function bindGetMaterialFn/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /function readErrorMessage/);
forbidPattern('esm/native/builder/builder_deps_resolver.ts', /args && args\./);
forbidPattern('esm/native/builder/builder_deps_resolver.ts', /\b_obj\s*\(/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /Missing critical deps throw here/);
requirePattern('esm/native/builder/builder_deps_resolver.ts', /Builder tools missing: util\.cleanGroup/);
requirePattern(
  'esm/native/builder/builder_deps_resolver.ts',
  /Builder tools missing: materials\.getMaterial/
);
requirePattern(
  'esm/native/builder/builder_deps_resolver.ts',
  /Builder tools missing: modules\.createDoorVisual/
);
requirePattern(
  'esm/native/builder/builder_deps_resolver.ts',
  /Builder render helper missing: builderDeps\.render\.ensureWardrobeGroup/
);

// Core pure installation should be described as owner-provided surface filling, not legacy preservation.
forbidPattern('esm/native/builder/core_pure.ts', /do not stomp legacy impls/);
requirePattern('esm/native/builder/core_pure.ts', /installed surfaces remain owner-provided/);

if (errors.length) {
  console.error('[builder-pipeline-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[builder-pipeline-contract] ok');
