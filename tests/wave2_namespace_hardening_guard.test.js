import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const kernelTypes = read('types/kernel.ts');
const stateApi = [
  read('esm/native/kernel/state_api.ts'),
  read('esm/native/kernel/state_api_install_support.ts'),
].join('\n');
const domainApi = [
  read('esm/native/kernel/domain_api.ts'),
  read('esm/native/kernel/domain_api_surface_sections.ts'),
  read('esm/native/kernel/domain_api_surface_sections_shared.ts'),
  read('esm/native/kernel/domain_api_surface_sections_state.ts'),
  read('esm/native/kernel/domain_api_surface_sections_bindings.ts'),
].join('\n');
const storeConfigActionFiles = [
  '../esm/native/ui/react/actions/store_actions_config.ts',
  '../esm/native/ui/react/actions/store_actions_config_contracts.ts',
  '../esm/native/ui/react/actions/store_actions_config_project.ts',
  '../esm/native/ui/react/actions/store_actions_config_maps.ts',
  '../esm/native/ui/react/actions/store_actions_config_modes.ts',
];
const storeActions = [
  read('esm/native/ui/react/actions/store_actions.ts'),
  read('esm/native/ui/react/actions/store_actions_state.ts'),
  ...storeConfigActionFiles.map(rel => read(rel.replace(/^\.\.\//, ''))),
  read('esm/native/ui/react/actions/store_actions_runtime.ts'),
].join('\n');
const actionsRoot = read('esm/native/kernel/actions_root.ts');
const domainModulesCorner = [
  read('esm/native/kernel/domain_api_modules_corner.ts'),
  read('esm/native/kernel/domain_api_modules_corner_corner_patch.ts'),
  read('esm/native/kernel/domain_api_modules_corner_module_patch.ts'),
].join('\n');

test('[wave2] typed namespaces cover React wrapper seams and state/domain installers stay canonical via shared helpers', () => {
  assert.match(kernelTypes, /setActiveTab\?: \(next: string, meta\?: ActionMetaLike\) => unknown;/);
  assert.match(kernelTypes, /setGridDivisionsState\?: \(/);
  assert.match(
    kernelTypes,
    /setExtDrawerSelection\?: \(drawerType: string \| null, count: number \| null, meta\?: ActionMetaLike\) => unknown;/
  );
  assert.match(kernelTypes, /ensureAt\?: \(index: number \| string\) => ModuleConfigLike \| null;/);
  assert.match(kernelTypes, /ensureLowerAt\?: \(index: number \| string\) => ModuleConfigLike \| null;/);

  assert.match(storeActions, /type StoreReader = \{\s*getState: \(\) => unknown;\s*\}/s);
  assert.match(storeActions, /type PartialUiActions = Partial<UiActionsNamespaceLike> & UnknownRecord;/);
  assert.match(
    storeActions,
    /type PartialConfigActions = Partial<ConfigActionsNamespaceLike> & UnknownRecord;/
  );
  assert.match(storeActions, /function getStore\(app: AppContainer\): StoreReader \| null/);
  assert.match(storeActions, /function readRootState\(app: AppContainer\): UnknownRecord \| null/);
  assert.match(storeActions, /function getUiNamespace\(app: AppContainer\): PartialUiActions/);
  assert.match(storeActions, /function getConfigNamespace\(app: AppContainer\): PartialConfigActions/);
  assert.match(
    storeActions,
    /runAppStructuralModulesRecompute\([\s\S]*\{ source: 'react:recomputeFromUi' \}/
  );
  assert.doesNotMatch(storeActions, /getState\(\) as any/);
  assert.doesNotMatch(storeActions, /key as any/);

  assert.match(actionsRoot, /export function ensureActionsRoot\(app: AppContainer\): ActionsNamespaceLike/);
  assert.match(
    actionsRoot,
    /export function ensureStateApiNamespaces\(app: AppContainer\): StateApiNamespaceBundle/
  );
  assert.match(
    actionsRoot,
    /export function ensureDomainApiNamespaces\(app: AppContainer\): DomainApiNamespaceBundle/
  );

  assert.match(domainApi, /const \{\s*actions,\s*config: configActions,/s);
  assert.match(
    domainApi,
    /import \{ installDomainApiModulesCorner \} from '\.\/domain_api_modules_corner\.js';/
  );
  assert.match(domainApi, /installDomainApiModulesCorner\(\{/);
  assert.match(domainModulesCorner, /const patchCornerCellForStack = \(/);
  assert.match(domainApi, /texturesActions\.setCustomUploadedDataURL =/);
  assert.doesNotMatch(domainApi, /const modsNs = actions\.modules as AnyRecord;/);

  assert.match(stateApi, /const readRootSnapshot = \(\): RootStateLike \| null =>/);
  assert.match(
    stateApi,
    /const callSetCfgScalar = \(key: string, valueOrFn: unknown, meta\?: ActionMetaLike\): unknown =>/
  );
  assert.match(stateApi, /installStateApiStackRouter\(\{/);
});
