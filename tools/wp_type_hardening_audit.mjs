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
  'esm/native/runtime/cfg_access_shared.ts',
  'esm/native/runtime/cfg_access_core.ts',
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
    /\b(?:App\.)?store\s*\.\s*(?:patch|setConfig)\s*\(|\bsetConfig\s*\(|\.setConfig\s*\(|(?:\.|\b)patch(?:\?\.)?\s*\(\s*\{\s*(?:config|ui|runtime|mode|meta)\s*:/g;
  for (const rootName of rawStoreWritePublicLayerRoots) {
    for (const abs of walk(path.join(root, rootName))) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const source = fs.readFileSync(abs, 'utf8');
      rawStoreWritePattern.lastIndex = 0;
      const matches = [...source.matchAll(rawStoreWritePattern)];
      if (matches.length) {
        violations.push(
          `${rel}: raw store.patch/store.setConfig write outside backend boundary (${matches.length})`
        );
      }
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
violations.push(...collectRawStoreBoundaryDocViolations());
violations.push(...collectPublicTypeBarrelViolations());
violations.push(...collectRawPatchPayloadDeepImportViolations());

if (violations.length) {
  console.error('[type-hardening-audit] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  '[type-hardening-audit] ok (0 `as any` casts in esm/types; types runtime stubs are paired; runtime geometry scalars stay numeric; raw store/backend patch boundary is guarded)'
);
