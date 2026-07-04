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
  'StorePatchPayload',
  'StorePatchAction',
  'StoreBackendAction',
  'RawWardrobeProAction',
];

const rawStoreBackendTypeAllowPrefixes = [
  'esm/native/platform/',
  'esm/native/kernel/',
  'esm/native/runtime/',
];

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
  for (const abs of walk(path.join(root, 'esm'))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (rawStoreBackendTypeAllowPrefixes.some(prefix => rel.startsWith(prefix))) continue;
    const source = fs.readFileSync(abs, 'utf8');
    rawTypePattern.lastIndex = 0;
    const names = [...new Set([...source.matchAll(rawTypePattern)].map(match => match[0]))].sort();
    if (names.length) {
      violations.push(
        `${rel}: raw store/backend action type outside backend allowlist (${names.join(', ')})`
      );
    }
  }
  return violations;
}

function collectRawStoreWriteBoundaryViolations() {
  const violations = [];
  const rawStoreWritePattern = /\b(?:App\.)?store\s*\.\s*(?:patch|setConfig)\s*\(/g;
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
      pattern: /Backend-only raw PATCH action used below the public action facade\./,
    },
    {
      rel: 'types/actions.ts',
      pattern: /Never use[\s\S]*it as a public action payload contract\./,
    },
    {
      rel: 'types/patch_payload.ts',
      pattern: /Backend-only store PATCH payload\./,
    },
    {
      rel: 'types/state.ts',
      pattern: /Raw\/backend store patch boundary \(Zustand-only\)\./,
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

if (violations.length) {
  console.error('[type-hardening-audit] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  '[type-hardening-audit] ok (0 `as any` casts in esm/types; types runtime stubs are paired; runtime geometry scalars stay numeric; raw store backend boundary is guarded)'
);
