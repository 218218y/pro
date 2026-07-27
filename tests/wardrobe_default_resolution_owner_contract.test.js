import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const publicFunctions = Object.freeze([
  'normalizeWardrobeDimensionDefaultType',
  'resolveWardrobeTypeDefaults',
  'getDefaultDepthForWardrobeType',
  'getDefaultDoorsForWardrobeType',
  'getDefaultPerDoorWidthForWardrobeType',
  'resolveAutoWidthForDoors',
  'isAutoWidthForDoors',
  'getDefaultWidthForWardrobeType',
  'getDefaultHeightForWardrobeType',
  'getDefaultChestDrawersCount',
  'resolveDefaultWardrobeDimensions',
]);
const allFunctions = Object.freeze(['finiteOr', ...publicFunctions]);
const publicFunctionSet = new Set(publicFunctions);
const expectedNumericLiterals = Object.freeze([0, 0, 0, 0]);
const objectReturnType =
  '{ widthCm: number; heightCm: number; depthCm: number; doorsCount: number; perDoorWidthCm: number; }';
const expectedSignatures = Object.freeze({
  finiteOr: {
    params: [
      ['value', false, 'unknown'],
      ['defaultValue', false, 'number'],
    ],
    returnType: 'number',
  },
  normalizeWardrobeDimensionDefaultType: {
    params: [['value', false, 'unknown']],
    returnType: 'WardrobeDimensionDefaultType',
  },
  resolveWardrobeTypeDefaults: {
    params: [['value', false, 'unknown']],
    returnType: objectReturnType,
  },
  getDefaultDepthForWardrobeType: {
    params: [['value', false, 'unknown']],
    returnType: 'number',
  },
  getDefaultDoorsForWardrobeType: {
    params: [['value', false, 'unknown']],
    returnType: 'number',
  },
  getDefaultPerDoorWidthForWardrobeType: {
    params: [['value', false, 'unknown']],
    returnType: 'number',
  },
  resolveAutoWidthForDoors: {
    params: [
      ['value', false, 'unknown'],
      ['doors', false, 'unknown'],
    ],
    returnType: 'number',
  },
  isAutoWidthForDoors: {
    params: [
      ['value', false, 'unknown'],
      ['widthCm', false, 'unknown'],
      ['doors', false, 'unknown'],
    ],
    returnType: 'boolean',
  },
  getDefaultWidthForWardrobeType: {
    params: [['value', false, 'unknown']],
    returnType: 'number',
  },
  getDefaultHeightForWardrobeType: {
    params: [['value', false, 'unknown']],
    returnType: 'number',
  },
  getDefaultChestDrawersCount: {
    params: [],
    returnType: 'number',
  },
  resolveDefaultWardrobeDimensions: {
    params: [['value', false, 'unknown']],
    returnType: objectReturnType,
  },
});
const expectedFunctionHashes = Object.freeze({
  finiteOr: 'cdd81a08823cd82209f346e49b173df607c0285ac954ea6dad4b5caf7970c974',
  normalizeWardrobeDimensionDefaultType: '8ab6e94a5d96dafc66d2e98ac4f5ee7986926df212ab4cd7db1948bd070cd66f',
  resolveWardrobeTypeDefaults: 'ff3212ad39cb6fae437843315d7d94af163c64466a8ce04021a7977de8cb17c0',
  getDefaultDepthForWardrobeType: '82bdad4cc6012182bb06f6fe0dc47b6073f532ec7eac9bec4f52ae5a99ab6bc6',
  getDefaultDoorsForWardrobeType: 'e0a7dcde6a647101d754bda97889b83f8e4b2739d56757f8e97c461b6cceea0e',
  getDefaultPerDoorWidthForWardrobeType: 'ef59089e75921dc7e4e106dce5fdfa68183398f4d6002ab5ca37340e91626ba2',
  resolveAutoWidthForDoors: '7f6549aad137c24cda5157014c14340b656ba8074060391aaa93fccb038bcedf',
  isAutoWidthForDoors: 'd40231a694e197fed4961213e0720b5ca05b61dde32671a42593d4e65f65d20e',
  getDefaultWidthForWardrobeType: '9c4e6962493a2e2b0b90de6f9813724c4e3f631d478c05f75c0b9d781e5f32a8',
  getDefaultHeightForWardrobeType: 'adad73e1b520697394ce559509777a78f1aba52d3aeb75fdec65f3bac5d5cd5e',
  getDefaultChestDrawersCount: '64cd7cf180f3ae6839f11465a726b1a532467bdc7d0f1ac5a746d3cd930fa6e3',
  resolveDefaultWardrobeDimensions: 'b3aa897c0100aa86b5a1535e9150cff394e0a4a3a1810ecd345a1fe78828792f',
});
const facadeReexportPattern =
  /export\s*\{\s*normalizeWardrobeDimensionDefaultType,[\s\S]*?resolveDefaultWardrobeDimensions,\s*\}\s*from '\.\/dimensions\/wardrobe_default_resolution_policy\.js';/u;

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

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map(item => canonicalSemanticAst(item, seen));
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalSemanticAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
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

function normalizeTypeAnnotation(source, node) {
  if (!node) return null;
  return source.slice(node.start, node.end).replace(/^:\s*/u, '').replace(/\s+/gu, ' ').trim();
}

function signatureFor(source, node) {
  return {
    params: node.params.map(parameter => [
      identifierName(parameter),
      Boolean(parameter.optional),
      normalizeTypeAnnotation(source, parameter.typeAnnotation),
    ]),
    returnType: normalizeTypeAnnotation(source, node.returnType),
  };
}

function functionDeclarations(source, rel = ownerRel) {
  const sourceFile = createSourceFile(rel, source);
  const functions = new Map();
  walkAst(sourceFile, node => {
    if (node?.type === 'FunctionDeclaration') {
      functions.set(identifierName(node.id), node);
    }
  });
  return { functions, sourceFile };
}

function ownerViolations(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(ownerRel, source);
  const expectedDependencies = [
    {
      specifier: './wardrobe_defaults.js',
      kind: 'type',
      syntax: 'type-import',
      importedSymbols: ['WardrobeDimensionDefaultType'],
    },
    {
      specifier: './wardrobe_defaults.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['WARDROBE_DEFAULTS'],
    },
    {
      specifier: './wardrobe_layout_comparison_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['WARDROBE_LAYOUT_COMPARISON_POLICY'],
    },
  ];
  const dependencyInventory = analysis.imports.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: dependency.importedSymbols,
  }));
  if (stableJson(dependencyInventory) !== stableJson(expectedDependencies)) {
    add('owner-dependency-inventory', stableJson(dependencyInventory));
  }
  for (const dependency of analysis.imports) {
    if (dependency.specifier.includes('wardrobe_dimension_tokens_shared')) {
      add('owner-facade-back-edge', dependency.specifier);
    }
    for (const binding of dependency.bindings) {
      if (binding.localName !== null && binding.localName !== binding.importedName) {
        add('owner-import-alias', `${binding.importedName} as ${binding.localName}`);
      }
    }
  }
  if (analysis.unresolvedDynamicImports.length > 0 || analysis.forbiddenModuleSyntax.length > 0) {
    add('owner-non-static-dependency');
  }

  const { functions, sourceFile } = functionDeclarations(source);
  if (stableJson([...functions.keys()]) !== stableJson(allFunctions)) {
    add('owner-function-inventory', stableJson([...functions.keys()]));
  }
  const exports = collectNamedModuleExports(ownerRel, source);
  if (
    stableJson(exports.map(entry => [entry.exportedName, entry.kind])) !==
    stableJson(publicFunctions.map(name => [name, 'value']))
  ) {
    add('owner-export-inventory', stableJson(exports.map(entry => [entry.exportedName, entry.kind])));
  }
  if (exports.some(entry => entry.exportedName === 'finiteOr')) {
    add('finite-or-exported');
  }

  const numericLiterals = [];
  const strictToleranceComparisons = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') {
      numericLiterals.push(node.value);
    }
    if (node?.type === 'Identifier' && node.name === 'WARDROBE_LAYOUT_DIMENSIONS') {
      add('compatibility-layout-dimensions-use');
    }
    if (node?.type === 'BinaryExpression' && node.operator === '<=') {
      add('non-strict-tolerance-comparison');
    }
    if (
      node?.type === 'BinaryExpression' &&
      node.operator === '<' &&
      memberPath(node.right) === 'WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm'
    ) {
      strictToleranceComparisons.push(node);
    }
    if (node?.type === 'ClassDeclaration' || node?.type === 'ClassExpression') {
      add('owner-class-wrapper');
    }
    if (node?.type === 'SpreadElement') add('owner-spread');
    if (node?.type === 'CallExpression' && memberPath(node.callee) === 'Object.assign') {
      add('owner-object-assign');
    }
  });
  if (stableJson(numericLiterals) !== stableJson(expectedNumericLiterals)) {
    add('numeric-literal-inventory', stableJson(numericLiterals));
  }
  if (strictToleranceComparisons.length !== 1) {
    add('strict-tolerance-comparison-inventory', String(strictToleranceComparisons.length));
  }

  for (const name of allFunctions) {
    const node = functions.get(name);
    if (!node) continue;
    const signature = signatureFor(source, node);
    if (stableJson(signature) !== stableJson(expectedSignatures[name])) {
      add('function-signature', name);
    }
    const hash = semanticSha256(canonicalSemanticAst(node));
    if (hash !== expectedFunctionHashes[name]) {
      add('function-semantic-hash', name);
    }
  }

  const resolveDefaults = functions.get('resolveWardrobeTypeDefaults');
  if (resolveDefaults) {
    const paths = [];
    walkAst(resolveDefaults, node => {
      const value = memberPath(node);
      if (value?.startsWith('WARDROBE_DEFAULTS.')) paths.push(value);
    });
    if (
      stableJson(paths) !==
      stableJson(['WARDROBE_DEFAULTS.byType', 'WARDROBE_DEFAULTS.widthCm', 'WARDROBE_DEFAULTS.heightCm'])
    ) {
      add('wardrobe-defaults-projection', stableJson(paths));
    }
  }

  for (const statement of sourceFile.body ?? []) {
    const functionNode = statement?.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (statement?.type !== 'ImportDeclaration' && functionNode?.type !== 'FunctionDeclaration') {
      add('owner-top-level-wrapper', statement?.type ?? 'unknown');
    }
  }

  return violations;
}

function facadeViolations(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(facadeRel, source);
  const dependencies = analysis.imports.filter(dependency =>
    dependency.specifier.includes('wardrobe_default_resolution_policy')
  );
  const expectedDependency = {
    specifier: './dimensions/wardrobe_default_resolution_policy.js',
    kind: 'value',
    syntax: 'static-re-export',
    importedSymbols: publicFunctions,
    exportedSymbols: publicFunctions,
  };
  const inventory = dependencies.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: dependency.importedSymbols,
    exportedSymbols: dependency.exportedSymbols,
  }));
  if (stableJson(inventory) !== stableJson([expectedDependency])) {
    add('facade-direct-re-export-inventory', stableJson(inventory));
  }
  for (const dependency of dependencies) {
    for (const binding of dependency.bindings) {
      if (binding.localName !== null || binding.importedName !== binding.exportedName) {
        add('facade-re-export-alias', `${binding.importedName}:${binding.localName}:${binding.exportedName}`);
      }
    }
  }

  const sourceFile = createSourceFile(facadeRel, source);
  walkAst(sourceFile, node => {
    const functionName = node?.type === 'FunctionDeclaration' ? identifierName(node.id) : null;
    if (functionName && publicFunctionSet.has(functionName)) {
      add('facade-wrapper-function', functionName);
    }
    const variableName = node?.type === 'VariableDeclarator' ? identifierName(node.id) : null;
    if (variableName && publicFunctionSet.has(variableName)) {
      add('facade-function-copy', variableName);
    }
  });
  return violations;
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

function normalizeModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  const raw = path.resolve(path.dirname(fromFile), specifier);
  return path.normalize(raw.replace(/\.(?:js|mjs|cjs)$/u, '.ts')).toLowerCase();
}

const ownerTarget = path.normalize(path.join(root, ownerRel)).toLowerCase();

function nativeOwnerImports(entries) {
  return entries.flatMap(([file, source]) =>
    analyzeModuleDependencies(file, source)
      .imports.filter(dependency => normalizeModuleTarget(file, dependency.specifier) === ownerTarget)
      .map(dependency => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        specifier: dependency.specifier,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      }))
  );
}

test('Wardrobe Default Resolution owner has exact dependencies, exports, signatures, and historical semantics', () => {
  assert.equal(ownerRel, 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts');
  assert.deepEqual(ownerViolations(read(ownerRel)), []);
});

test('legacy dimension facade exposes all eleven functions only by direct identity-preserving re-export', () => {
  const facade = read(facadeRel);
  assert.deepEqual(facadeViolations(facade), []);

  const exports = collectNamedModuleExports(facadeRel, facade);
  assert.equal(exports.filter(entry => entry.kind === 'value').length, 89);
  assert.equal(exports.filter(entry => entry.kind === 'type').length, 10);
});

test('no esm/native consumer imports the focused owner before its migration slice', () => {
  const entries = listSourceFiles(path.join(root, 'esm/native')).map(file => [
    file,
    fs.readFileSync(file, 'utf8'),
  ]);
  assert.deepEqual(nativeOwnerImports(entries), []);
});

test('owner and facade mutation fixtures reject back-edges, aliases, compatibility policy, semantic drift, wrappers, and early consumers', () => {
  const owner = read(ownerRel);
  const facade = read(facadeRel);

  const ownerBackEdge = owner.replace("'./wardrobe_defaults.js'", "'../wardrobe_dimension_tokens_shared.js'");
  assert.equal(
    ownerViolations(ownerBackEdge).some(violation => violation.kind === 'owner-facade-back-edge'),
    true
  );

  const aliasedDefaults = owner.replace('WARDROBE_DEFAULTS,', 'WARDROBE_DEFAULTS as DEFAULTS,');
  assert.equal(
    ownerViolations(aliasedDefaults).some(violation => violation.kind === 'owner-import-alias'),
    true
  );

  const compatibilityLayout = owner
    .replaceAll('WARDROBE_LAYOUT_COMPARISON_POLICY', 'WARDROBE_LAYOUT_DIMENSIONS')
    .replace("'./wardrobe_layout_comparison_policy.js'", "'../wardrobe_dimension_tokens_shared.js'");
  assert.equal(
    ownerViolations(compatibilityLayout).some(
      violation =>
        violation.kind === 'compatibility-layout-dimensions-use' ||
        violation.kind === 'owner-facade-back-edge'
    ),
    true
  );

  const nonStrictTolerance = owner.replace(
    '< WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm',
    '<= WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm'
  );
  assert.equal(
    ownerViolations(nonStrictTolerance).some(
      violation => violation.kind === 'non-strict-tolerance-comparison'
    ),
    true
  );

  const changedNumericFallback = owner.replace('finiteOr(doors, 0)', 'finiteOr(doors, 1)');
  assert.equal(
    ownerViolations(changedNumericFallback).some(violation => violation.kind === 'numeric-literal-inventory'),
    true
  );

  const changedRounding = owner.replace('Math.round', 'Math.floor');
  assert.equal(
    ownerViolations(changedRounding).some(
      violation =>
        violation.kind === 'function-semantic-hash' && violation.detail === 'resolveAutoWidthForDoors'
    ),
    true
  );

  const missingFunction = owner.replace(
    /export function getDefaultChestDrawersCount\(\): number \{[\s\S]*?\n\}\n/u,
    ''
  );
  assert.equal(
    ownerViolations(missingFunction).some(violation => violation.kind === 'owner-function-inventory'),
    true
  );

  const additionalFunction = `${owner}\nexport function unexpectedDefaultResolver(): number {\n  return 0;\n}\n`;
  assert.equal(
    ownerViolations(additionalFunction).some(violation => violation.kind === 'owner-function-inventory'),
    true
  );

  assert.match(facade, facadeReexportPattern);
  const facadeWrapper = facade.replace(
    facadeReexportPattern,
    `import { resolveAutoWidthForDoors as ownerResolveAutoWidthForDoors } from './dimensions/wardrobe_default_resolution_policy.js';
export function resolveAutoWidthForDoors(value: unknown, doors: unknown): number {
  return ownerResolveAutoWidthForDoors(value, doors);
}`
  );
  assert.equal(
    facadeViolations(facadeWrapper).some(violation => violation.kind === 'facade-wrapper-function'),
    true
  );

  const facadeCopy = facade.replace(
    facadeReexportPattern,
    `import { resolveAutoWidthForDoors as ownerResolveAutoWidthForDoors } from './dimensions/wardrobe_default_resolution_policy.js';
export const resolveAutoWidthForDoors = ownerResolveAutoWidthForDoors;`
  );
  assert.equal(
    facadeViolations(facadeCopy).some(violation => violation.kind === 'facade-function-copy'),
    true
  );

  const nativeFixturePath = path.join(root, 'esm/native/features/library_preset/module_defaults.ts');
  const earlyConsumer = `import { resolveAutoWidthForDoors } from '../../../shared/dimensions/wardrobe_default_resolution_policy.js';
export const width = resolveAutoWidthForDoors('hinged', 4);`;
  assert.deepEqual(nativeOwnerImports([[nativeFixturePath, earlyConsumer]]), [
    {
      file: 'esm/native/features/library_preset/module_defaults.ts',
      specifier: '../../../shared/dimensions/wardrobe_default_resolution_policy.js',
      syntax: 'static-import',
      symbols: ['resolveAutoWidthForDoors'],
    },
  ]);
});
