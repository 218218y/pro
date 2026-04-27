import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const buildTypes = readBuildTypesBundle(import.meta.url);
const doorState = read('esm/native/builder/doors_state_utils.ts');
const moduleLoopBundle = bundleSources(
  [
    '../esm/native/builder/module_loop_pipeline.ts',
    '../esm/native/builder/module_loop_pipeline_shared.ts',
    '../esm/native/builder/module_loop_pipeline_runtime.ts',
    '../esm/native/builder/module_loop_pipeline_module.ts',
    '../esm/native/builder/module_loop_pipeline_module_depth.ts',
    '../esm/native/builder/module_loop_pipeline_module_frame.ts',
    '../esm/native/builder/module_loop_pipeline_module_dividers.ts',
    '../esm/native/builder/module_loop_pipeline_module_registry.ts',
    '../esm/native/builder/module_loop_pipeline_module_contents.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const hingedDoorsBundle = bundleSources(
  [
    '../esm/native/builder/hinged_doors_pipeline.ts',
    '../esm/native/builder/hinged_doors_shared.ts',
    '../esm/native/builder/hinged_doors_module_ops.ts',
    '../esm/native/builder/hinged_doors_module_ops_shared.ts',
    '../esm/native/builder/hinged_doors_module_ops_split.ts',
    '../esm/native/builder/hinged_doors_module_ops_full.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const buildTypesNorm = normalizeWhitespace(buildTypes);
const doorStateNorm = normalizeWhitespace(doorState);
const moduleLoopNorm = normalizeWhitespace(moduleLoopBundle);
const hingedDoorsNorm = normalizeWhitespace(hingedDoorsBundle);

test('[hinged-doors-type-hardening] builder door resolvers flow through shared typed seams', () => {
  assert.match(buildTypesNorm, /export interface BuilderDoorStateAccessorsLike extends UnknownRecord/);
  assert.match(buildTypesNorm, /export interface BuilderDoorMapsConfigLike extends UnknownRecord/);

  assert.match(
    doorStateNorm,
    /makeDoorStateAccessors\(cfg: BuilderDoorMapsConfigLike \| unknown\): BuilderDoorStateAccessorsLike/
  );
  assert.match(doorStateNorm, /const curtainVal: BuilderDoorStateAccessorsLike\['curtainVal'\] = \(/);

  assert.match(moduleLoopNorm, /type DoorStateLike = BuilderDoorStateAccessorsLike;/);
  assert.match(
    moduleLoopNorm,
    /function readCurtainResolver\(value: unknown\): BuilderCurtainResolver \| undefined/
  );
  assert.match(
    moduleLoopNorm,
    /function readHingeDirResolver\(value: unknown\): BuilderHingeDirResolver \| undefined/
  );

  assert.match(hingedDoorsNorm, /export type HingedDoorPipelineCfg = BuilderDoorMapsConfigLike & \{/);
  assert.match(hingedDoorsNorm, /getPartColorValue\?: BuilderPartColorResolver \| null;/);
  assert.match(hingedDoorsNorm, /curtainVal\?: BuilderCurtainResolver \| null;/);
  assert.doesNotMatch(
    hingedDoorsBundle,
    /@param \{Function\} params\.(getPartColorValue|isDoorRemoved|getHingeDir|isDoorSplit|isDoorSplitBottom|curtainVal|grooveVal)/
  );
});
