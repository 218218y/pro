import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const MODULES = {
  store: 'esm/native/platform/store.ts',
  commit: 'esm/native/platform/store_commit_pipeline.ts',
  changeSet: 'esm/native/platform/store_change_set.ts',
  patch: 'esm/native/platform/store_patch_apply.ts',
  featureBoundary: 'esm/native/platform/store_feature_config_boundary.ts',
  subscriptions: 'esm/native/platform/store_subscriptions.ts',
  capability: 'esm/native/runtime/store_config_map_write_capability.ts',
  mapOwner: 'esm/native/runtime/cfg_access_map_owner.ts',
  cfgCore: 'esm/native/runtime/cfg_access_core.ts',
  metadata: 'esm/native/runtime/cfg_access_patch_metadata.ts',
  servicesState: 'esm/native/services/api_state_surface.ts',
  stateInstall: 'esm/native/kernel/state_api_install_support.ts',
  kernelInstall: 'esm/native/kernel/kernel_install_support.ts',
  structuralRefresh: 'esm/native/ui/react/actions/structural_build_refresh_actions.ts',
};

const analysisCache = new Map();

function analyze(file) {
  if (!analysisCache.has(file)) {
    const source = fs.readFileSync(file, 'utf8');
    analysisCache.set(file, {
      source,
      dependencies: analyzeModuleDependencies(file, source),
      exports: new Set(collectNamedModuleExports(file, source).map(entry => entry.exportedName)),
    });
  }
  return analysisCache.get(file);
}

function importedSymbols(file, specifier) {
  const dependencies = analyze(file).dependencies.imports.filter(entry => entry.specifier === specifier);
  if (!dependencies.length) return null;
  return new Set(dependencies.flatMap(entry => entry.importedSymbols));
}

function expectExports(file, names) {
  const exported = analyze(file).exports;
  for (const name of names) assert.equal(exported.has(name), true, `${file} must export ${name}`);
}

function expectNoExports(file, names) {
  const exported = analyze(file).exports;
  for (const name of names) assert.equal(exported.has(name), false, `${file} must not export ${name}`);
}

function expectImports(file, specifier, names) {
  const imported = importedSymbols(file, specifier);
  assert.ok(imported, `${file} must import ${specifier}`);
  for (const name of names)
    assert.equal(imported.has(name), true, `${file} must import ${name} from ${specifier}`);
}

function expectNoImport(file, specifier) {
  assert.equal(
    analyze(file).dependencies.imports.some(entry => entry.specifier === specifier),
    false,
    `${file} must not import ${specifier}`
  );
}

function interfaceMembers(file, interfaceName) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = createSourceFile(file, source, { label: 'store backend topology contract' });
  assert.deepEqual(ast.parseDiagnostics || [], [], `${file} must parse cleanly`);
  const members = new Set();
  walkAst(ast, node => {
    if (node.type !== 'TSInterfaceDeclaration' || node.id?.name !== interfaceName) return;
    for (const member of node.body?.body || []) {
      const key = member.key;
      if (key?.type === 'Identifier') members.add(key.name);
      else if (key?.type === 'Literal' && typeof key.value === 'string') members.add(key.value);
    }
  });
  return members;
}

function expectCleanModuleSyntax(file) {
  const deps = analyze(file).dependencies;
  assert.deepEqual(deps.unresolvedDynamicImports, [], `${file} has dynamic import drift`);
  assert.deepEqual(deps.forbiddenModuleSyntax, [], `${file} has module syntax drift`);
}

test('store backend keeps orchestration, commit, patch, and subscription ownership split', () => {
  expectExports(MODULES.store, ['createStore']);
  expectNoExports(MODULES.store, [
    'createStoreCommitPipeline',
    'applyStoreConfigPatch',
    'createListenerRegistry',
  ]);
  expectImports(MODULES.store, './store_shared.js', ['normalizeExternalRootState']);
  expectImports(MODULES.store, './store_commit_pipeline.js', ['createStoreCommitPipeline']);
  expectImports(MODULES.store, './store_subscriptions.js', [
    'createListenerRegistry',
    'createSelectorRegistryEntry',
  ]);

  expectExports(MODULES.commit, ['createStoreCommitPipeline']);
  expectImports(MODULES.commit, './store_patch_apply.js', [
    'applyStoreConfigPatch',
    'applyUiPatchSlice',
    'applyRuntimePatchSlice',
    'applyModePatchSlice',
    'applyMetaPatch',
  ]);
  expectImports(MODULES.commit, '../runtime/store_config_map_write_capability.js', [
    'assertStoreConfigMapWriteAllowed',
  ]);
  expectImports(MODULES.commit, './store_change_set.js', [
    'createPatchChangeSet',
    'createReplaceChangeSet',
    'hasStoreChanges',
  ]);

  expectExports(MODULES.changeSet, ['createPatchChangeSet', 'createReplaceChangeSet', 'hasStoreChanges']);

  expectExports(MODULES.patch, [
    'isReplacePatchValueEqual',
    'applyStoreConfigPatch',
    'applyUiPatchSlice',
    'applyRuntimePatchSlice',
    'applyModePatchSlice',
    'applyMetaPatch',
  ]);
  expectNoExports(MODULES.patch, ['applyConfigPatch']);
  expectImports(MODULES.patch, '../runtime/store_config_map_write_capability.js', [
    'assertStoreConfigMapWriteAllowed',
  ]);
  expectImports(MODULES.patch, './store_feature_config_boundary.js', [
    'canonicalizeStoreProjectConfigSnapshot',
    'sanitizeStoreCornerConfiguration',
    'sanitizeStoreModulesConfigurationEntry',
  ]);
  expectNoImport(MODULES.patch, '../features/project_config/api.js');
  expectNoImport(MODULES.patch, '../features/modules_configuration/modules_config_api.js');
  expectNoImport(MODULES.patch, '../features/modules_configuration/corner_cells_api.js');

  expectExports(MODULES.featureBoundary, [
    'canonicalizeStoreProjectConfigSnapshot',
    'sanitizeStoreCornerConfiguration',
    'sanitizeStoreModulesConfigurationEntry',
  ]);
  expectImports(MODULES.featureBoundary, '../features/project_config/api.js', [
    'canonicalizeProjectConfigStructuralSnapshot',
  ]);
  expectImports(MODULES.featureBoundary, '../features/modules_configuration/modules_config_api.js', [
    'sanitizeModulesConfigurationListLight',
    'sanitizeModulesConfigurationListForPatch',
  ]);
  expectImports(MODULES.featureBoundary, '../features/modules_configuration/corner_cells_api.js', [
    'sanitizeCornerConfigurationListsOnly',
    'sanitizeCornerConfigurationForPatch',
  ]);
  expectNoImport('esm/native/platform/store_shared.ts', '../features/project_config/api.js');

  expectExports(MODULES.subscriptions, ['createSelectorRegistryEntry', 'createListenerRegistry']);

  for (const file of [
    MODULES.store,
    MODULES.commit,
    MODULES.changeSet,
    MODULES.patch,
    MODULES.featureBoundary,
    MODULES.subscriptions,
  ]) {
    expectCleanModuleSyntax(file);
  }
});

test('known config-map writes cross the owner capability only through approved seams', () => {
  expectExports(MODULES.capability, [
    'hasStoreConfigMapWriteCapability',
    'withStoreConfigMapWriteCapability',
    'readKnownConfigMapPatchKeys',
    'readKnownConfigMapReplaceKeys',
    'assertStoreConfigMapWriteAllowed',
  ]);
  expectNoExports(MODULES.capability, ['STORE_CONFIG_MAP_WRITE_CAPABILITY']);
  expectImports(MODULES.capability, './maps_access_normalizers.js', ['isKnownMapName']);
  expectImports(MODULES.capability, './cfg_access_patch_metadata.js', [
    'isConfigPatchProtocolKey',
    'readConfigPatchReplaceMap',
  ]);

  expectImports(MODULES.mapOwner, './store_config_map_write_capability.js', [
    'withStoreConfigMapWriteCapability',
  ]);
  expectImports(MODULES.mapOwner, './cfg_access_patch_metadata.js', ['buildConfigPatchWithReplaceMetadata']);
  expectNoImport(MODULES.cfgCore, './store_config_map_write_capability.js');
  expectImports(MODULES.stateInstall, '../runtime/store_config_map_write_capability.js', [
    'withStoreConfigMapWriteCapability',
  ]);
  expectImports(MODULES.kernelInstall, '../runtime/store_config_map_write_capability.js', [
    'withStoreConfigMapWriteCapability',
  ]);
});

test('config replace metadata remains centralized behind the metadata owner', () => {
  expectExports(MODULES.metadata, [
    'isConfigPatchReplaceKey',
    'isConfigPatchProtocolKey',
    'readConfigPatchDataKeys',
    'readConfigPatchReplaceMap',
    'stripConfigPatchProtocolMetadata',
    'attachConfigPatchReplaceMetadata',
    'buildConfigPatchWithReplaceMetadata',
  ]);
  expectNoExports(MODULES.metadata, ['CONFIG_PATCH_REPLACE_KEY']);
  expectImports(MODULES.servicesState, '../runtime/cfg_access_patch_metadata.js', [
    'readConfigPatchDataKeys',
  ]);
  expectImports(MODULES.structuralRefresh, '../../../services/api.js', ['readConfigPatchDataKeys']);
  expectImports(MODULES.cfgCore, './cfg_access_patch_metadata.js', [
    'readConfigPatchDataKeys',
    'readConfigPatchReplaceMap',
    'stripConfigPatchProtocolMetadata',
  ]);
});

test('raw root replacement remains backend-only in the public type surface', () => {
  const publicMembers = interfaceMembers('types/state.ts', 'PublicStoreLike');
  const backendMembers = interfaceMembers('types/backend_store.ts', 'BackendStoreLike');

  for (const name of ['patch', 'setRoot', 'setConfig', 'setUi', 'setRuntime', 'setMode']) {
    assert.equal(publicMembers.has(name), false, `PublicStoreLike must not expose ${name}`);
  }
  for (const name of ['patch', 'setRoot', 'setConfig', 'setUi', 'setRuntime', 'setMode']) {
    assert.equal(backendMembers.has(name), true, `BackendStoreLike must own ${name}`);
  }
});
