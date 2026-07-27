import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/data/preset_models_data.ts';
const ownerSpecifier = '../../shared/dimensions/preset_models_dimension_defaults_policy.js';
const facadeSpecifier = '../../shared/wardrobe_dimension_tokens_shared.js';
const publicBarrelSpecifier = '../features/dimensions/index.js';
const policySymbol = 'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY';
const rawMarker = '// Built-in saved-model presets are stored as current-schema project snapshots.';
const rawTailSha256 = '3a69155424cca6cfa2d6b40e209989b750e97bf22d66284ed8a98975a7e86b32';
const rawSemanticSha256 = '41420b1975124247e0ad27a6818486cddd03d86bd1939fb59851839df4df6c6e';
const expectedRecordIds = Object.freeze([
  'model_1765891752929',
  'model_1765891929674',
  'model_1765891980024',
  'model_1765892012624',
  'model_1765926345217',
  'model_1781596821429',
]);
const expectedFields = Object.freeze([
  'hingedDoorsCount',
  'hingedDepthCm',
  'hingedPerDoorWidthCm',
  'wardrobeHeightCm',
  'cornerWidthCm',
  'cornerDoorsCount',
  'chestDrawersCount',
  'libraryPresetDoorsCount',
  'libraryPresetModuleDoorsCount',
  'stackSplitLowerHeightCm',
]);
const expectedPreludeConsts = Object.freeze([
  'PRESET_4_DOORS_COUNT',
  'PRESET_5_DOORS_COUNT',
  'PRESET_6_DOORS_COUNT',
  'PRESET_SINGLE_DOOR_COUNT',
  'PRESET_MODULE_DOORS_COUNT',
  'PRESET_HEIGHT_CM',
  'PRESET_DEPTH_CM',
  'PRESET_CORNER_WIDTH_CM',
  'PRESET_CORNER_DOORS_COUNT',
  'PRESET_CHEST_DRAWERS_COUNT',
  'PRESET_STACK_SPLIT_LOWER_HEIGHT_CM',
]);
const expectedDirectMappings = Object.freeze({
  PRESET_4_DOORS_COUNT: 'hingedDoorsCount',
  PRESET_6_DOORS_COUNT: 'libraryPresetDoorsCount',
  PRESET_MODULE_DOORS_COUNT: 'libraryPresetModuleDoorsCount',
  PRESET_HEIGHT_CM: 'wardrobeHeightCm',
  PRESET_DEPTH_CM: 'hingedDepthCm',
  PRESET_CORNER_WIDTH_CM: 'cornerWidthCm',
  PRESET_CORNER_DOORS_COUNT: 'cornerDoorsCount',
  PRESET_CHEST_DRAWERS_COUNT: 'chestDrawersCount',
  PRESET_STACK_SPLIT_LOWER_HEIGHT_CM: 'stackSplitLowerHeightCm',
});
const forbiddenLegacyNames = new Set([
  'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  'LIBRARY_PRESET_DIMENSIONS',
  'WARDROBE_DEFAULTS',
  'HINGED_PRESET_DIMENSIONS',
]);

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');

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

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed) return identifierName(node.property);
  return node.property?.type === 'Literal' && typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function findVariable(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, node => {
    if (!found && node?.type === 'VariableDeclarator' && identifierName(node.id) === name) found = node;
  });
  return found;
}

function topLevelDeclaration(statement) {
  if (statement?.type === 'ExportNamedDeclaration') return statement.declaration;
  return statement;
}

function statementContainsVariable(statement, name) {
  const declaration = topLevelDeclaration(statement);
  return (
    declaration?.type === 'VariableDeclaration' &&
    (declaration.declarations ?? []).some(entry => identifierName(entry.id) === name)
  );
}

function normalizeTypeAnnotation(source, node) {
  if (!node) return null;
  return source.slice(node.start, node.end).replace(/^:\s*/u, '').replace(/\s+/gu, ' ').trim();
}

function isImportIdentifier(node) {
  const parent = node?.parent;
  return (
    parent?.type === 'ImportSpecifier' ||
    parent?.type === 'ImportDefaultSpecifier' ||
    parent?.type === 'ImportNamespaceSpecifier'
  );
}

function rawKey(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && ['string', 'number'].includes(typeof node.value)) {
    return String(node.value);
  }
  throw new Error(`Unsupported raw preset key: ${node?.type ?? 'missing'}`);
}

function rawExpressionFact(node) {
  if (node?.type === 'Identifier') return ['id', node.name];
  if (node?.type === 'Literal') {
    const kind = node.value === null ? 'null' : typeof node.value;
    return ['literal', kind, node.value];
  }
  if (node?.type === 'ArrayExpression') {
    return ['array', (node.elements ?? []).map(rawExpressionFact)];
  }
  if (node?.type === 'ObjectExpression') {
    return [
      'object',
      (node.properties ?? []).map(property => {
        if (
          property?.type !== 'Property' ||
          property.kind !== 'init' ||
          property.computed ||
          property.method ||
          property.shorthand
        ) {
          throw new Error(`Unsupported raw preset property: ${property?.type ?? 'missing'}`);
        }
        return ['property', rawKey(property.key), rawExpressionFact(property.value)];
      }),
    ];
  }
  if (node?.type === 'CallExpression') {
    return ['call', rawExpressionFact(node.callee), (node.arguments ?? []).map(rawExpressionFact)];
  }
  throw new Error(`Unsupported raw preset expression: ${node?.type ?? 'missing'}`);
}

function rawFacts(source, sourceFile) {
  const markerIndex = source.indexOf(rawMarker);
  const raw = findVariable(sourceFile, 'PRESET_MODELS_RAW');
  const initializer = raw?.init;
  const ids = [];
  if (initializer?.type === 'ArrayExpression') {
    for (const element of initializer.elements ?? []) {
      if (element?.type !== 'ObjectExpression') continue;
      const idProperty = (element.properties ?? []).find(
        property => property?.type === 'Property' && rawKey(property.key) === 'id'
      );
      ids.push(
        idProperty?.value?.type === 'Literal' && typeof idProperty.value.value === 'string'
          ? idProperty.value.value
          : null
      );
    }
  }
  return {
    markerIndex,
    tail: markerIndex >= 0 ? source.slice(markerIndex) : '',
    initializer,
    ids,
    semanticHash: initializer ? sha256(stableJson(rawExpressionFact(initializer))) : null,
  };
}

function migrationViolations(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(consumerRel, source);
  const sourceFile = createSourceFile(consumerRel, source);
  const importStatements = (sourceFile.body ?? []).filter(
    statement => statement.type === 'ImportDeclaration'
  );
  if (importStatements.length !== 1) add('import-statement-count', String(importStatements.length));
  if (analysis.unresolvedDynamicImports.length > 0 || analysis.forbiddenModuleSyntax.length > 0) {
    add('non-static-module-syntax');
  }

  const staticImports = analysis.imports.filter(dependency => dependency.syntax === 'static-import');
  if (staticImports.length !== 1) add('static-import-count', String(staticImports.length));
  for (const dependency of analysis.imports) {
    if (
      dependency.specifier === facadeSpecifier ||
      dependency.specifier.includes('wardrobe_dimension_tokens_shared')
    ) {
      add('legacy-facade', dependency.specifier);
    }
    if (
      dependency.specifier === publicBarrelSpecifier ||
      dependency.specifier.includes('/features/dimensions')
    ) {
      add('public-barrel', dependency.specifier);
    }
    if (dependency.syntax === 'dynamic-import' || dependency.kind === 'dynamic') add('dynamic-import');
    if (dependency.syntax === 'static-re-export') add('re-export');
    if (dependency.syntax !== 'static-import') continue;
    if (dependency.specifier !== ownerSpecifier) add('focused-owner-path', dependency.specifier);
    const binding = dependency.bindings[0];
    if (
      dependency.kind !== 'value' ||
      dependency.importedSymbols.length !== 1 ||
      dependency.importedSymbols[0] !== policySymbol ||
      dependency.bindings.length !== 1 ||
      binding?.importedName !== policySymbol ||
      binding?.localName !== policySymbol ||
      binding?.exportedName !== null
    ) {
      add('focused-import-shape', stableJson(dependency.bindings));
    }
    if (dependency.importedSymbols.includes('*')) add('namespace-import');
  }

  const fieldCounts = new Map(expectedFields.map(field => [field, 0]));
  walkAst(sourceFile, node => {
    if (node?.type === 'Identifier' && forbiddenLegacyNames.has(node.name)) {
      add('legacy-symbol', node.name);
    }
    if (
      node?.type === 'VariableDeclarator' &&
      node.id?.type === 'ObjectPattern' &&
      identifierName(node.init) === policySymbol
    ) {
      add('destructuring');
    }
    if (node?.type === 'SpreadElement' && identifierName(node.argument) === policySymbol) {
      add('policy-spread');
    }
    if (node?.type !== 'Identifier' || node.name !== policySymbol || isImportIdentifier(node)) return;
    const parent = node.parent;
    if (parent?.type === 'MemberExpression' && parent.object === node) {
      const field = staticMemberName(parent);
      if (parent.computed) add('computed-member', field ?? 'dynamic');
      else if (!fieldCounts.has(field)) add('unknown-field', field ?? 'missing');
      else fieldCounts.set(field, fieldCounts.get(field) + 1);
      return;
    }
    add('policy-object-escape', parent?.type ?? 'unknown');
  });
  for (const [field, count] of fieldCounts) {
    if (count !== 1) add('field-inventory', `${field}:${count}`);
  }

  const preludeConsts = [];
  const rawStatementIndex = (sourceFile.body ?? []).findIndex(statement =>
    statementContainsVariable(statement, 'PRESET_MODELS_RAW')
  );
  for (const statement of (sourceFile.body ?? []).slice(0, rawStatementIndex)) {
    const declaration = topLevelDeclaration(statement);
    if (declaration?.type !== 'VariableDeclaration') continue;
    if (declaration.kind !== 'const') add('prelude-non-const');
    for (const entry of declaration.declarations ?? []) {
      const name = identifierName(entry.id);
      if (name) preludeConsts.push(name);
      else add('prelude-binding-pattern');
    }
  }
  if (stableJson(preludeConsts) !== stableJson(expectedPreludeConsts)) {
    add('prelude-const-inventory', stableJson(preludeConsts));
  }

  for (const [name, field] of Object.entries(expectedDirectMappings)) {
    const variable = findVariable(sourceFile, name);
    if (memberPath(variable?.init) !== `${policySymbol}.${field}`) {
      add('direct-mapping', `${name}:${memberPath(variable?.init) ?? 'missing'}`);
    }
  }

  const fiveDoors = findVariable(sourceFile, 'PRESET_5_DOORS_COUNT')?.init;
  if (
    fiveDoors?.type !== 'BinaryExpression' ||
    fiveDoors.operator !== '+' ||
    identifierName(fiveDoors.left) !== 'PRESET_4_DOORS_COUNT' ||
    fiveDoors.right?.type !== 'Literal' ||
    fiveDoors.right.value !== 1
  ) {
    add('five-doors-formula');
  }
  const singleDoor = findVariable(sourceFile, 'PRESET_SINGLE_DOOR_COUNT')?.init;
  if (singleDoor?.type !== 'Literal' || singleDoor.value !== 1) add('single-door-literal');

  const preludeFunctions = (sourceFile.body ?? [])
    .slice(0, rawStatementIndex)
    .map(topLevelDeclaration)
    .filter(statement => statement?.type === 'FunctionDeclaration');
  if (preludeFunctions.length !== 1 || identifierName(preludeFunctions[0].id) !== 'presetWidthForDoors') {
    add('prelude-function-inventory');
  } else {
    const fn = preludeFunctions[0];
    const parameter = fn.params?.[0];
    const returnStatement = fn.body?.body?.[0];
    const expression = returnStatement?.type === 'ReturnStatement' ? returnStatement.argument : null;
    if (
      fn.params?.length !== 1 ||
      identifierName(parameter) !== 'doors' ||
      normalizeTypeAnnotation(source, parameter?.typeAnnotation) !== 'number' ||
      normalizeTypeAnnotation(source, fn.returnType) !== 'number' ||
      fn.body?.body?.length !== 1 ||
      expression?.type !== 'BinaryExpression' ||
      expression.operator !== '*' ||
      memberPath(expression.left) !== `${policySymbol}.hingedPerDoorWidthCm` ||
      identifierName(expression.right) !== 'doors'
    ) {
      add('width-function');
    }
  }

  const exports = collectNamedModuleExports(consumerRel, source).map(entry => [
    entry.exportedName,
    entry.kind,
  ]);
  if (stableJson(exports) !== stableJson([['PRESET_MODELS_RAW', 'value']])) {
    add('public-export-inventory', stableJson(exports));
  }

  const raw = rawFacts(source, sourceFile);
  if (raw.markerIndex < 0) add('raw-marker');
  if (sha256(raw.tail) !== rawTailSha256) add('raw-tail-hash', sha256(raw.tail));
  if (raw.semanticHash !== rawSemanticSha256) {
    add('raw-semantic-fingerprint', raw.semanticHash ?? 'missing');
  }
  if (stableJson(raw.ids) !== stableJson(expectedRecordIds)) add('raw-record-ids', stableJson(raw.ids));
  if (raw.initializer?.type !== 'ArrayExpression') add('raw-array-shape');

  return violations;
}

function replaceFocusedImport(source, replacement) {
  const pattern = new RegExp(
    `import\\s*\\{\\s*${policySymbol}\\s*,?\\s*\\}\\s*from\\s*['\"]${ownerSpecifier.replaceAll('.', '\\.')}['\"]\\s*;`,
    'u'
  );
  const mutated = source.replace(pattern, replacement);
  assert.notEqual(mutated, source, 'focused import fixture must mutate the source');
  return mutated;
}

function assertMutation(source, kind, label) {
  const violations = migrationViolations(source);
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

function assertHistoricalPresetModelsLedger(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 163);
  assert.equal(
    sha256(stableJson(migrationBudgets.slice(0, 162))),
    '6f4d890ffaf9346798e02f198f1a61c658b1f496b2640cfe5b1df8e1f8c970bc'
  );
  assert.equal(
    sha256(stableJson(migrationBudgets.slice(0, 163))),
    '8c4c04e56a8b991d81537127adc69c5dc42b4e7ed3de4fe81258a67b01ad8341'
  );
}

function syntheticFutureLedgerEntry(sequence) {
  return {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'synthetic-future-migration',
    reviewedAt: '2099-01-01',
    reviewBy: '2099-04-01',
    fromFile: `esm/native/services/future_consumer_${sequence}.ts`,
    companionImport: {
      toFile: 'esm/shared/future_owner.ts',
      kind: 'value',
      importedSymbols: [`FUTURE_POLICY_${sequence}`],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/future_facade.ts',
      kind: 'value',
      importedSymbols: [`FUTURE_FACADE_${sequence}`],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/future_dependency.ts',
      kind: 'value',
      importedSymbols: [`FUTURE_DEPENDENCY_${sequence}`],
      syntax: 'static-import',
    },
    reason: `Synthetic future Ledger entry ${sequence} for historical-prefix proof.`,
    removalCondition: `Remove synthetic future Ledger entry ${sequence} after its seam closes.`,
  };
}

test('Preset Models Data imports only the private composition owner and maps every field exactly once', () => {
  const source = read(consumerRel);
  assert.deepEqual(migrationViolations(source), []);
  assert.deepEqual(
    analyzeModuleDependencies(consumerRel, source).imports.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      exportedSymbols: dependency.exportedSymbols,
      bindings: dependency.bindings.map(binding => [
        binding.importedName,
        binding.localName,
        binding.exportedName,
      ]),
    })),
    [
      {
        specifier: ownerSpecifier,
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [policySymbol],
        exportedSymbols: [],
        bindings: [[policySymbol, policySymbol, null]],
      },
    ]
  );
});

test('Preset Models Data preserves consumer-local derivation and exact width multiplication', () => {
  const source = read(consumerRel);
  const sourceFile = createSourceFile(consumerRel, source);
  const fiveDoors = findVariable(sourceFile, 'PRESET_5_DOORS_COUNT').init;
  const singleDoor = findVariable(sourceFile, 'PRESET_SINGLE_DOOR_COUNT').init;
  let widthFunction = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'FunctionDeclaration' && identifierName(node.id) === 'presetWidthForDoors') {
      widthFunction = node;
    }
  });
  const widthExpression = widthFunction.body.body[0].argument;

  assert.equal(fiveDoors.operator, '+');
  assert.equal(identifierName(fiveDoors.left), 'PRESET_4_DOORS_COUNT');
  assert.equal(fiveDoors.right.value, 1);
  assert.equal(singleDoor.value, 1);
  assert.equal(widthExpression.operator, '*');
  assert.equal(memberPath(widthExpression.left), `${policySymbol}.hingedPerDoorWidthCm`);
  assert.equal(identifierName(widthExpression.right), 'doors');
});

test('Preset Models Data raw tail, semantic AST, record count, IDs, and order remain immutable', () => {
  const source = read(consumerRel);
  const facts = rawFacts(source, createSourceFile(consumerRel, source));
  assert.equal(facts.tail.split(/\r\n|\r|\n/u).length, 823);
  assert.equal(sha256(facts.tail), rawTailSha256);
  assert.equal(facts.semanticHash, rawSemanticSha256);
  assert.deepEqual(facts.ids, expectedRecordIds);
  assert.equal(facts.ids.length, 6);
});

test('Preset Models Data ownership mutation probes reject routes, escapes, formula drift, and raw-record drift', () => {
  const source = read(consumerRel);
  assertMutation(source.replace(ownerSpecifier, facadeSpecifier), 'legacy-facade', 'legacy facade import');
  assertMutation(
    source.replace(policySymbol, `${policySymbol} as PRESET_DEFAULTS`),
    'focused-import-shape',
    'focused import alias'
  );
  assertMutation(
    source.replace(`${ownerSpecifier}';`, `${ownerSpecifier.slice(0, -3)}';`),
    'focused-owner-path',
    'extensionless owner path'
  );
  assertMutation(source.replace(ownerSpecifier, publicBarrelSpecifier), 'public-barrel', 'public barrel');
  assertMutation(
    replaceFocusedImport(source, `import * as PRESET_DEFAULTS from '${ownerSpecifier}';`),
    'namespace-import',
    'namespace import'
  );
  assertMutation(`${source}\nvoid import('${ownerSpecifier}');\n`, 'dynamic-import', 'dynamic import');
  assertMutation(
    source.replace(
      'const PRESET_4_DOORS_COUNT = PRESET_MODELS_DIMENSION_DEFAULTS_POLICY.hingedDoorsCount;',
      'const presetDefaults = PRESET_MODELS_DIMENSION_DEFAULTS_POLICY;\nconst PRESET_4_DOORS_COUNT = presetDefaults.hingedDoorsCount;'
    ),
    'policy-object-escape',
    'policy-object alias'
  );
  assertMutation(
    source.replace(
      'const PRESET_4_DOORS_COUNT = PRESET_MODELS_DIMENSION_DEFAULTS_POLICY.hingedDoorsCount;',
      'const { hingedDoorsCount } = PRESET_MODELS_DIMENSION_DEFAULTS_POLICY;\nconst PRESET_4_DOORS_COUNT = hingedDoorsCount;'
    ),
    'destructuring',
    'policy destructuring'
  );
  assertMutation(
    source.replace('.hingedDoorsCount', "['hingedDoorsCount']"),
    'computed-member',
    'computed member access'
  );
  assertMutation(
    source.replace('.hingedDoorsCount', '.unknownDoorsCount'),
    'unknown-field',
    'wrong owner field'
  );
  assertMutation(
    source.replace('.wardrobeHeightCm', '.hingedDepthCm'),
    'field-inventory',
    'missing owner field'
  );
  assertMutation(
    source.replace('.hingedDepthCm', '.hingedDoorsCount'),
    'field-inventory',
    'duplicate owner field use'
  );
  assertMutation(
    source.replace('PRESET_4_DOORS_COUNT + 1', 'PRESET_4_DOORS_COUNT + 2'),
    'five-doors-formula',
    'five-door derivation drift'
  );
  assertMutation(
    source.replace('const PRESET_SINGLE_DOOR_COUNT = 1;', 'const PRESET_SINGLE_DOOR_COUNT = 2;'),
    'single-door-literal',
    'single-door literal drift'
  );
  assertMutation(
    source.replace(
      'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY.hingedPerDoorWidthCm * doors',
      'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY.hingedPerDoorWidthCm + doors'
    ),
    'width-function',
    'width multiplication drift'
  );
  const rawMutation = source.replace("name: '⭐ 017'", "name: '⭐ 017 changed'");
  assertMutation(rawMutation, 'raw-tail-hash', 'raw preset record drift');
  assertMutation(rawMutation, 'raw-semantic-fingerprint', 'raw preset semantic drift');
});

test('Preset Models Data migration preserves its historical Ledger prefixes', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assertHistoricalPresetModelsLedger(baseline.migrationBudgets);
});

test('Preset Models Data historical Ledger proof accepts future entries 164 and 165', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const historicalPrefix163 = structuredClone(baseline.migrationBudgets.slice(0, 163));
  const prefix162Hash = sha256(stableJson(historicalPrefix163.slice(0, 162)));
  const prefix163Hash = sha256(stableJson(historicalPrefix163.slice(0, 163)));
  const withFutureEntry = [...historicalPrefix163, syntheticFutureLedgerEntry(164)];
  const withTwoFutureEntries = [...withFutureEntry, syntheticFutureLedgerEntry(165)];

  assert.equal(historicalPrefix163.length, 163);
  assert.equal(withFutureEntry.length, 164);
  assert.equal(withTwoFutureEntries.length, 165);
  assert.equal(sha256(stableJson(withFutureEntry.slice(0, 162))), prefix162Hash);
  assert.equal(sha256(stableJson(withFutureEntry.slice(0, 163))), prefix163Hash);
  assert.equal(sha256(stableJson(withTwoFutureEntries.slice(0, 162))), prefix162Hash);
  assert.equal(sha256(stableJson(withTwoFutureEntries.slice(0, 163))), prefix163Hash);
  assert.doesNotThrow(() => assertHistoricalPresetModelsLedger(withFutureEntry));
  assert.doesNotThrow(() => assertHistoricalPresetModelsLedger(withTwoFutureEntries));
});

test('Preset Models Data historical Ledger proof rejects Prefix 162 or Prefix 163 mutation', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const historicalPrefix163 = structuredClone(baseline.migrationBudgets.slice(0, 163));
  const mutatedPrefix162 = structuredClone(historicalPrefix163);
  const mutatedPrefix163 = structuredClone(historicalPrefix163);

  mutatedPrefix162[161].reason = `${mutatedPrefix162[161].reason} mutated`;
  mutatedPrefix163[162].reason = `${mutatedPrefix163[162].reason} mutated`;

  assert.throws(() => assertHistoricalPresetModelsLedger(mutatedPrefix162), assert.AssertionError);
  assert.throws(() => assertHistoricalPresetModelsLedger(mutatedPrefix163), assert.AssertionError);
});
