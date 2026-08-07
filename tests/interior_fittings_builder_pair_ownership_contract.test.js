import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const storageOwnerRel = 'esm/shared/dimensions/interior_storage_policy.ts';
const fittingsOwnerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const aggregateOwnerSymbols = new Set([
  'INTERIOR_FITTINGS_POLICY',
  'INTERIOR_PRESET_POLICY',
  'INTERIOR_ROD_POLICY',
  'INTERIOR_STORAGE_POLICY',
]);
const focusedOwnerSymbols = new Set([
  'INTERIOR_PRESET_ROD_FACTORS_POLICY',
  'INTERIOR_PRESET_SHELF_ROWS_POLICY',
  'INTERIOR_ROD_PLACEMENT_POLICY',
  'INTERIOR_STORAGE_BARRIER_POLICY',
  'INTERIOR_STORAGE_GRID_POLICY',
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const consumers = Object.freeze([
  Object.freeze({
    rel: 'esm/native/builder/core_storage_compute_custom.ts',
    imports: Object.freeze([
      Object.freeze({
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        ownerRel: storageOwnerRel,
        symbols: Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY']),
      }),
      Object.freeze({
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        ownerRel: fittingsOwnerRel,
        symbols: Object.freeze(['INTERIOR_ROD_PLACEMENT_POLICY']),
      }),
    ]),
    allowedOwnerAliases: Object.freeze({}),
    mappings: Object.freeze([
      Object.freeze({
        legacy: 'storage.gridDivisionsDefault',
        focused: 'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault',
        count: 2,
      }),
      Object.freeze({
        legacy: 'storage.barrierHeightM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM',
        count: 2,
      }),
      Object.freeze({
        legacy: 'storage.barrierFrontZOffsetM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM',
        count: 1,
      }),
      Object.freeze({
        legacy: 'rods.defaultYOffsetM',
        focused: 'INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM',
        count: 3,
      }),
    ]),
    numericHash: '0910e79e07cd354b029fac2cc1f5fc40e1b5580bc460ddd90a72600794d3da6a',
    functions: Object.freeze([
      Object.freeze({
        name: 'readCustomGridDivisions',
        params: Object.freeze(['value']),
        returnType: ':number',
        exported: false,
      }),
      Object.freeze({
        name: 'readOptionalCustomNumber',
        params: Object.freeze(['value']),
        returnType: ':number|null',
        exported: false,
      }),
      Object.freeze({
        name: 'writeOptionalCustomNumber',
        params: Object.freeze(['target', 'key', 'value']),
        returnType: ':void',
        exported: false,
      }),
      Object.freeze({
        name: 'computeInteriorCustomOps',
        params: Object.freeze(['customData', 'gridDivisions']),
        returnType: ':InteriorCustomOpsLike',
        exported: true,
      }),
    ]),
    functionHashes: Object.freeze({
      readCustomGridDivisions: 'fddb960a71e0f98cd91feec7178eea087a418d06cffbe93f09c12725ce1386e9',
      readOptionalCustomNumber: 'f581b967203a5a97dcf22992db5c183918f8b12982f1d6a7830d797b220f55c2',
      writeOptionalCustomNumber: '4c3f5b826a870c7f0659c7a4259bba30bcb4a39d03e6b00e909245ee8830389e',
      computeInteriorCustomOps: 'f548987cfe31d62f4ac91b56d4f043b5a6576d8ca3e171c5ce497a12b4d859fe',
    }),
  }),
  Object.freeze({
    rel: 'esm/native/builder/corner_wing_cell_layouts.ts',
    imports: Object.freeze([
      Object.freeze({
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        ownerRel: storageOwnerRel,
        symbols: Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
      }),
      Object.freeze({
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        ownerRel: fittingsOwnerRel,
        symbols: Object.freeze([
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
        ]),
      }),
    ]),
    allowedOwnerAliases: Object.freeze({
      presetRodFactors: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
      presetShelfRows: 'INTERIOR_PRESET_SHELF_ROWS_POLICY',
    }),
    mappings: Object.freeze([
      Object.freeze({
        legacy: 'storage.barrierHeightM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM',
        count: 2,
      }),
      Object.freeze({
        legacy: 'storage.barrierWidthMinM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM',
        count: 1,
      }),
      Object.freeze({
        legacy: 'storage.barrierWidthClearanceM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM',
        count: 1,
      }),
      Object.freeze({
        legacy: 'storage.barrierFrontZOffsetM',
        focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM',
        count: 1,
      }),
      Object.freeze({
        legacy: 'rods.defaultYOffsetM',
        focused: 'INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM',
        count: 2,
      }),
      Object.freeze({
        legacy: 'presets.fullShelfRows',
        focused: 'presetShelfRows.fullShelfRows',
        owner: 'INTERIOR_PRESET_SHELF_ROWS_POLICY',
        count: 3,
      }),
      Object.freeze({
        legacy: 'presets.hangingShelfRows',
        focused: 'presetShelfRows.hangingShelfRows',
        owner: 'INTERIOR_PRESET_SHELF_ROWS_POLICY',
        count: 3,
      }),
      Object.freeze({
        legacy: 'presets.splitShelfRows',
        focused: 'presetShelfRows.splitShelfRows',
        owner: 'INTERIOR_PRESET_SHELF_ROWS_POLICY',
        count: 2,
      }),
      Object.freeze({
        legacy: 'presets.mixedRodYFactor',
        focused: 'presetRodFactors.mixedRodYFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.hangingRodYFactor',
        focused: 'presetRodFactors.hangingRodYFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.splitUpperRodYFactor',
        focused: 'presetRodFactors.splitUpperRodYFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.splitUpperRodLimitFactor',
        focused: 'presetRodFactors.splitUpperRodLimitFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.splitLowerRodYFactor',
        focused: 'presetRodFactors.splitLowerRodYFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.storageRodYFactor',
        focused: 'presetRodFactors.storageRodYFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
      Object.freeze({
        legacy: 'presets.storageRodLimitFactor',
        focused: 'presetRodFactors.storageRodLimitFactor',
        owner: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        count: 1,
      }),
    ]),
    numericHash: 'fc6bc33a28abed7a5b084d4eca2d68e1feaa46d48a3df8187d4a8c1adeae5020',
    functions: Object.freeze([
      Object.freeze({
        name: 'addCornerStorageBarrier',
        params: Object.freeze(['params']),
        returnType: ':void',
        exported: false,
      }),
      Object.freeze({
        name: 'applyCornerWingCustomLayout',
        params: Object.freeze(['params']),
        returnType: ':void',
        exported: false,
      }),
      Object.freeze({
        name: 'applyCornerWingPresetLayout',
        params: Object.freeze(['params']),
        returnType: ':void',
        exported: false,
      }),
      Object.freeze({
        name: 'applyCornerWingCellLayout',
        params: Object.freeze(['params']),
        returnType: ':void',
        exported: true,
      }),
    ]),
    functionHashes: Object.freeze({
      addCornerStorageBarrier: '2fc4dc2b16d25e4234bfbdb6e66669016ff2fe5228909b769fdc93ec382c1839',
      applyCornerWingCustomLayout: '7d253ec1f7edb99b6e3634a4875de351991cff3c969c81ca75aaf311b806146d',
      applyCornerWingPresetLayout: '36d814ab6b075cf3724a851919321fd4f250f3ab8a8cb9d505d6d45dd8d13540',
      applyCornerWingCellLayout: '08704bbe684c0a8355b544f888c592203c6bc2b36d77662813edfa3417920a54',
    }),
  }),
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = identifierName(node.property);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
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
  if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const replacementExtensions = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacementExtensions.map(sourceExtension => `${stem}${sourceExtension}`));
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

const omittedAstKeys = new Set([
  'comments',
  'end',
  'innerComments',
  'leadingComments',
  'loc',
  'parent',
  'range',
  'raw',
  'start',
  'trailingComments',
]);

function canonicalAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => canonicalAst(item, seen));
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function subtreeContainsFocusedOwner(node) {
  let found = false;
  walkAst(node, child => {
    const name = identifierName(child);
    const value = memberPath(child);
    if (
      focusedOwnerSymbols.has(name) ||
      [...focusedOwnerSymbols].some(symbol => value?.startsWith(`${symbol}.`))
    ) {
      found = true;
    }
  });
  return found;
}

function inspectOwnershipViolations(file, source, consumer) {
  const violations = [];
  const analysis = analyzeModuleDependencies(file, source);
  const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
  const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));
  const expectedByTarget = new Map(
    consumer.imports.map(entry => [canonicalModuleTarget(path.join(root, entry.ownerRel)), entry])
  );

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    if (target === facadeTarget) {
      violations.push({ kind: 'legacy-facade', syntax: dependency.syntax });
      continue;
    }
    if (target === publicDimensionsTarget) {
      violations.push({ kind: 'public-dimensions-barrel', syntax: dependency.syntax });
      continue;
    }
    if (dependency.syntax === 'dynamic-import') violations.push({ kind: 'dynamic-import' });
    if (dependency.bindings.some(binding => binding.importedName === '*')) {
      violations.push({ kind: 'namespace-import', specifier: dependency.specifier });
    }
    for (const symbol of dependency.importedSymbols) {
      if (aggregateOwnerSymbols.has(symbol)) violations.push({ kind: 'aggregate-owner', symbol });
      if (focusedOwnerSymbols.has(symbol) && !expectedByTarget.has(target)) {
        violations.push({ kind: 'owner-bridge-import', symbol, specifier: dependency.specifier });
      }
    }

    const expected = expectedByTarget.get(target);
    if (!expected) continue;
    const validBindings =
      dependency.bindings.length === expected.symbols.length &&
      dependency.bindings.every(
        (binding, index) =>
          binding.importedName === expected.symbols[index] &&
          binding.localName === expected.symbols[index] &&
          binding.exportedName === null
      );
    if (
      dependency.specifier !== expected.specifier ||
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import' ||
      stableJson(dependency.importedSymbols) !== stableJson(expected.symbols) ||
      !validBindings
    ) {
      violations.push({
        kind: 'focused-import-shape',
        owner: expected.ownerRel,
        specifier: dependency.specifier,
        importedSymbols: dependency.importedSymbols,
        bindings: dependency.bindings,
      });
    }
  }

  const sourceFile = createSourceFile(file, source);
  walkAst(sourceFile, node => {
    const name = identifierName(node);
    if (name === 'INTERIOR_FITTINGS_DIMENSIONS') violations.push({ kind: 'legacy-symbol-use' });
    if (aggregateOwnerSymbols.has(name)) violations.push({ kind: 'aggregate-owner-use', symbol: name });

    if (node?.type === 'VariableDeclarator') {
      const localName = identifierName(node.id);
      const ownerName = identifierName(node.init);
      if (focusedOwnerSymbols.has(ownerName)) {
        if (consumer.allowedOwnerAliases[localName] !== ownerName) {
          violations.push({ kind: 'owner-object-alias', localName, ownerName });
        }
      }
    }

    if (node?.type === 'ObjectExpression' && subtreeContainsFocusedOwner(node)) {
      for (const property of node.properties ?? []) {
        if (property?.type !== 'Property') continue;
        const key = identifierName(property.key);
        const value = identifierName(property.value);
        if (['presets', 'rods', 'storage'].includes(key) || focusedOwnerSymbols.has(value)) {
          violations.push({ kind: 'local-aggregate', key });
        }
      }
    }

    if (node?.type === 'SpreadElement' && subtreeContainsFocusedOwner(node.argument)) {
      violations.push({ kind: 'owner-spread' });
    }
    if (node?.type === 'CallExpression') {
      const callee = memberPath(node.callee) ?? identifierName(node.callee);
      if (
        ['Object.assign', 'Object.freeze', 'structuredClone'].includes(callee) &&
        (node.arguments ?? []).some(subtreeContainsFocusedOwner)
      ) {
        violations.push({ kind: 'owner-wrapper', callee });
      }
    }
  });

  return { analysis, sourceFile, violations };
}

function sourceFacts(rel) {
  const source = read(rel);
  const sourceFile = createSourceFile(rel, source);
  const declarations = new Map();
  const memberCounts = new Map();
  const numericLiterals = [];
  const functions = [];
  const functionHashes = {};
  let opsInitializer = null;
  let storageBarrierShape = null;

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
    }
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
    if (node?.type === 'VariableDeclarator') {
      const name = identifierName(node.id);
      if (name) declarations.set(name, memberPath(node.init));
      if (name === 'ops' && node.init?.type === 'ObjectExpression') opsInitializer = node.init;
    }
    if (
      node?.type === 'AssignmentExpression' &&
      memberPath(node.left) === 'ops.storageBarrier' &&
      node.right?.type === 'ObjectExpression'
    ) {
      storageBarrierShape = node.right;
    }
    if (node?.type === 'FunctionDeclaration') {
      const name = identifierName(node.id);
      functions.push({
        name,
        params: node.params.map(identifierName),
        returnType: source.slice(node.returnType.start, node.returnType.end).replaceAll(/\s/gu, ''),
        exported: node.parent?.type === 'ExportNamedDeclaration',
      });
      functionHashes[name] = semanticSha256(canonicalAst(node));
    }
  });
  numericLiterals.sort((left, right) => left - right);
  return {
    source,
    sourceFile,
    declarations,
    memberCounts,
    numericLiterals,
    functions,
    functionHashes,
    opsInitializer,
    storageBarrierShape,
  };
}

function objectKeys(node) {
  return (node?.properties ?? []).map(property => identifierName(property.key));
}

test('Interior Fittings builder pair is exactly two production files with two exact focused-owner imports each', () => {
  assert.deepEqual(
    consumers.map(consumer => consumer.rel),
    ['esm/native/builder/core_storage_compute_custom.ts', 'esm/native/builder/corner_wing_cell_layouts.ts']
  );

  for (const consumer of consumers) {
    const absolute = path.join(root, consumer.rel);
    const inspection = inspectOwnershipViolations(absolute, read(consumer.rel), consumer);
    assert.deepEqual(inspection.violations, [], consumer.rel);
    assert.deepEqual(inspection.analysis.unresolvedDynamicImports, [], consumer.rel);
    assert.deepEqual(inspection.analysis.forbiddenModuleSyntax, [], consumer.rel);

    const focusedImports = inspection.analysis.imports.filter(dependency =>
      consumer.imports.some(
        expected =>
          resolveModuleTarget(absolute, dependency.specifier) ===
          canonicalModuleTarget(path.join(root, expected.ownerRel))
      )
    );
    assert.deepEqual(
      focusedImports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
        specifier,
        kind,
        syntax,
        importedSymbols,
        bindings,
      })),
      consumer.imports.map(expected => ({
        specifier: expected.specifier,
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [...expected.symbols],
        bindings: expected.symbols.map(symbol => ({
          importedName: symbol,
          localName: symbol,
          exportedName: null,
        })),
      })),
      consumer.rel
    );
    assert.equal(focusedImports.length, 2, consumer.rel);
    assert.doesNotMatch(read(consumer.rel), /wardrobe_dimension_tokens_shared/u, consumer.rel);
    assert.doesNotMatch(read(consumer.rel), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u, consumer.rel);
  }
});

test('Interior Fittings builder pair maps every legacy field to its exact focused policy', () => {
  for (const consumer of consumers) {
    const facts = sourceFacts(consumer.rel);
    for (const mapping of consumer.mappings) {
      assert.equal(
        facts.memberCounts.get(mapping.focused),
        mapping.count,
        `${consumer.rel}: ${mapping.legacy} -> ${mapping.owner ?? mapping.focused}`
      );
    }
  }

  const cornerFacts = sourceFacts(consumers[1].rel);
  assert.equal(cornerFacts.declarations.get('presetShelfRows'), 'INTERIOR_PRESET_SHELF_ROWS_POLICY');
  assert.equal(cornerFacts.declarations.get('presetRodFactors'), 'INTERIOR_PRESET_ROD_FACTORS_POLICY');
  assert.equal(cornerFacts.declarations.has('presetDims'), false);
});

test('Interior Fittings builder pair preserves numeric literals, function signatures, return shapes, and formulas', () => {
  for (const consumer of consumers) {
    const facts = sourceFacts(consumer.rel);
    assert.equal(
      createHash('sha256').update(JSON.stringify(facts.numericLiterals)).digest('hex'),
      consumer.numericHash,
      `${consumer.rel} numeric literal inventory`
    );
    assert.deepEqual(facts.functions, consumer.functions, `${consumer.rel} function signatures`);
    assert.deepEqual(facts.functionHashes, consumer.functionHashes, `${consumer.rel} semantic AST`);
  }

  const coreFacts = sourceFacts(consumers[0].rel);
  assert.deepEqual(objectKeys(coreFacts.opsInitializer), ['shelves', 'rods']);
  assert.deepEqual(objectKeys(coreFacts.storageBarrierShape), ['barrierH', 'zFrontOffset']);
  const coreExport = coreFacts.sourceFile.body.find(
    node =>
      node?.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'FunctionDeclaration' &&
      identifierName(node.declaration.id) === 'computeInteriorCustomOps'
  );
  assert.ok(coreExport);
  const coreLastStatement = coreExport.declaration.body.body.at(-1);
  assert.equal(coreLastStatement?.type, 'ReturnStatement');
  assert.equal(identifierName(coreLastStatement?.argument), 'ops');
  assert.match(
    coreFacts.source,
    /Math\.round\(\(rawYFactor \* gd\) \/ INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault\)/u
  );
  assert.match(
    coreFacts.source,
    /limitAdd = -\(\s*Math\.abs\(INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM\) \+\s*INTERIOR_STORAGE_BARRIER_POLICY\.barrierHeightM\s*\);/u
  );
  const shelfVariantGuard = coreExport.declaration.body.body.find(statement => {
    if (statement?.type !== 'TryStatement') return false;
    let assignsShelfVariants = false;
    walkAst(statement.block, node => {
      if (
        node?.type === 'AssignmentExpression' &&
        memberPath(node.left) === 'ops.shelfVariants' &&
        identifierName(node.right) === 'shelfVariantsByIndex'
      ) {
        assignsShelfVariants = true;
      }
    });
    return assignsShelfVariants;
  });
  assert.ok(shelfVariantGuard, 'optional shelf-variant assignment remains guarded');
  assert.equal(shelfVariantGuard.handler?.type, 'CatchClause');
  assert.deepEqual(
    shelfVariantGuard.handler?.body?.body ?? [],
    [],
    'optional shelf-variant guard catch must remain statement-free'
  );

  const cornerSource = sourceFacts(consumers[1].rel).source;
  assert.match(
    cornerSource,
    /Math\.max\(\s*INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthMinM,\s*cellW - INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthClearanceM\s*\)/u
  );
  assert.match(
    cornerSource,
    /const rodY = effectiveBottomY \+ i \* localGridStep \+ INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM;/u
  );
  assert.match(
    cornerSource,
    /effectiveBottomY \+ presetRodFactors\.splitUpperRodYFactor \* localGridStep,\s*presetRodFactors\.splitUpperRodLimitFactor \* localGridStep/u
  );
  assert.match(cornerSource, /presetRodFactors\.storageRodLimitFactor \* localGridStep - localGridStep/u);
  for (const layout of ['hanging', 'hanging_top2', 'hanging_split', 'storage', 'storage_shelf']) {
    assert.match(cornerSource, new RegExp(`case '${layout}':`, 'u'));
  }
});
