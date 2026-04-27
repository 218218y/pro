import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bundleSources, normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const commonTypes = read('types/common.ts');
const browserEnv = read('esm/native/runtime/browser_env_shared.ts');
const entryPro = read('esm/entry_pro.ts');
const errorOverlay = read('esm/native/ui/error_overlay.ts');
const smokeBundlePaths = [
  'esm/native/platform/smoke_checks.ts',
  'esm/native/platform/smoke_checks_core.ts',
  'esm/native/platform/smoke_checks_scenario.ts',
  'esm/native/platform/smoke_checks_shared.ts',
];
const smokeChecks = normalizeWhitespace(
  bundleSources(
    smokeBundlePaths.map(rel => '../' + rel),
    import.meta.url
  )
);
const renderLoopImpl = read('esm/native/platform/render_loop_impl.ts');
const buildFlow = read('esm/native/builder/build_wardrobe_flow.ts');
const buildTypes = normalizeWhitespace(readBuildTypesBundle(import.meta.url));
const depsResolver = read('esm/native/builder/builder_deps_resolver.ts');

test('[stageBH] canonical base types retire legacy weak aliases and function constructor fallbacks', () => {
  assert.match(commonTypes, /export type UnknownRecord = Record<string, unknown>;/);
  assert.match(commonTypes, /export type UnknownArgs = readonly unknown\[\];/);
  assert.match(
    commonTypes,
    /export type UnknownCallable<Args extends UnknownArgs = UnknownArgs, Result = unknown> = \(\.\.\.args: Args\) => Result;/
  );
  assert.match(
    commonTypes,
    /export type NullableUnknownCallable<Args extends UnknownArgs = UnknownArgs, Result = unknown,?> = UnknownCallable<Args, Result> \| null;/
  );
  assert.doesNotMatch(commonTypes, /export type AnyRecord =/);
  assert.doesNotMatch(commonTypes, /export type UnknownFn =/);
  assert.doesNotMatch(commonTypes, /export type NullableUnknownFn =/);

  assert.match(buildTypes, /export type BuilderArgs = readonly unknown\[\];/);
  assert.match(
    buildTypes,
    /export type BuilderCallable<Args extends BuilderArgs = BuilderArgs, Result = unknown> = \(\.\.\.args: Args\) => Result;/
  );
  assert.doesNotMatch(buildTypes, /BuilderUnknownFn/);
  assert.doesNotMatch(buildTypes, /NullableBuilderUnknownFn/);
  assert.match(
    depsResolver,
    /function bindCallable\(owner: UnknownRecord, key: string\): BuilderCallable \| null \{/
  );

  assert.match(browserEnv, /readGlobalScopeCandidate\(\(\) => Function\('return this'\)\(\)\)/);
  assert.doesNotMatch(browserEnv, /typeof self !== 'undefined'/);
  assert.doesNotMatch(browserEnv, /typeof global !== 'undefined'/);

  assert.doesNotMatch(entryPro, /\[Function\]/);
  assert.doesNotMatch(errorOverlay, /\[Function\]/);
  assert.match(smokeChecks, /const src = typeof bw\.toString === 'function' \? bw\.toString\(\) : '';/);
  assert.doesNotMatch(smokeChecks, /Function\.prototype\.toString\.call/);
  assert.doesNotMatch(renderLoopImpl, /Function\.prototype\.call/);
  assert.doesNotMatch(buildFlow, /type addOutlines as `Function`/);
});
