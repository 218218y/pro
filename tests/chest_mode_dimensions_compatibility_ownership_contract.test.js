import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile } from '../tools/wp_ast_adapter.mjs';
import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperRel = 'esm/shared/dimensions/compatibility/legacy_dimension_number_view.ts';
const compatibilityRel = 'esm/shared/dimensions/compatibility/chest_mode_dimensions_compatibility.ts';
const ownerRel = 'esm/shared/dimensions/chest_mode_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const runtimeRel = 'esm/native/runtime/api.ts';
const semanticSnapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function canonicalModuleTarget(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const cleanSpecifier = stripQueryHash(specifier);
  let raw;
  if (cleanSpecifier.startsWith('/esm/')) raw = path.join(root, cleanSpecifier.slice(1));
  else if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const stem = raw.slice(0, -extension.length);
    candidates.push(
      ...(runtimeExtensionCandidates[extension] ?? []).map(sourceExtension => `${stem}${sourceExtension}`)
    );
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function collectConsumers(targetRel) {
  const target = canonicalModuleTarget(path.join(root, targetRel));
  return listSourceFiles(path.join(root, 'esm'))
    .flatMap(file => {
      const rel = path.relative(root, file).replaceAll('\\', '/');
      return analyzeModuleDependencies(rel, fs.readFileSync(file, 'utf8'))
        .imports.filter(dependency => resolveModuleTarget(file, dependency.specifier) === target)
        .map(dependency => ({
          file: rel,
          kind: dependency.kind,
          syntax: dependency.syntax,
          symbols: dependency.importedSymbols,
        }));
    })
    .sort((left, right) => left.file.localeCompare(right.file));
}

function inspectHelper(source) {
  const violations = [];
  let sourceFile;
  try {
    sourceFile = createSourceFile(helperRel, source);
  } catch (error) {
    return [{ kind: 'parse', detail: error.message }];
  }
  const exports = collectNamedModuleExports(helperRel, source);
  if (
    exports.length !== 2 ||
    !exports.some(entry => entry.exportedName === 'LegacyDimensionNumberView' && entry.kind === 'type') ||
    !exports.some(entry => entry.exportedName === 'legacyDimensionNumberView' && entry.kind === 'value')
  ) {
    violations.push({ kind: 'helper-surface' });
  }
  const [typeExport, functionExport] = sourceFile.body ?? [];
  const functionDeclaration = functionExport?.declaration;
  const functionBody = functionDeclaration?.body?.body ?? [];
  const returnExpression = functionBody[0]?.argument;
  if (
    sourceFile.body?.length !== 2 ||
    typeExport?.type !== 'ExportNamedDeclaration' ||
    typeExport.declaration?.type !== 'TSTypeAliasDeclaration' ||
    functionExport?.type !== 'ExportNamedDeclaration' ||
    functionDeclaration?.type !== 'FunctionDeclaration' ||
    functionDeclaration.id?.name !== 'legacyDimensionNumberView' ||
    functionDeclaration.params?.length !== 1 ||
    functionDeclaration.params[0]?.name !== 'value' ||
    functionBody.length !== 1 ||
    functionBody[0]?.type !== 'ReturnStatement'
  ) {
    violations.push({ kind: 'helper-runtime-work' });
  }
  if (returnExpression?.type !== 'TSAsExpression' || returnExpression.expression?.name !== 'value') {
    violations.push({ kind: 'helper-runtime-cast' });
  }
  if (
    /Object\.(?:freeze|assign)|\.bind\s*\(|\b(?:Proxy|structuredClone)\b|\.\.\.|\bfor\s*\(|\bwhile\s*\(/u.test(
      source
    )
  ) {
    violations.push({ kind: 'helper-runtime-work' });
  }
  return violations;
}

function inspectCompatibility(source) {
  const violations = [];
  let analysis;
  let sourceFile;
  try {
    analysis = analyzeModuleDependencies(compatibilityRel, source);
    sourceFile = createSourceFile(compatibilityRel, source);
  } catch (error) {
    return [{ kind: 'parse', detail: error.message }];
  }
  assert.ok(sourceFile);
  if (
    sourceFile.body?.length !== 3 ||
    sourceFile.body[0]?.type !== 'ImportDeclaration' ||
    sourceFile.body[1]?.type !== 'ImportDeclaration' ||
    sourceFile.body[2]?.type !== 'ExportNamedDeclaration' ||
    sourceFile.body[2]?.declaration?.type !== 'VariableDeclaration' ||
    sourceFile.body[2].declaration.kind !== 'const' ||
    sourceFile.body[2].declaration.declarations?.length !== 1
  ) {
    violations.push({ kind: 'copy-wrapper-or-extra-runtime' });
  }
  if (
    analysis.imports.length !== 2 ||
    analysis.imports[0]?.specifier !== '../chest_mode_policy.js' ||
    analysis.imports[0]?.syntax !== 'static-import' ||
    JSON.stringify(analysis.imports[0]?.importedSymbols) !== JSON.stringify(['CHEST_MODE_DIMENSIONS']) ||
    analysis.imports[1]?.specifier !== './legacy_dimension_number_view.js' ||
    analysis.imports[1]?.syntax !== 'static-import' ||
    JSON.stringify(analysis.imports[1]?.importedSymbols) !== JSON.stringify(['legacyDimensionNumberView'])
  ) {
    violations.push({ kind: 'owner-dependencies' });
  }
  const exports = collectNamedModuleExports(compatibilityRel, source);
  if (
    exports.length !== 1 ||
    exports[0]?.exportedName !== 'CHEST_MODE_DIMENSIONS' ||
    exports[0]?.kind !== 'value'
  ) {
    violations.push({ kind: 'compatibility-surface' });
  }
  const declaration = sourceFile.body?.[2]?.declaration?.declarations?.[0] ?? null;
  if (
    declaration?.init?.type !== 'CallExpression' ||
    declaration.init.callee?.name !== 'legacyDimensionNumberView' ||
    declaration.init.arguments?.length !== 1 ||
    declaration.init.arguments[0]?.name !== 'CHEST_MODE_DIMENSIONS_OWNER'
  ) {
    violations.push({ kind: 'direct-identity-cast' });
  }
  if (
    /Object\.(?:freeze|assign)|\.bind\s*\(|\b(?:Proxy|structuredClone)\b|\.\.\.|=>|\bfunction\b/u.test(source)
  ) {
    violations.push({ kind: 'copy-wrapper-or-extra-runtime' });
  }
  return violations;
}

function assertRejected(violations, kind, label) {
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('CHEST compatibility helper and owner are exact identity-only type adaptations', () => {
  assert.deepEqual(inspectHelper(read(helperRel)), []);
  assert.deepEqual(inspectCompatibility(read(compatibilityRel)), []);

  const loader = createTsRuntimeModuleLoader();
  const owner = loader.load(path.join(root, ownerRel));
  const compatibility = loader.load(path.join(root, compatibilityRel));
  assert.strictEqual(compatibility.CHEST_MODE_DIMENSIONS, owner.CHEST_MODE_DIMENSIONS);
  assert.equal(Object.isFrozen(compatibility.CHEST_MODE_DIMENSIONS), true);
  assert.deepEqual(Object.keys(compatibility.CHEST_MODE_DIMENSIONS), [
    'activeDefaults',
    'commode',
    'drawerBox',
    'dimensionGuideSideOffsetM',
    'dimensionGuideTopOffsetM',
    'dimensionGuideTextScale',
  ]);
});

test('CHEST compatibility owner has only facade and Runtime consumers and its helper stays private', () => {
  assert.deepEqual(collectConsumers(compatibilityRel), [
    {
      file: runtimeRel,
      kind: 'value',
      syntax: 'static-re-export',
      symbols: ['CHEST_MODE_DIMENSIONS'],
    },
    {
      file: facadeRel,
      kind: 'value',
      syntax: 'static-import',
      symbols: ['CHEST_MODE_DIMENSIONS'],
    },
  ]);
  assert.deepEqual(collectConsumers(helperRel), [
    {
      file: compatibilityRel,
      kind: 'value',
      syntax: 'static-import',
      symbols: ['legacyDimensionNumberView'],
    },
  ]);
  for (const rel of [facadeRel, 'esm/native/features/dimensions/index.ts', runtimeRel]) {
    const exported = new Set(collectNamedModuleExports(rel, read(rel)).map(entry => entry.exportedName));
    assert.equal(exported.has('legacyDimensionNumberView'), false, rel);
    assert.equal(exported.has('LegacyDimensionNumberView'), false, rel);
  }
});

test('CHEST compatibility target resolution rejects alias, absolute, extensionless, query, and index routes', () => {
  const runtimeAbsolute = path.join(root, runtimeRel);
  const compatibilityTarget = canonicalModuleTarget(path.join(root, compatibilityRel));
  for (const specifier of [
    '../../shared/dimensions/compatibility/chest_mode_dimensions_compatibility.js',
    '../../shared/dimensions/compatibility/chest_mode_dimensions_compatibility',
    '@/shared/dimensions/compatibility/chest_mode_dimensions_compatibility.ts?raw',
    '/esm/shared/dimensions/compatibility/chest_mode_dimensions_compatibility.js#compat',
  ]) {
    assert.equal(resolveModuleTarget(runtimeAbsolute, specifier), compatibilityTarget, specifier);
  }
  assert.equal(
    resolveModuleTarget(runtimeAbsolute, '../features/dimensions'),
    canonicalModuleTarget(path.join(root, 'esm/native/features/dimensions/index.ts'))
  );
});

test('CHEST facade, Runtime, and Services declarations preserve the frozen legacy number view', () => {
  const snapshot = JSON.parse(read(semanticSnapshotRel));
  const chest = snapshot.symbols.find(entry => entry.name === 'CHEST_MODE_DIMENSIONS');
  assert.equal(chest.surfaces.runtime.sourceFile, compatibilityRel);
  assert.equal(
    chest.surfaces.runtime.declarationTypeFingerprint,
    chest.surfaces.facade.declarationTypeFingerprint
  );
  assert.equal(
    chest.surfaces.servicesBase.declarationTypeFingerprint,
    chest.surfaces.facade.declarationTypeFingerprint
  );
  assert.equal(
    chest.surfaces.servicesEntry.declarationTypeFingerprint,
    chest.surfaces.facade.declarationTypeFingerprint
  );
  assert.notEqual(
    chest.canonicalOwner[0].declarationTypeFingerprint,
    chest.surfaces.facade.declarationTypeFingerprint
  );
});

test('CHEST compatibility mutations reject clone, wrapper, bind, wrong owner, and public helper drift', () => {
  const compatibility = read(compatibilityRel);
  assertRejected(
    inspectCompatibility(
      compatibility.replace(
        'legacyDimensionNumberView(CHEST_MODE_DIMENSIONS_OWNER)',
        'legacyDimensionNumberView({ ...CHEST_MODE_DIMENSIONS_OWNER })'
      )
    ),
    'direct-identity-cast',
    'clone'
  );
  assertRejected(
    inspectCompatibility(
      compatibility.replace(
        'legacyDimensionNumberView(CHEST_MODE_DIMENSIONS_OWNER)',
        'legacyDimensionNumberView(() => CHEST_MODE_DIMENSIONS_OWNER)'
      )
    ),
    'direct-identity-cast',
    'wrapper'
  );
  assertRejected(
    inspectCompatibility(
      compatibility.replace('CHEST_MODE_DIMENSIONS_OWNER);', 'CHEST_MODE_DIMENSIONS_OWNER.bind(null));')
    ),
    'direct-identity-cast',
    'bind'
  );
  assertRejected(
    inspectCompatibility(compatibility.replace('../chest_mode_policy.js', '../product_limits.js')),
    'owner-dependencies',
    'wrong owner'
  );
  const helper = read(helperRel);
  assertRejected(
    inspectHelper(`${helper}\nexport const PUBLIC_HELPER = legacyDimensionNumberView;\n`),
    'helper-surface',
    'public helper'
  );
  assertRejected(
    inspectHelper(helper.replace('  return value as', '  console.log(value);\n  return value as')),
    'helper-runtime-work',
    'helper side effect'
  );
  assertRejected(
    inspectCompatibility(`${compatibility}\nconsole.log(CHEST_MODE_DIMENSIONS);\n`),
    'copy-wrapper-or-extra-runtime',
    'compatibility side effect'
  );
});
