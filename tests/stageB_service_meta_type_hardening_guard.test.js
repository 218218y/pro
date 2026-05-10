import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const toolsRuntimeState = read('esm/native/runtime/tools_runtime_state.ts');
const metaProfiles = read('esm/native/runtime/meta_profiles_access.ts');
const configCompounds = [
  read('esm/native/services/config_compounds.ts'),
  read('esm/native/services/config_compounds_shared.ts'),
  read('esm/native/services/config_compounds_seed.ts'),
  read('esm/native/services/config_compounds_runtime.ts'),
].join('\n');
const cloudSyncConfig = [
  read('esm/native/services/cloud_sync_config.ts'),
  read('esm/native/services/cloud_sync_config_shared.ts'),
  read('esm/native/services/cloud_sync_config_sources.ts'),
  read('esm/native/services/cloud_sync_config_browser.ts'),
].join('\n');
const modulesTypes = read('types/modules_configuration.ts');
const kernelTypes = read('types/kernel.ts');
const toolsTypes = read('types/tools.ts');
const runtimeTypes = read('types/runtime.ts');
const buildTypes = readBuildTypesBundle(import.meta.url);
const configScalarTypes = read('types/config_scalar.ts');
const cfgAccessBundle = [
  read('esm/native/runtime/cfg_access.ts'),
  read('esm/native/runtime/cfg_access_core.ts'),
  read('esm/native/runtime/cfg_access_maps.ts'),
  read('esm/native/runtime/cfg_access_scalars.ts'),
].join('\n');
const cfgAccessShared = read('esm/native/runtime/cfg_access_shared.ts');
const actionsAccess = [
  read('esm/native/runtime/actions_access.ts'),
  read('esm/native/runtime/actions_access_core.ts'),
  read('esm/native/runtime/actions_access_domains.ts'),
  read('esm/native/runtime/actions_access_mutations.ts'),
].join('\n');
const runtimeWriteAccess = read('esm/native/runtime/runtime_write_access.ts');
const modeWriteAccess = read('esm/native/runtime/mode_write_access.ts');

test('[stageB] tools/meta/config/cloud surfaces use explicit typed boundaries', () => {
  assert.match(modulesTypes, /export interface CornerConfigurationLike extends (AnyRecord|UnknownRecord)/);
  assert.match(
    modulesTypes,
    /export interface NormalizedCornerConfigurationLike extends CornerConfigurationLike/
  );
  assert.match(configScalarTypes, /cornerConfiguration: CornerConfigurationLike;/);
  assert.match(buildTypes, /cornerConfiguration\?: CornerConfigurationLike;/);

  assert.match(kernelTypes, /export interface MetaActionsNamespaceLike extends (AnyRecord|UnknownRecord)/);
  assert.match(kernelTypes, /meta\?: MetaActionsNamespaceLike;/);
  assert.match(kernelTypes, /export interface ConfigActionsNamespaceLike extends (AnyRecord|UnknownRecord)/);
  assert.match(kernelTypes, /export interface RuntimeActionsNamespaceLike extends (AnyRecord|UnknownRecord)/);
  assert.match(kernelTypes, /export interface ModeActionsNamespaceLike extends (AnyRecord|UnknownRecord)/);
  assert.match(kernelTypes, /config\?: ConfigActionsNamespaceLike;/);
  assert.match(kernelTypes, /runtime\?: RuntimeActionsNamespaceLike;/);
  assert.match(kernelTypes, /mode\?: ModeActionsNamespaceLike;/);

  assert.match(
    metaProfiles,
    /import type \{[^\n]*ActionMetaLike[^\n]*MetaActionsNamespaceLike[^\n]*UnknownRecord[^\n]*\} from '\.\.\/\.\.\/\.\.\/types';/
  );
  assert.match(metaProfiles, /function metaNsFromApp\(App: unknown\): MetaActionsNamespaceLike \| null/);
  assert.match(metaProfiles, /function callMetaProfile\(/);
  assert.doesNotMatch(metaProfiles, /metaNsFromApp\(App: unknown\): AnyRecord \| null/);

  assert.match(
    toolsTypes,
    /setHandlesType\?: \(handleType: HandleType \| string \| null, meta\?: ActionMetaLike\) => unknown;/
  );
  assert.match(
    toolsTypes,
    /setDrawersOpenId\?: \(id: DrawersOpenIdLike, meta\?: ActionMetaLike\) => unknown;/
  );

  assert.match(toolsRuntimeState, /type RuntimeToolsState = Pick</);
  assert.match(toolsRuntimeState, /setRuntimeScalar\(App, 'paintColor',/);
  assert.match(toolsRuntimeState, /setRuntimeScalar\(App, 'handlesType',/);
  assert.match(toolsRuntimeState, /setRuntimeScalar\(App, 'drawersOpenId',/);
  assert.doesNotMatch(toolsRuntimeState, /patchRuntime\(App, \{ paintColor:/);
  assert.doesNotMatch(toolsRuntimeState, /type ToolsLike = AnyRecord;/);

  assert.match(configCompounds, /type ConfigCompoundKey = 'modulesConfiguration' \| 'cornerConfiguration';/);
  assert.match(configCompounds, /export interface ConfigCompoundsSeedOptions/);
  assert.match(
    configCompounds,
    /function buildSeedMeta\(App: AppContainer, key: ConfigCompoundKey\): ActionMetaLike/
  );
  assert.match(configCompounds, /setCfgModulesConfiguration\(App, val, meta\)/);
  assert.match(configCompounds, /setCfgCornerConfiguration\(App, val, meta\)/);
  assert.doesNotMatch(configCompounds, /cfgSetScalar\(App, key, val, buildSeedMeta\(App, key\)\);/);
  assert.doesNotMatch(configCompounds, /const actions: any = \(App as any\)\.actions/);
  assert.doesNotMatch(configCompounds, /type MetaFn = \(m\?: AnyRecord\) => AnyRecord;/);

  assert.match(cfgAccessShared, /type ConfigAccessAppLike = \{/);
  assert.match(cfgAccessShared, /function getActions\(App: unknown\): ActionsNamespaceLike \| null/);
  assert.match(
    cfgAccessShared,
    /export function getConfigNamespace\(App: unknown\): ConfigActionsNamespaceLike \| null/
  );
  assert.match(
    cfgAccessShared,
    /export function getHistoryNamespace\(App: unknown\): HistoryActionsNamespaceLike \| null/
  );
  assert.match(
    cfgAccessShared,
    /export function getMetaNamespace\(App: unknown\): MetaActionsNamespaceLike \| null/
  );
  assert.match(cfgAccessBundle, /if \(typeof cfgNs\?\.setScalar === 'function'\)/);
  assert.doesNotMatch(cfgAccessShared, /const actions = asRecord\(\(App as any\)\?\.actions\)/);
  assert.doesNotMatch(cfgAccessBundle, /\(cfgNs as any\)/);

  assert.ok(
    actionsAccess.includes('type ActionAccessFn = ActionCallable | ((...args: never[]) => unknown);') ||
      actionsAccess.includes('type ActionAccessFn = UnknownFn | ((...args: never[]) => unknown);')
  );
  assert.ok(
    /type ActionCallable = UnknownCallable;/.test(actionsAccess) ||
      /type ActionCallable = \(\.\.\.args: unknown\[\]\) => unknown;/.test(actionsAccess),
    'actions_access should use the canonical unknown-callable contract'
  );
  assert.match(actionsAccess, /export function getActionFn<T extends ActionAccessFn>/);
  assert.match(actionsAccess, /export function callMetaAction<T extends ActionAccessFn>/);
  assert.ok(!actionsAccess.includes('<T extends (...args: any[]) => any>'));

  assert.match(
    runtimeWriteAccess,
    /import \{ asRecord, getSliceNamespace, patchSliceCanonical \} from '\.\/slice_write_access\.js';/
  );
  assert.match(
    runtimeWriteAccess,
    /function getRuntimeNamespace\(App: unknown\): RuntimeActionsNamespaceLike \| null/
  );
  assert.match(runtimeWriteAccess, /if \(typeof rtNs\?\.setScalar === 'function'\)/);
  assert.doesNotMatch(runtimeWriteAccess, /\(rtNs as AnyRecord\)\.setScalar/);
  assert.doesNotMatch(runtimeWriteAccess, /meta as any/);

  assert.match(modeWriteAccess, /type ModeWriteAppLike = \{/);
  assert.match(
    modeWriteAccess,
    /function getModeNamespace\(App: unknown\): ModeActionsNamespaceLike \| null/
  );
  assert.match(modeWriteAccess, /if \(typeof modeNs\?\.set === 'function'\)/);
  assert.doesNotMatch(modeWriteAccess, /\(modeNs as AnyRecord\)\.set/);
  assert.doesNotMatch(modeWriteAccess, /meta as any/);

  assert.match(runtimeTypes, /realtimeMode\?: 'broadcast';/);
  assert.match(
    cloudSyncConfig,
    /type SupabaseCfgRaw = \{ \[K in keyof WardrobeProSupabaseCloudSyncConfig\]\?: unknown \};/
  );
  assert.match(cloudSyncConfig, /type SupabaseImportMetaEnvLike = UnknownRecord & \{/);
  assert.match(
    cloudSyncConfig,
    /const shareBaseUrl = asString\(rec\?\.shareBaseUrl\) \|\| 'https:\/\/bargig218\.netlify\.app\/'/
  );
  assert.doesNotMatch(
    cloudSyncConfig,
    /const env = asRecord\(\(import\.meta as unknown as AnyRecord\)\?\.env\);/
  );
});
