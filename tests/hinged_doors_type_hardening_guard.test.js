import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';
import { getFunctionSignatureFact, getTypeLiteralPropertyFacts } from './_semantic_source_contracts.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const buildTypes = readBuildTypesBundle(import.meta.url);
const doorState = read('esm/native/builder/doors_state_utils.ts');
const moduleLoopShared = read('esm/native/builder/module_loop_pipeline_shared.ts');
const hingedDoorsShared = read('esm/native/builder/hinged_doors_shared.ts');
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
    buildTypesNorm,
    /export type BuilderEdgeHandleDefaultNoneReader = \(partId: unknown\) => boolean/
  );

  assert.match(doorStateNorm, /makeDoorStateAccessors\(cfg: unknown\): BuilderDoorStateAccessorsLike/);
  assert.doesNotMatch(doorStateNorm, /BuilderDoorMapsConfigLike \| unknown/);
  assert.match(doorStateNorm, /const curtainVal: BuilderDoorStateAccessorsLike\['curtainVal'\] = \(/);
  assert.match(
    doorStateNorm,
    /isEdgeHandleDefaultNone: BuilderEdgeHandleDefaultNoneReader; \}\): BuilderHandleTypeResolver/
  );
  assert.doesNotMatch(doorState, /\bApp\??:\s*unknown/);
  assert.doesNotMatch(doorState, /\bhandleControlEnabled\b/);
  assert.doesNotMatch(doorState, /\bstackKey\b/);
  assert.doesNotMatch(doorState, /getModeId|isRemoveDoorsEnabled|isRemoveDoorMode/);

  assert.match(moduleLoopNorm, /type DoorStateLike = BuilderDoorStateAccessorsLike;/);
  assert.deepEqual(
    getFunctionSignatureFact(moduleLoopShared, 'readCurtainResolver', 'module_loop_pipeline_shared.ts'),
    {
      name: 'readCurtainResolver',
      async: false,
      params: [{ name: 'value', optional: false, type: 'unknown' }],
      returnType: 'BuilderCurtainResolver|undefined',
    }
  );
  assert.deepEqual(
    getFunctionSignatureFact(moduleLoopShared, 'readHingeDirResolver', 'module_loop_pipeline_shared.ts'),
    {
      name: 'readHingeDirResolver',
      async: false,
      params: [{ name: 'value', optional: false, type: 'unknown' }],
      returnType: 'BuilderHingeDirResolver|undefined',
    }
  );

  assert.match(hingedDoorsNorm, /export type HingedDoorPipelineCfg = BuilderDoorMapsConfigLike & \{/);
  const hingedCfg = getTypeLiteralPropertyFacts(
    hingedDoorsShared,
    'AppendHingedDoorOpsParams',
    'hinged_doors_shared.ts'
  );
  assert.deepEqual(
    hingedCfg?.filter(property => property.name === 'getPartColorValue' || property.name === 'curtainVal'),
    [
      { name: 'getPartColorValue', optional: true, readonly: false, type: 'BuilderPartColorResolver|null' },
      { name: 'curtainVal', optional: true, readonly: false, type: 'BuilderCurtainResolver|null' },
    ]
  );
  assert.doesNotMatch(
    hingedDoorsBundle,
    /@param \{Function\} params\.(getPartColorValue|isDoorRemoved|getHingeDir|isDoorSplit|isDoorSplitBottom|curtainVal|grooveVal)/
  );
});
