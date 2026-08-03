import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/wardrobe_dimension_guide_policy.ts';
const ownerSymbol = 'WARDROBE_DIMENSION_GUIDE_POLICY';
const compatibilitySymbol = 'WARDROBE_DIMENSION_GUIDE_DIMENSIONS';
const initializerSha256 = '5c23d1d4ea81ab8735b9214d73d1b6bfbe7eec9ed5ad6a7165a0381a486a811d';
const renderConsumerRels = Object.freeze([
  'esm/native/builder/render_dimension_ops_corner.ts',
  'esm/native/builder/render_dimension_ops_main.ts',
  'esm/native/builder/render_dimension_ops_shared.ts',
]);

const expectedFlowSemanticHashes = Object.freeze({
  'esm/native/builder/render_dimension_ops_shared.ts':
    '0f92262600a23bdd4f78dde4dccd0704e81da386236b3777257893c2d5f5f5f2',
  'esm/native/builder/render_dimension_ops_main.ts':
    'a907a2edf5466ca546e80207c6462e470c2823766f2c79d912e41c0305dbedef',
  'esm/native/builder/render_dimension_ops_corner.ts':
    '7b29f74676f0b12eb7e7970de616a6520ac23494570466cddca3f082df59d293',
});

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);

const expectedValues = Object.freeze({
  textScale: Object.freeze({
    total: 1,
    cell: 0.78,
    cornerTotal: 0.9,
  }),
  verticalPlacement: Object.freeze({
    totalYOffsetWithCorniceM: 0.28,
    totalYOffsetWithoutCorniceM: 0.23,
    cellYOffsetWithCorniceM: 0.2,
    cellYOffsetWithoutCorniceM: 0.15,
  }),
  main: Object.freeze({
    totalWidthTextYOffsetM: 0.1,
    cellWidthTextYOffsetM: 0.07,
    heightLineOffsetM: 0.3,
    stackSplitHeightLineOffsetM: 0.54,
    heightTextOffsetM: 0.1,
    cellHeightLineDeltaM: 0.12,
    stackSplitCellHeightLineDeltaM: 0.24,
    cellHeightTextOffsetM: 0.08,
    cellHeightLabelYOffsetM: -0.26,
    depthLineOffsetXM: 0.24,
    depthTextOffsetXM: 0.2,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    smallDepthLineOffsetXM: 0.16,
    smallDepthTextOffsetXM: 0.18,
    smallDepthStartYOffsetM: 0.57,
    smallDepthEndYOffsetM: 0.37,
    minDistinctDepthDeltaCm: 1,
  }),
  corner: Object.freeze({
    connectorWallMinLengthM: 0.05,
    expandedWidthEpsilonM: 0.01,
    expandedWidthYOffsetM: 0.12,
    expandedWidthTextYOffsetM: 0.1,
    wingMinLengthM: 0.01,
    wingTotalTextYOffsetM: 0.1,
    wingCellTextYOffsetM: 0.07,
    connectorDepthMidRatio: 0.55,
    connectorDepthInsetM: 0.08,
    connectorDepthMinM: 0.2,
    connectorHeightLineRatio: 0.55,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    depthTextOffsetZM: 0.28,
    heightTextOffsetZM: 0.46,
    wingHeightLineRatio: 0.55,
  }),
});

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

function listSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) listSourceFiles(absolute, files);
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files.sort();
}

function relativePath(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const object = memberPath(node.object);
  const property = node.computed
    ? node.property?.type === 'Literal'
      ? node.property.value
      : null
    : identifierName(node.property);
  return object && typeof property === 'string' ? `${object}.${property}` : null;
}

function memberRootIdentifier(node) {
  let current = node;
  while (current?.type === 'MemberExpression') current = current.object;
  return current?.type === 'Identifier' ? current.name : null;
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

function semanticAstNode(node) {
  const pathValue = memberPath(node);
  if (pathValue?.startsWith(`${compatibilitySymbol}.`)) {
    return {
      type: 'SemanticMember',
      path: pathValue.replace(compatibilitySymbol, ownerSymbol),
    };
  }
  if (pathValue?.startsWith(`${ownerSymbol}.`)) {
    return { type: 'SemanticMember', path: pathValue };
  }
  if (pathValue === 'WARDROBE_DEFAULTS.corner.doorsCount') {
    return { type: 'SemanticMember', path: 'DEFAULT_CORNER_DOORS' };
  }
  if (node?.type === 'Identifier' && [compatibilitySymbol, ownerSymbol].includes(node.name)) {
    return { type: 'Identifier', name: ownerSymbol };
  }
  if (node?.type === 'Identifier' && node.name === 'DEFAULT_CORNER_DOORS') {
    return { type: 'SemanticMember', path: 'DEFAULT_CORNER_DOORS' };
  }
  return null;
}

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  const semantic = semanticAstNode(value);
  if (semantic) return semantic;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => canonicalSemanticAst(item, seen));

  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalSemanticAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function renderFlowSemanticHash(rel, source) {
  const sourceFile = createSourceFile(rel, source);
  const nonImportBody = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  return sha256(stableJson(canonicalSemanticAst(nonImportBody)));
}

function exportedConstDeclarator(sourceFile, symbol) {
  for (const statement of sourceFile.body ?? []) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'VariableDeclaration' ||
      statement.declaration.kind !== 'const'
    ) {
      continue;
    }
    for (const declarator of statement.declaration.declarations ?? []) {
      if (identifierName(declarator.id) === symbol) return { statement, declarator };
    }
  }
  return null;
}

function frozenObject(node) {
  if (
    node?.type !== 'CallExpression' ||
    memberPath(node.callee) !== 'Object.freeze' ||
    node.arguments?.length !== 1 ||
    node.arguments[0]?.type !== 'ObjectExpression'
  ) {
    return null;
  }
  return node.arguments[0];
}

function numericValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'number') return node.value;
  if (
    node?.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument?.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }
  return null;
}

function frozenObjectFacts(node, violations, pathPrefix = ownerSymbol) {
  const objectExpression = frozenObject(node);
  if (!objectExpression) {
    violations.push({ kind: 'owner-freeze-shape', path: pathPrefix });
    return { keys: [], value: null };
  }

  const keys = [];
  const value = {};
  for (const property of objectExpression.properties ?? []) {
    if (
      property?.type !== 'Property' ||
      property.kind !== 'init' ||
      property.computed ||
      property.method ||
      property.shorthand ||
      property.type === 'SpreadElement'
    ) {
      violations.push({ kind: 'owner-property-shape', path: pathPrefix });
      continue;
    }
    const key = identifierName(property.key);
    if (!key) {
      violations.push({ kind: 'owner-property-key', path: pathPrefix });
      continue;
    }
    keys.push(key);
    const number = numericValue(property.value);
    if (number !== null) {
      value[key] = number;
      continue;
    }
    const nested = frozenObjectFacts(property.value, violations, `${pathPrefix}.${key}`);
    value[key] = nested.value;
  }
  return { keys, value };
}

function addViolation(violations, kind, detail = '') {
  violations.push({ kind, detail });
}

function inspectOwner(source) {
  const violations = [];
  const normalizedSource = source.replaceAll('\r\n', '\n');
  const sourceFile = createSourceFile(ownerRel, normalizedSource);
  const body = sourceFile.body ?? [];
  const analysis = analyzeModuleDependencies(ownerRel, normalizedSource);
  const declaration = exportedConstDeclarator(sourceFile, ownerSymbol);

  if (body.length !== 1 || body[0] !== declaration?.statement) {
    addViolation(violations, 'owner-top-level-topology');
  }
  if (
    analysis.imports.length !== 0 ||
    analysis.unresolvedDynamicImports.length !== 0 ||
    analysis.forbiddenModuleSyntax.length !== 0
  ) {
    addViolation(violations, 'owner-dependency-free');
  }
  if (
    declaration?.statement.declaration.declarations?.length !== 1 ||
    declaration.declarator.id?.type !== 'Identifier' ||
    declaration.declarator.id.name !== ownerSymbol ||
    declaration.declarator.id.typeAnnotation ||
    declaration.declarator.id.optional ||
    declaration.declarator.id.definite
  ) {
    addViolation(violations, 'owner-export-declaration');
  }

  const exportInventory = collectNamedModuleExports(ownerRel, normalizedSource).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
    localName: entry.localName,
    source: entry.source,
  }));
  if (
    stableJson(exportInventory) !==
    stableJson([
      {
        exportedName: ownerSymbol,
        kind: 'value',
        localName: ownerSymbol,
        source: null,
      },
    ])
  ) {
    addViolation(violations, 'owner-export-inventory', stableJson(exportInventory));
  }

  const initializer = declaration?.declarator.init;
  if (
    !initializer ||
    sha256(normalizedSource.slice(initializer.start, initializer.end)) !== initializerSha256
  ) {
    addViolation(violations, 'owner-initializer-fingerprint');
  }
  const facts = frozenObjectFacts(initializer, violations);
  if (stableJson(facts.value) !== stableJson(expectedValues)) {
    addViolation(violations, 'owner-literal-inventory', stableJson(facts.value));
  }
  if (
    stableJson(facts.keys) !== stableJson(Object.keys(expectedValues)) ||
    Object.keys(expectedValues).some(
      key =>
        stableJson(
          frozenObjectFacts(
            frozenObject(initializer)?.properties?.find(property => identifierName(property.key) === key)
              ?.value,
            [],
            `${ownerSymbol}.${key}`
          ).keys
        ) !== stableJson(Object.keys(expectedValues[key]))
    )
  ) {
    addViolation(violations, 'owner-key-order');
  }

  let freezeCalls = 0;
  let objectExpressions = 0;
  let unsupportedWrapper = false;
  walkAst(sourceFile, node => {
    if (node?.type === 'CallExpression') {
      if (memberPath(node.callee) === 'Object.freeze') freezeCalls += 1;
      else unsupportedWrapper = true;
    }
    if (node?.type === 'ObjectExpression') objectExpressions += 1;
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ExportDefaultDeclaration' ||
      node?.type === 'TSAsExpression' ||
      node?.type === 'TSSatisfiesExpression' ||
      node?.type === 'TSTypeAssertion'
    ) {
      unsupportedWrapper = true;
    }
  });
  if (freezeCalls !== 5 || objectExpressions !== 5) {
    addViolation(violations, 'owner-freeze-count', `${freezeCalls}/${objectExpressions}`);
  }
  if (unsupportedWrapper) addViolation(violations, 'owner-wrapper-or-spread');

  const negativeLabelProperty = frozenObject(initializer)
    ?.properties?.find(property => identifierName(property.key) === 'main')
    ?.value?.arguments?.[0]?.properties?.find(
      property => identifierName(property.key) === 'cellHeightLabelYOffsetM'
    );
  if (
    negativeLabelProperty?.value?.type !== 'UnaryExpression' ||
    negativeLabelProperty.value.operator !== '-' ||
    negativeLabelProperty.value.argument?.type !== 'Literal' ||
    negativeLabelProperty.value.argument.value !== 0.26
  ) {
    addViolation(violations, 'owner-negative-literal-shape');
  }

  return violations;
}

function dependencyFacts(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: [...dependency.importedSymbols],
    bindings: dependency.bindings.map(binding => ({
      importedName: binding.importedName,
      localName: binding.localName,
      exportedName: binding.exportedName,
    })),
  };
}

function exactNamedImport(specifier, symbol, kind = 'value', syntax = 'static-import') {
  return {
    specifier,
    kind,
    syntax,
    importedSymbols: [symbol],
    bindings: [
      {
        importedName: symbol,
        localName: symbol,
        exportedName: null,
      },
    ],
  };
}

function inspectRenderConsumer(rel, source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(rel, source);
  const facts = analysis.imports.map(dependencyFacts);
  const guideImport = exactNamedImport(
    '../../shared/dimensions/wardrobe_dimension_guide_policy.js',
    ownerSymbol
  );
  const contextTypeImport = exactNamedImport(
    './render_dimension_ops_shared.js',
    'RenderDimensionContext',
    'type',
    'type-import'
  );
  const expected =
    rel === 'esm/native/builder/render_dimension_ops_shared.ts'
      ? [
          guideImport,
          exactNamedImport('../../shared/dimensions/wardrobe_defaults.js', 'DEFAULT_CORNER_DOORS'),
          {
            specifier: '../../../types',
            kind: 'type',
            syntax: 'type-import',
            importedSymbols: ['AppContainer', 'BuilderDimensionLineScaleSpec'],
            bindings: [
              {
                importedName: 'AppContainer',
                localName: 'AppContainer',
                exportedName: null,
              },
              {
                importedName: 'BuilderDimensionLineScaleSpec',
                localName: 'BuilderDimensionLineScaleSpec',
                exportedName: null,
              },
            ],
          },
        ]
      : [guideImport, contextTypeImport];

  if (stableJson(facts) !== stableJson(expected)) {
    addViolation(violations, 'render-import-inventory', stableJson(facts));
  }
  if (analysis.unresolvedDynamicImports.length !== 0 || analysis.forbiddenModuleSyntax.length !== 0) {
    addViolation(violations, 'render-dynamic-or-forbidden-import');
  }
  if (source.includes(compatibilitySymbol) || source.includes('wardrobe_dimension_tokens_shared')) {
    addViolation(violations, 'render-compatibility-route');
  }

  const sourceFile = createSourceFile(rel, source);
  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression' && node.computed && memberRootIdentifier(node) === ownerSymbol) {
      addViolation(violations, 'render-computed-owner-access', memberPath(node));
    }
  });

  if (rel === 'esm/native/builder/render_dimension_ops_shared.ts') {
    let scalarReferences = 0;
    for (const statement of sourceFile.body ?? []) {
      if (statement.type === 'ImportDeclaration') continue;
      walkAst(statement, node => {
        if (node?.type === 'Identifier' && node.name === 'DEFAULT_CORNER_DOORS') {
          scalarReferences += 1;
        }
      });
    }
    if (scalarReferences !== 2 || source.includes('WARDROBE_DEFAULTS')) {
      addViolation(violations, 'shared-corner-default-scalar', String(scalarReferences));
    }
  }

  return violations;
}

function assertRejected(inspect, source, kind, label) {
  const violations = inspect(source);
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('Wardrobe Dimension Guide owner preserves the exact inline initializer, key order, literals, and freezes', () => {
  const ownerFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'wardrobe_dimension_guide_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  assert.deepEqual(inspectOwner(read(ownerRel)), []);
});

test('render flow semantic AST fingerprints preserve formulas, offsets, branches, types, and call order', () => {
  for (const rel of renderConsumerRels) {
    assert.equal(renderFlowSemanticHash(rel, read(rel)), expectedFlowSemanticHashes[rel], rel);
  }
});

test('owner mutation probes reject literal, order, freeze, dependency, export, spread, and side-effect drift', () => {
  const source = read(ownerRel);
  assertRejected(
    inspectOwner,
    source.replace('    cell: 0.78,', '    cell: 0.79,'),
    'owner-initializer-fingerprint',
    'literal drift'
  );
  assertRejected(
    inspectOwner,
    source.replace('    total: 1,\n    cell: 0.78,', '    cell: 0.78,\n    total: 1,'),
    'owner-key-order',
    'nested key reorder'
  );
  assertRejected(
    inspectOwner,
    source.replace('textScale: Object.freeze({', 'textScale: ({'),
    'owner-freeze-shape',
    'nested freeze removal'
  );
  assertRejected(
    inspectOwner,
    source.replace(`export const ${ownerSymbol} = Object.freeze({`, `export const ${ownerSymbol} = ({`),
    'owner-freeze-shape',
    'root freeze removal'
  );
  assertRejected(
    inspectOwner,
    `import { cmToM } from './units.js';\n${source}`,
    'owner-dependency-free',
    'owner dependency'
  );
  assertRejected(
    inspectOwner,
    `${source}\nexport default ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'default export'
  );
  assertRejected(
    inspectOwner,
    source.replace('  textScale: Object.freeze({', '  ...{},\n  textScale: Object.freeze({'),
    'owner-wrapper-or-spread',
    'owner spread'
  );
  assertRejected(
    inspectOwner,
    `${source}\nregisterDimensionGuide(${ownerSymbol});\n`,
    'owner-top-level-topology',
    'owner side effect'
  );
});

test('render flow mutation probes reject formula, branch, literal, aggregate, and wrapper drift', () => {
  const sharedRel = 'esm/native/builder/render_dimension_ops_shared.ts';
  const mainRel = 'esm/native/builder/render_dimension_ops_main.ts';
  const cornerRel = 'esm/native/builder/render_dimension_ops_corner.ts';
  const shared = read(sharedRel);
  const main = read(mainRel);
  const corner = read(cornerRel);

  assert.notEqual(
    renderFlowSemanticHash(sharedRel, shared.replace('Math.max(0, Math.round(', 'Math.min(0, Math.round(')),
    expectedFlowSemanticHashes[sharedRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(
      mainRel,
      main.replace(
        '!noMainWardrobe || hasActiveCornerConnector',
        '!noMainWardrobe && hasActiveCornerConnector'
      )
    ),
    expectedFlowSemanticHashes[mainRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(
      cornerRel,
      corner.replace(
        'cornerWingVisible && !!wingGeometry && wingGeometry.wingW',
        'cornerWingVisible || !!wingGeometry || wingGeometry.wingW'
      )
    ),
    expectedFlowSemanticHashes[cornerRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(cornerRel, corner.replace('fullWm * 100', 'fullWm * 101')),
    expectedFlowSemanticHashes[cornerRel]
  );

  assertRejected(
    inspectRenderConsumer.bind(null, sharedRel),
    shared.replace('    : DEFAULT_CORNER_DOORS;', '    : 3;'),
    'shared-corner-default-scalar',
    'corner default literal'
  );
  assert.notEqual(
    renderFlowSemanticHash(
      sharedRel,
      shared.replace(
        'const cornerWingDoorCountRaw = isCornerMode',
        `const guideWrapper = { ...${ownerSymbol} };\n  const cornerWingDoorCountRaw = isCornerMode`
      )
    ),
    expectedFlowSemanticHashes[sharedRel]
  );
  assertRejected(
    inspectRenderConsumer.bind(null, sharedRel),
    shared.replace(
      "import { DEFAULT_CORNER_DOORS } from '../../shared/dimensions/wardrobe_defaults.js';",
      "import { WARDROBE_DEFAULTS } from '../../shared/dimensions/wardrobe_defaults.js';"
    ),
    'render-import-inventory',
    'aggregate defaults import'
  );
});
