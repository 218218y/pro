#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['esm', 'types'];
const unsafeAnyCastPattern = /\bas\s+any\b/g;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(abs, out);
    } else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function listTypeRuntimeStubs() {
  const typesDir = path.join(root, 'types');
  let entries = [];
  try {
    entries = fs.readdirSync(typesDir, { withFileTypes: true });
  } catch {
    return { tsModules: new Set(), jsStubs: new Set() };
  }
  const tsModules = new Set();
  const jsStubs = new Set();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (entry.name.endsWith('.ts')) tsModules.add(entry.name.slice(0, -3));
    if (entry.name.endsWith('.js')) jsStubs.add(entry.name.slice(0, -3));
  }
  return { tsModules, jsStubs };
}

function collectTypeRuntimeStubViolations() {
  const { tsModules, jsStubs } = listTypeRuntimeStubs();
  const violations = [];
  for (const moduleName of [...tsModules].sort()) {
    if (!jsStubs.has(moduleName)) {
      violations.push(`types/${moduleName}.ts is missing matching runtime stub types/${moduleName}.js`);
    }
  }
  for (const moduleName of [...jsStubs].sort()) {
    if (!tsModules.has(moduleName)) {
      violations.push(`types/${moduleName}.js has no matching source module types/${moduleName}.ts`);
    }
  }
  return violations;
}

const runtimeGeometryScalarKeys = [
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'chestCommodeMirrorHeightCm',
  'chestCommodeMirrorWidthCm',
  'cornerWidth',
  'cornerDoors',
  'cornerWingDoorCount',
  'cornerDoorsCount',
  'cornerHeight',
  'cornerHeightCm',
  'cornerDepth',
  'cornerDepthCm',
];
const runtimeGeometryScalarRoots = [
  'esm/native/builder',
  'esm/native/services',
  'esm/native/runtime',
  'types',
];

const rawStoreBackendTypeNames = [
  'BackendStoreLike',
  'RootStoreLike',
  'StoreLike',
  'ConfigSlicePatch',
  'PatchPayload',
  'RawConfigSlicePatch',
  'RawPatchPayload',
  'StorePatchPayload',
  'StorePatchAction',
  'StoreBackendAction',
  'RawWardrobeProAction',
];

const rawStoreBackendTypeAllowPaths = new Set([
  'esm/native/platform/store.ts',
  'esm/native/platform/store_commit_pipeline.ts',
  'esm/native/platform/store_contract.ts',
  'esm/native/platform/store_patch_apply.ts',
  'esm/native/kernel/kernel_install_support.ts',
  'esm/native/kernel/state_api_install_support.ts',
  'esm/native/kernel/kernel_state_kernel_config_shared.ts',
  'esm/native/kernel/kernel_snapshot_store_commits_ops.ts',
  'esm/native/kernel/state_api_config_namespace.ts',
  'esm/native/kernel/state_api_config_namespace_core.ts',
  'esm/native/kernel/state_api_config_namespace_shared.ts',
  'esm/native/kernel/state_api_history_meta_reactivity_contracts.ts',
  'esm/native/kernel/state_api_shared.ts',
  'esm/native/kernel/state_api_surface_namespaces.ts',
  'esm/native/runtime/assert.ts',
  'esm/native/runtime/cfg_access_patch_metadata.ts',
  'esm/native/runtime/cfg_access_shared.ts',
  'esm/native/runtime/store_surface_access.ts',
  'esm/native/runtime/slice_write_access_context.ts',
  'esm/native/runtime/slice_write_access_dispatch.ts',
  'esm/native/runtime/slice_write_access_dispatch_targets.ts',
  'esm/native/runtime/slice_write_access_plan.ts',
  'esm/native/runtime/slice_write_access_shared.ts',
]);

const rawStoreWritePublicLayerRoots = [
  'esm/native/adapters',
  'esm/native/builder',
  'esm/native/features',
  'esm/native/services',
  'esm/native/ui',
];

const storeConfigMapWriteCapabilityNames = [
  'STORE_CONFIG_MAP_WRITE_CAPABILITY',
  'StoreConfigMapWriteCapability',
  'StoreConfigMapWriteOptions',
  'assertStoreConfigMapWriteAllowed',
  'configMapWriteCapability',
  'hasStoreConfigMapWriteCapability',
  'withStoreConfigMapWriteCapability',
];

const storeConfigMapWriteCapabilityAllowPaths = new Set([
  'esm/native/kernel/kernel_install_support.ts',
  'esm/native/kernel/state_api_install_support.ts',
  'esm/native/platform/store_commit_pipeline.ts',
  'esm/native/platform/store_patch_apply.ts',
  'esm/native/runtime/cfg_access_map_owner.ts',
  'esm/native/runtime/slice_write_access_dispatch_targets.ts',
  'esm/native/runtime/slice_write_access_shared.ts',
  'esm/native/runtime/store_config_map_write_capability.ts',
]);

const configMapOwnerCommitHelperAllowPaths = new Set([
  'esm/native/runtime/cfg_access_map_owner.ts',
  'esm/native/runtime/cfg_access_maps.ts',
  'esm/native/runtime/simple_writable_map_writer_owner.ts',
  'esm/native/runtime/visual_keyed_map_writer_owner.ts',
]);

const configReplaceMetadataBuilderAllowPaths = new Set([
  'esm/native/kernel/domain_api_room_section_wardrobe.ts',
  'esm/native/kernel/kernel_state_kernel_config_maps_apply.ts',
  'esm/native/kernel/state_api_config_namespace_core.ts',
  'esm/native/kernel/state_api_config_namespace_maps.ts',
  'esm/native/kernel/state_api_config_namespace_scalars.ts',
  'esm/native/runtime/cfg_access_map_owner.ts',
  'esm/native/runtime/cfg_access_patch_metadata.ts',
  'esm/native/runtime/cfg_access_scalars.ts',
]);

const storeConfigPatchApplyBoundaryAllowPaths = new Set([
  'esm/native/platform/store_commit_pipeline.ts',
  'esm/native/platform/store_patch_apply.ts',
]);

function collectRuntimeGeometryScalarUnionViolations() {
  const violations = [];
  const keyPattern = runtimeGeometryScalarKeys.join('|');
  const stringUnionPattern = new RegExp(
    `\\b(?:${keyPattern})\\??\\s*:\\s*(?:number\\s*\\|\\s*string|string\\s*\\|\\s*number)`,
    'g'
  );
  for (const rootName of runtimeGeometryScalarRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      stringUnionPattern.lastIndex = 0;
      const matches = [...source.matchAll(stringUnionPattern)];
      if (matches.length) {
        violations.push(`${rel}: runtime geometry scalar string union (${matches.length})`);
      }
    }
  }
  return violations;
}

function collectRawStoreBackendTypeBoundaryViolations() {
  const violations = [];
  const rawTypePattern = new RegExp(`\\b(?:${rawStoreBackendTypeNames.join('|')})\\b`, 'g');
  const usedAllowPaths = new Set();
  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    rawTypePattern.lastIndex = 0;
    const names = [...new Set([...source.matchAll(rawTypePattern)].map(match => match[0]))].sort();
    if (rawStoreBackendTypeAllowPaths.has(rel)) {
      if (names.length) usedAllowPaths.add(rel);
      continue;
    }
    if (names.length) {
      violations.push(
        `${rel}: raw store/backend action/patch type outside backend allowlist (${names.join(', ')})`
      );
    }
  }
  for (const rel of [...rawStoreBackendTypeAllowPaths].sort()) {
    if (!usedAllowPaths.has(rel)) {
      violations.push(`${rel}: raw store/backend action/patch type allowlist entry is unused`);
    }
  }
  return violations;
}

function collectRawStoreWriteBoundaryViolations() {
  const violations = [];
  const rawStoreWritePattern =
    /\b(?:App\.)?store\s*\.\s*(?:patch|setConfig|setRoot|replaceRoot)\s*\(|\b(?:setConfig|setRoot|replaceRoot)\s*\(|\.(?:setConfig|setRoot|replaceRoot)\s*\(|(?:\.|\b)patch(?:\?\.)?\s*\(\s*\{\s*(?:config|ui|runtime|mode|meta)\s*:/g;
  for (const rootName of rawStoreWritePublicLayerRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      rawStoreWritePattern.lastIndex = 0;
      const matches = [...source.matchAll(rawStoreWritePattern)];
      if (matches.length) {
        violations.push(
          `${rel}: raw store.patch/store.setConfig/store.setRoot/store.replaceRoot write outside backend boundary (${matches.length})`
        );
      }
    }
  }
  return violations;
}

function collectStoreConfigMapWriteCapabilityExportViolations() {
  const violations = [];
  const rel = 'esm/native/runtime/store_config_map_write_capability.ts';
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const rawCapabilityExportPatterns = [
    /\bexport\s+const\s+STORE_CONFIG_MAP_WRITE_CAPABILITY\b/,
    /\bexport\s*\{[^}]*\bSTORE_CONFIG_MAP_WRITE_CAPABILITY\b[^}]*\}/,
    /\bexport\s+default\s+STORE_CONFIG_MAP_WRITE_CAPABILITY\b/,
  ];
  for (const pattern of rawCapabilityExportPatterns) {
    if (pattern.test(source)) {
      violations.push(`${rel}: raw store config map write capability symbol must stay module-private`);
      break;
    }
  }
  if (!/const\s+STORE_CONFIG_MAP_WRITE_CAPABILITY\s*=\s*Symbol/.test(source)) {
    violations.push(`${rel}: missing module-private store config map write capability symbol`);
  }
  return violations;
}

function collectStoreConfigPatchApplyNameViolations() {
  const violations = [];
  const deprecatedNamePattern = /\bapplyConfigPatch\b/g;
  const storePatchApplyRel = 'esm/native/platform/store_patch_apply.ts';
  const storePatchApplySource = fs.readFileSync(path.join(root, storePatchApplyRel), 'utf8');
  if (!/\bexport function applyStoreConfigPatch\(/.test(storePatchApplySource)) {
    violations.push(`${storePatchApplyRel}: missing backend store config patch apply export`);
  }

  for (const rootName of ['esm', 'types']) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      deprecatedNamePattern.lastIndex = 0;
      const matches = [...source.matchAll(deprecatedNamePattern)];
      if (matches.length) {
        violations.push(`${rel}: deprecated generic applyConfigPatch name remains (${matches.length})`);
      }
    }
  }

  return violations;
}

function collectStoreConfigPatchApplyBoundaryViolations() {
  const violations = [];
  const applyNamePattern = /\bapplyStoreConfigPatch\b/g;
  const usedAllowPaths = new Set();

  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    applyNamePattern.lastIndex = 0;
    const matches = [...source.matchAll(applyNamePattern)];
    if (storeConfigPatchApplyBoundaryAllowPaths.has(rel)) {
      if (matches.length) usedAllowPaths.add(rel);
      continue;
    }
    if (matches.length) {
      violations.push(
        `${rel}: applyStoreConfigPatch used outside platform store boundary (${matches.length})`
      );
    }
  }

  for (const rel of [...storeConfigPatchApplyBoundaryAllowPaths].sort()) {
    if (!usedAllowPaths.has(rel)) {
      violations.push(`${rel}: applyStoreConfigPatch boundary allowlist entry is unused`);
    }
  }

  return violations;
}

function collectConfigMapOwnerCommitHelperViolations() {
  const violations = [];
  const currentNamePattern = /\b(?:commitConfigMapOwnerPatch|commitConfigMapOwnerPatchWithReplaceKeys)\b/g;
  const retiredNamePattern = /\b(?:applyConfigPatchFromMapOwner|applyConfigPatchReplaceKeysFromMapOwner)\b/g;
  const usedAllowPaths = new Set();
  const ownerModuleRel = 'esm/native/runtime/cfg_access_map_owner.ts';
  const scalarModuleRel = 'esm/native/runtime/cfg_access_scalars.ts';
  const ownerModuleSource = fs.readFileSync(path.join(root, ownerModuleRel), 'utf8');
  const scalarModuleSource = fs.readFileSync(path.join(root, scalarModuleRel), 'utf8');

  if (!/\bexport function commitConfigMapOwnerPatch\(/.test(ownerModuleSource)) {
    violations.push(`${ownerModuleRel}: missing config map owner patch commit helper`);
  }
  if (!/\bexport function commitConfigMapOwnerPatchWithReplaceKeys\(/.test(ownerModuleSource)) {
    violations.push(`${ownerModuleRel}: missing config map owner replace-key commit helper`);
  }
  if (/\bcommitConfigMapOwnerPatch\b/.test(scalarModuleSource)) {
    violations.push(`${scalarModuleRel}: config map owner commit helpers belong in cfg_access_map_owner.ts`);
  }

  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');

    retiredNamePattern.lastIndex = 0;
    const retiredMatches = [...source.matchAll(retiredNamePattern)];
    if (retiredMatches.length) {
      violations.push(`${rel}: retired generic map-owner helper name remains (${retiredMatches.length})`);
    }

    currentNamePattern.lastIndex = 0;
    const currentMatches = [...source.matchAll(currentNamePattern)];
    if (configMapOwnerCommitHelperAllowPaths.has(rel)) {
      if (currentMatches.length) usedAllowPaths.add(rel);
      continue;
    }
    if (currentMatches.length) {
      violations.push(
        `${rel}: config map owner commit helper used outside owner allowlist (${currentMatches.length})`
      );
    }
  }

  for (const rel of [...configMapOwnerCommitHelperAllowPaths].sort()) {
    if (!usedAllowPaths.has(rel)) {
      violations.push(`${rel}: config map owner commit helper allowlist entry is unused`);
    }
  }

  return violations;
}

function collectRetiredGenericConfigMapAccessViolations() {
  const violations = [];
  const retiredNamePattern = /\b(?:cfgSetMap|patchConfigMap)\b/g;

  for (const rootName of scanRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      retiredNamePattern.lastIndex = 0;
      const matches = [...source.matchAll(retiredNamePattern)];
      if (matches.length) {
        violations.push(`${rel}: retired generic config map access name remains (${matches.length})`);
      }
    }
  }

  return violations;
}

function collectRetiredConfigReplaceMetadataHelperViolations() {
  const violations = [];
  const retiredNamePattern = /\bcfgPatchWithReplaceKeys\b/g;

  for (const rootName of scanRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      retiredNamePattern.lastIndex = 0;
      const matches = [...source.matchAll(retiredNamePattern)];
      if (matches.length) {
        violations.push(
          `${rel}: retired generic config replace-metadata helper name remains (${matches.length})`
        );
      }
    }
  }

  return violations;
}

function collectConfigReplaceMetadataBuilderBoundaryViolations() {
  const violations = [];
  const builderNamePattern = /\bbuildConfigPatchWithReplaceMetadata\b/g;
  const usedAllowPaths = new Set();

  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    builderNamePattern.lastIndex = 0;
    const matches = [...source.matchAll(builderNamePattern)];
    if (configReplaceMetadataBuilderAllowPaths.has(rel)) {
      if (matches.length) usedAllowPaths.add(rel);
      continue;
    }
    if (matches.length) {
      violations.push(
        `${rel}: config replace metadata builder used outside owner/snapshot allowlist (${matches.length})`
      );
    }
  }

  for (const rel of [...configReplaceMetadataBuilderAllowPaths].sort()) {
    if (!usedAllowPaths.has(rel)) {
      violations.push(`${rel}: config replace metadata builder allowlist entry is unused`);
    }
  }

  return violations;
}

function collectStoreConfigMapWriteCapabilityViolations() {
  const violations = [];
  const capabilityPattern = new RegExp(`\\b(?:${storeConfigMapWriteCapabilityNames.join('|')})\\b`, 'g');
  const usedAllowPaths = new Set();

  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    capabilityPattern.lastIndex = 0;
    const names = [...new Set([...source.matchAll(capabilityPattern)].map(match => match[0]))].sort();
    if (storeConfigMapWriteCapabilityAllowPaths.has(rel)) {
      if (names.length) usedAllowPaths.add(rel);
      continue;
    }
    if (names.length) {
      violations.push(
        `${rel}: store config map write capability outside owner allowlist (${names.join(', ')})`
      );
    }
  }

  for (const rel of [...storeConfigMapWriteCapabilityAllowPaths].sort()) {
    if (!usedAllowPaths.has(rel)) {
      violations.push(`${rel}: store config map write capability allowlist entry is unused`);
    }
  }

  return violations;
}

function collectRawStoreBoundaryDocViolations() {
  const expectations = [
    {
      rel: 'types/actions.ts',
      pattern: /Public action union\. Raw PATCH payloads belong to backend_actions, not here\./,
    },
    {
      rel: 'types/backend_actions.ts',
      pattern: /Backend-only action envelope types for the raw store boundary\./,
    },
    {
      rel: 'types/backend_actions.ts',
      pattern: /Never use[\s\S]*it as a public action payload contract\./,
    },
    {
      rel: 'types/backend_store.ts',
      pattern: /Backend-only store write surface\./,
    },
    {
      rel: 'types/backend_patch_payload.ts',
      pattern: /Backend-only raw PATCH payload types\./,
    },
    {
      rel: 'types/patch_payload.ts',
      pattern: /Shared non-config slice PATCH payload shapes\./,
    },
    {
      rel: 'types/patch_payload.js',
      pattern: /Shared non-config slice patch runtime stub\./,
    },
    {
      rel: 'types/state.ts',
      pattern: /Public\/read-only store surface\. Raw write methods live in backend_store\.ts\./,
    },
    {
      rel: 'types/backend_store.ts',
      pattern: /Backend-only convenience writer\. Not for UI\/service\/domain callers\./,
    },
    {
      rel: 'types/backend_store.ts',
      pattern: /Snapshot\/parity tooling only; not for UI\/service\/domain callers\./,
    },
  ];
  const violations = [];
  for (const expectation of expectations) {
    const abs = path.join(root, expectation.rel);
    const source = fs.readFileSync(abs, 'utf8');
    if (!expectation.pattern.test(source)) {
      violations.push(`${expectation.rel}: missing raw store/backend boundary documentation`);
    }
  }
  return violations;
}

function collectPublicTypeBarrelViolations() {
  const source = fs.readFileSync(path.join(root, 'types/index.ts'), 'utf8');
  const violations = [];
  if (/export\s+\*\s+from\s+['"]\.\/actions['"]/.test(source)) {
    violations.push('types/index.ts: public barrel must explicitly export public action types');
  }
  if (/export\s+\*\s+from\s+['"]\.\/patch_payload['"]/.test(source)) {
    violations.push('types/index.ts: public barrel must explicitly export public patch payload types');
  }
  if (
    /backend_actions|backend_patch_payload|backend_store|store_spine|\b(?:BackendStoreLike|StoreLike|RootStoreLike|ConfigSlicePatch|PatchPayload|RawConfigSlicePatch|RawPatchPayload|StorePatchPayload|StorePatchAction|StoreBackendAction|RawWardrobeProAction)\b/.test(
      source
    )
  ) {
    violations.push('types/index.ts: public barrel must not export raw backend store/action/patch types');
  }
  return violations;
}

function collectPublicTypeBackendImportViolations() {
  const violations = [];
  const backendModules = ['backend_patch_payload', 'backend_actions', 'backend_store'];
  const backendModulePattern = backendModules.join('|');
  const backendImportPattern = new RegExp(
    `(?:^|\\n)\\s*(?:import|export)\\s+(?:type\\s+)?[\\s\\S]*?\\s+from\\s+['"]\\.\\/(?:${backendModulePattern})['"]`,
    'g'
  );
  const backendTypeAllowPaths = new Set([
    'types/backend_actions.ts',
    'types/backend_patch_payload.ts',
    'types/backend_store.ts',
  ]);

  for (const abs of walk(path.join(root, 'types'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (!rel.endsWith('.ts') || rel.endsWith('.d.ts') || backendTypeAllowPaths.has(rel)) continue;
    const source = fs.readFileSync(abs, 'utf8');
    backendImportPattern.lastIndex = 0;
    const matches = [...source.matchAll(backendImportPattern)];
    if (matches.length) {
      const modules = [
        ...new Set(
          matches
            .map(match => match[0].match(new RegExp(`\\.\\/(${backendModulePattern})['"]`))?.[1])
            .filter(Boolean)
        ),
      ].sort();
      violations.push(
        `${rel}: public type module must not import backend type boundary (${modules.join(', ')})`
      );
    }
  }
  return violations;
}

function collectRawPatchPayloadDeepImportViolations() {
  const violations = [];
  const patchPayloadSource = fs.readFileSync(path.join(root, 'types/patch_payload.ts'), 'utf8');
  if (/\bexport\s+(?:interface|type)\s+(?:ConfigSlicePatch|PatchPayload)\b/.test(patchPayloadSource)) {
    violations.push('types/patch_payload.ts: raw root/config patch types belong in backend_patch_payload.ts');
  }

  const rawPatchPayloadImportPattern = /import\s+type\s*\{([^}]*)\}\s+from\s+['"]([^'"]*patch_payload)['"]/g;
  for (const rootName of scanRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      rawPatchPayloadImportPattern.lastIndex = 0;
      const matches = [...source.matchAll(rawPatchPayloadImportPattern)].filter(
        match =>
          /\b(?:ConfigSlicePatch|PatchPayload)\b/.test(match[1]) &&
          match[2].replace(/\\/g, '/').split('/').pop() === 'patch_payload'
      );
      if (matches.length) {
        violations.push(`${rel}: raw root/config patch types must be imported from backend_patch_payload.ts`);
      }
    }
  }
  return violations;
}

const violations = [];
for (const rootName of scanRoots) {
  for (const abs of walk(path.join(root, rootName))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    unsafeAnyCastPattern.lastIndex = 0;
    const count = [...source.matchAll(unsafeAnyCastPattern)].length;
    if (count) violations.push(`${rel}: unsafe any cast (${count})`);
  }
}

violations.push(...collectTypeRuntimeStubViolations());
violations.push(...collectRuntimeGeometryScalarUnionViolations());
violations.push(...collectRawStoreBackendTypeBoundaryViolations());
violations.push(...collectRawStoreWriteBoundaryViolations());
violations.push(...collectStoreConfigMapWriteCapabilityExportViolations());
violations.push(...collectStoreConfigMapWriteCapabilityViolations());
violations.push(...collectStoreConfigPatchApplyNameViolations());
violations.push(...collectStoreConfigPatchApplyBoundaryViolations());
violations.push(...collectConfigMapOwnerCommitHelperViolations());
violations.push(...collectRetiredGenericConfigMapAccessViolations());
violations.push(...collectRetiredConfigReplaceMetadataHelperViolations());
violations.push(...collectConfigReplaceMetadataBuilderBoundaryViolations());
violations.push(...collectRawStoreBoundaryDocViolations());
violations.push(...collectPublicTypeBarrelViolations());
violations.push(...collectPublicTypeBackendImportViolations());
violations.push(...collectRawPatchPayloadDeepImportViolations());

if (violations.length) {
  console.error('[type-hardening-audit] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  '[type-hardening-audit] ok (0 `as any` casts in esm/types; types runtime stubs are paired; runtime geometry scalars stay numeric; raw store/backend patch boundary is guarded; public type modules avoid backend type imports; store config map write capability is owner-scoped; config replace metadata builder is owner/snapshot-scoped; retired generic config map access and replace-metadata helper names stay removed)'
);
