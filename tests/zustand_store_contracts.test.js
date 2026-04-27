import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFirstExisting } from './_read_src.js';
import { normalizeWhitespace } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

const plan = read('esm/native/builder/plan.ts');
const provide = read('esm/native/builder/provide.ts');
const scheduler = read('esm/native/builder/scheduler.ts');
const schedulerRuntime = read('esm/native/builder/scheduler_runtime.ts');
const schedulerShared = read('esm/native/builder/scheduler_shared.ts');
const cfgAccess = readFirstExisting(['../esm/native/runtime/cfg_access.ts'], import.meta.url);
const cfgAccessBundle = normalizeWhitespace(
  [
    readFirstExisting(['../esm/native/runtime/cfg_access.ts'], import.meta.url),
    readFirstExisting(['../esm/native/runtime/cfg_access_core.ts'], import.meta.url),
    readFirstExisting(['../esm/native/runtime/cfg_access_maps.ts'], import.meta.url),
    readFirstExisting(['../esm/native/runtime/cfg_access_scalars.ts'], import.meta.url),
  ].join('\n')
);
const storeTs = read('esm/native/platform/store.ts');
const storeSharedTs = readFirstExisting(['../esm/native/platform/store_shared.ts'], import.meta.url);
const storeCommitPipelineTs = readFirstExisting(
  ['../esm/native/platform/store_commit_pipeline.ts'],
  import.meta.url
);
const storePatchApplyTs = readFirstExisting(['../esm/native/platform/store_patch_apply.ts'], import.meta.url);
const storeSubscriptionsTs = readFirstExisting(
  ['../esm/native/platform/store_subscriptions.ts'],
  import.meta.url
);
const storeContractTs = readFirstExisting(['../esm/native/platform/store_contract.ts'], import.meta.url);
const stateApiConfig = [
  read('esm/native/kernel/state_api_config_namespace.ts'),
  read('esm/native/kernel/state_api_config_namespace_maps.ts'),
  read('esm/native/kernel/state_api_config_namespace_shared.ts'),
].join('\n');
const hooks = readFirstExisting(['../esm/native/ui/react/hooks.tsx'], import.meta.url);
const bootReactUi = readFirstExisting(['../esm/native/ui/react/boot_react_ui.tsx'], import.meta.url);
const configSelectors = readFirstExisting(
  ['../esm/native/ui/react/selectors/config_selectors.ts'],
  import.meta.url
);
const uiSelectors = readFirstExisting(['../esm/native/ui/react/selectors/ui_selectors.ts'], import.meta.url);
const gmailDraft = readFirstExisting(['../esm/native/ui/react/pdf/gmail_draft.ts'], import.meta.url);
const componentsIndex = readFirstExisting(['../esm/native/ui/react/components/index.ts'], import.meta.url);
const button = readFirstExisting(['../esm/native/ui/react/components/Button.tsx'], import.meta.url);
const tabs = readFirstExisting(['../esm/native/ui/react/components/Tabs.tsx'], import.meta.url);
const tsconfigRoot = readFirstExisting(['../tsconfig.json'], import.meta.url);
const storeSrc = normalizeWhitespace(readFirstExisting(['../esm/native/platform/store.ts'], import.meta.url));
const hooksSrc = normalizeWhitespace(
  readFirstExisting(['../esm/native/ui/react/hooks.tsx'], import.meta.url)
);
const stateApi = [
  readFirstExisting(['../esm/native/kernel/state_api.ts'], import.meta.url),
  readFirstExisting(['../esm/native/kernel/state_api_history_meta_reactivity.ts'], import.meta.url),
  readFirstExisting(['../esm/native/kernel/state_api_meta_namespace.ts'], import.meta.url),
].join('\n');
const typesKernel = readFirstExisting(['../types/kernel.ts'], import.meta.url);

test('[zustand-store] builder/store/config seams stay canonical and typed', () => {
  assert.match(plan, /import \{ getBuildStateMaybe \} from '\.\/store_access\.js';/);
  assert.match(
    plan,
    /const normalizedDeps = setPlanDeps\(Object\.assign\(\{ App \}, __readPlanDeps\(deps\) \|\| \{\}\)\);/
  );
  assert.match(plan, /getBuildStateMaybe\(app, input\)/);
  assert.doesNotMatch(plan, /legacy injected stateKernel/);
  assert.doesNotMatch(plan, /deps && deps\.stateKernel/);
  assert.doesNotMatch(plan, /__deps\.stateKernel/);
  assert.match(provide, /installBuilderPlan\(A, \{ App: A \}\)/);
  assert.doesNotMatch(provide, /assertStateKernel/);
  assert.doesNotMatch(provide, /installBuilderScheduler\(A, \{[\s\S]{0,200}stateKernel,/);
  assert.doesNotMatch(typesKernel, /dispatch\?: \(action: ActionEnvelope<string, unknown>\) => unknown;/);
  assert.doesNotMatch(
    read('types/state.ts'),
    /dispatch\?: \(action: A, opts\?: DispatchOptionsLike\) => unknown;/
  );
  assert.doesNotMatch(
    readBuildTypesBundle(import.meta.url),
    /export interface BuilderSchedulerDepsLike[\s\S]{0,200}stateKernel\?: StateKernelLike;/
  );
  assert.match(`${scheduler}\n${schedulerShared}`, /getBuildStateMaybe\(App, uiOverride\)/);
  assert.doesNotMatch(scheduler, /s\.deps\.stateKernel/);

  assert.doesNotMatch(cfgAccess, /App\.cfg\b/);
  assert.doesNotMatch(cfgAccess, /\bstores\./);
  assert.doesNotMatch(cfgAccess, /cfg_surface/);
  assert.match(cfgAccess, /from '\.\/cfg_access_core\.js'/);
  assert.match(cfgAccess, /from '\.\/cfg_access_maps\.js'/);
  assert.match(cfgAccess, /from '\.\/cfg_access_scalars\.js'/);
  assert.match(cfgAccessBundle, /export function applyConfigPatch\(/);
  assert.match(cfgAccessBundle, /export (?:function patchConfigMap\(|const patchConfigMap\s*:)/);
  assert.doesNotMatch(cfgAccess, /export function cfgPatch\(/);
  assert.doesNotMatch(cfgAccess, /export function cfgPatchMap\(/);
});

test('[zustand-store] store preserves shallow-equivalent values and skips semantic no-op commits', () => {
  assert.match(`${storeTs}\n${storeSharedTs}`, /from '\.\/store_contract\.js';/);
  assert.match(storeTs, /from '\.\/store_shared\.js';/);
  assert.match(storeTs, /from '\.\/store_commit_pipeline\.js';/);
  assert.match(storeTs, /from '\.\/store_subscriptions\.js';/);
  assert.match(storeContractTs, /export function ensureRootStateContract\(/);
  assert.match(storeCommitPipelineTs, /export function createStoreCommitPipeline\(/);
  assert.match(
    storePatchApplyTs,
    /export function isReplacePatchValueEqual\(prev: unknown, next: unknown\): boolean/
  );
  assert.match(storePatchApplyTs, /if \(isReplacePatchValueEqual\(prevVal, nextVal\)\) \{/);
  assert.match(storePatchApplyTs, /clean\[rk\] = prevVal;/);
  assert.match(storePatchApplyTs, /deleteOwn\(clean, rk\);/);
  assert.match(storeSharedTs, /export function createEmptyDebugState\(\): StoreDebugState/);
  assert.match(storeSharedTs, /export function recordDebugPatchStat\(/);

  assert.match(
    stateApiConfig,
    /const cfg0 = asRecord\(safeCall\(\(\) => configNs\.get\?\.\(\)\)\) \|\| \{\};/
  );
  assert.match(stateApiConfig, /const nextColors = reuseEquivalentValue\(/);
  assert.match(stateApiConfig, /if \(!Object\.keys\(basePatch\)\.length\) return cfg0;/);
  assert.match(stateApiConfig, /function reuseEquivalentValue\(prev: unknown, next: unknown\): unknown \{/);

  assert.match(storeCommitPipelineTs, /function readCommitControlFlags\(/);
  assert.match(
    storeCommitPipelineTs,
    /forceCommit: readRecordBoolean\(meta, 'force'\) \|\| readRecordBoolean\(meta, 'forceBuild'\)/
  );
  assert.match(storeCommitPipelineTs, /if \(!forceCommit && isNoopPatchedRoot\(current, nextRoot\)\) \{/);
  assert.match(storeCommitPipelineTs, /function shouldAutoMarkConfigDirty\(/);
  assert.match(storeCommitPipelineTs, /return didConfigSliceSemanticallyChange\(current, nextRoot\);/);
  assert.match(storeCommitPipelineTs, /debugState\.noopSkipCount \+= 1;/);
  assert.match(storeCommitPipelineTs, /return current;/);
});

test('[zustand-store] selector subscriptions and typed meta hooks remain required', () => {
  assert.match(storeSrc, /function subscribeSelector<T>\(/);
  assert.match(storeSrc, /const selectorListeners = createListenerRegistry<SelectorRegistryEntry>\(\)/);
  assert.match(
    normalizeWhitespace(`${storeTs}\n${storeCommitPipelineTs}`),
    /notifySelectorSubscribers\(stampedMeta\)/
  );
  assert.match(storeSrc, /subscribeSelector,?/);
  assert.match(storeSrc, /function getDebugStats\(\): StoreDebugStats/);
  assert.match(storeSrc, /function resetDebugStats\(\): void/);
  assert.match(storeSubscriptionsTs, /export function createSelectorRegistryEntry<T>\(/);
  assert.match(storeSubscriptionsTs, /export function createListenerRegistry<T>\(\)/);

  assert.match(hooksSrc, /type SelectorStoreApi = \{[\s\S]*?subscribeSelector:\s*<T>\(/);
  assert.match(hooksSrc, /requireStoreSelectorSurface\(app, 'ui\/react\/hooks'\)/);
  assert.match(hooksSrc, /const unsub = api\.subscribeSelector\(/);
  assert.match(hooksSrc, /return useSyncExternalStore\(subscribe, getSnapshot, getSnapshot\)/);
  assert.doesNotMatch(hooksSrc, /return api\.subscribe\(cb\)/);

  assert.match(stateApi, /isActionStubFn\(metaNs\.touch, 'meta:touch'\)/);
  assert.match(stateApi, /metaNs\.touch = function touch\(meta\?: ActionMetaLike\)/);
  assert.match(stateApi, /return commitMetaTouch\(m\)/);
  assert.match(typesKernel, /touch: \(meta\?: ActionMetaLike\) => unknown;/);
});

test('[zustand-store] local React/store helper types stay internal and public exports stay clean', () => {
  assert.doesNotMatch(bootReactUi, /export type BootReactUiOpts/);
  assert.doesNotMatch(hooks, /export type EqualityFn/);
  assert.doesNotMatch(hooks, /export function objectIs/);
  assert.doesNotMatch(hooks, /export function shallowEqual/);
  assert.doesNotMatch(hooks, /export type ExportActions/);
  assert.match(hooks, /export function useModeSelectorShallow<T extends object \| unknown\[]>\(/);
  assert.match(hooks, /export function useStoreSelectorShallow<T extends object \| unknown\[]>\(/);
  assert.doesNotMatch(configSelectors, /export function selectCfgScalarOrDefault/);
  assert.doesNotMatch(uiSelectors, /export type AutosaveInfo/);
  assert.doesNotMatch(gmailDraft, /export type GmailDraftResult/);

  assert.match(componentsIndex, /export \* from '\.\/Button\.js';/);
  assert.match(componentsIndex, /export \* from '\.\/Tabs\.js';/);
  assert.doesNotMatch(button, /export type ButtonProps/);
  assert.doesNotMatch(button, /export type ButtonVariant/);
  assert.doesNotMatch(button, /export type ButtonSize/);
  assert.doesNotMatch(tabs, /export type TabsItem/);
  assert.doesNotMatch(tabs, /export type TabsProps/);
  assert.doesNotMatch(tabs, /export type TabPanelProps/);

  assert.doesNotMatch(tsconfigRoot, /allowImportingTsExtensions/);
});
