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
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const domainApiRel = 'esm/native/kernel/domain_api_room_section_wardrobe.ts';
const platformPolicyRel = 'esm/shared/dimensions/platform_startup_dimension_defaults_policy.ts';
const platformConsumerRel = 'esm/native/platform/platform_services.ts';
const platformPolicySymbol = 'PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const approvedNativeConsumerUniverse = new Set([
  'esm/native/features/library_preset/module_defaults.ts',
  'esm/native/kernel/domain_api_room_section_wardrobe.ts',
  'esm/native/runtime/api.ts',
]);

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
const domainApiResolutionFunctions = Object.freeze([
  'getDefaultDepthForWardrobeType',
  'getDefaultDoorsForWardrobeType',
  'getDefaultPerDoorWidthForWardrobeType',
]);
const expectedDomainApiCallOrder = Object.freeze([
  'getDefaultDoorsForWardrobeType',
  'getDefaultPerDoorWidthForWardrobeType',
  'getDefaultDepthForWardrobeType',
]);
const expectedDomainApiNonImportSemanticHash =
  '4bbfdbed934f7ef33926812a44a9a33a613fb52cf9f5d9bc0f463c55ca456502';
const expectedPlatformNonImportSemanticHash =
  '0cdd37a1ec1212106c2fd3dc9dec0a1b652c6215d2e48aa0250b1e2006bdf06d';
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

function moduleBodySemanticHash(rel, source) {
  const sourceFile = createSourceFile(rel, source);
  return semanticSha256(
    canonicalSemanticAst(sourceFile.body.filter(statement => statement?.type !== 'ImportDeclaration'))
  );
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

function resolveExistingModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  const cleanSpecifier = specifier.replace(/[?#].*$/u, '');
  const raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  const extension = path.extname(raw).toLowerCase();
  const candidates = [];
  if (['.js', '.mjs', '.cjs'].includes(extension)) {
    const stem = raw.slice(0, -extension.length);
    candidates.push(`${stem}.ts`, `${stem}.tsx`, raw);
  } else if (extension) {
    candidates.push(raw);
  } else {
    for (const candidateExtension of ['.ts', '.tsx', '.js', '.mjs']) {
      candidates.push(`${raw}${candidateExtension}`);
      candidates.push(path.join(raw, `index${candidateExtension}`));
    }
  }
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return path.normalize(candidate).toLowerCase();
    } catch {
      // Continue through the canonical runtime-extension candidates.
    }
  }
  return null;
}

const ownerTarget = path.normalize(path.join(root, ownerRel)).toLowerCase();
const facadeTarget = path.normalize(path.join(root, facadeRel)).toLowerCase();
const publicDimensionsTarget = path.normalize(path.join(root, publicDimensionsRel)).toLowerCase();
const platformPolicyTarget = path.normalize(path.join(root, platformPolicyRel)).toLowerCase();
const wardrobeDefaultsTarget = path
  .normalize(path.join(root, 'esm/shared/dimensions/wardrobe_defaults.ts'))
  .toLowerCase();

function targetsFocusedOwner(file, dependency) {
  return normalizeModuleTarget(file, dependency.specifier) === ownerTarget;
}

function targetsLegacyFacade(file, dependency) {
  return normalizeModuleTarget(file, dependency.specifier) === facadeTarget;
}

function targetsPublicDimensionsBarrel(file, dependency) {
  return normalizeModuleTarget(file, dependency.specifier) === publicDimensionsTarget;
}

function targetsCompatibilityFamily(file, dependency) {
  return targetsLegacyFacade(file, dependency) || targetsPublicDimensionsBarrel(file, dependency);
}

function isCompatibilityFamilyAttempt(file, dependency) {
  if (!targetsCompatibilityFamily(file, dependency)) return false;
  return (
    dependency.syntax === 'dynamic-import' ||
    dependency.importedSymbols.some(symbol => symbol === '*' || publicFunctionSet.has(symbol)) ||
    dependency.bindings.some(binding => binding.importedName === '*' || binding.localName !== null)
  );
}

function hasEscapingFocusedReference(node, derivedBindings) {
  let found = false;
  walkAst(node, current => {
    if (found || current?.type !== 'Identifier' || !derivedBindings.has(current.name)) {
      return;
    }
    const parent = current.parent;
    const isDirectCall = parent?.type === 'CallExpression' && parent.callee === current;
    if (!isDirectCall) found = true;
  });
  return found;
}

function focusedRuntimeBindings(ownerDependencies) {
  return new Set(
    ownerDependencies
      .filter(dependency => dependency.kind === 'value' && dependency.syntax === 'static-import')
      .flatMap(dependency => dependency.bindings)
      .filter(binding => binding.localName !== null && publicFunctionSet.has(binding.importedName))
      .map(binding => binding.localName)
  );
}

function isTypeOnlyPosition(node) {
  const runtimeTsContainers = new Set([
    'TSAsExpression',
    'TSTypeAssertion',
    'TSInstantiationExpression',
    'TSNonNullExpression',
    'TSSatisfiesExpression',
    'TSModuleDeclaration',
    'TSModuleBlock',
    'TSEnumDeclaration',
    'TSEnumBody',
    'TSEnumMember',
    'TSParameterProperty',
  ]);
  let current = node;
  while (current?.parent) {
    const parent = current.parent;
    if (
      typeof parent.type === 'string' &&
      parent.type.startsWith('TS') &&
      !runtimeTsContainers.has(parent.type)
    ) {
      return true;
    }
    current = parent;
  }
  return false;
}

function isDeclarationIdentifier(node) {
  const parent = node?.parent;
  if (!parent) return false;
  if (
    (parent.type === 'VariableDeclarator' && parent.id === node) ||
    ((parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ClassDeclaration' ||
      parent.type === 'ClassExpression') &&
      parent.id === node) ||
    (parent.type === 'CatchClause' && parent.param === node)
  ) {
    return true;
  }
  return (
    (parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ArrowFunctionExpression') &&
    (parent.params ?? []).includes(node)
  );
}

function isRuntimeFocusedReference(node, focusedBindings) {
  if (
    node?.type !== 'Identifier' ||
    !focusedBindings.has(node.name) ||
    isTypeOnlyPosition(node) ||
    isDeclarationIdentifier(node)
  ) {
    return false;
  }
  const parent = node.parent;
  if (
    parent?.type === 'ImportSpecifier' ||
    parent?.type === 'ImportDefaultSpecifier' ||
    parent?.type === 'ImportNamespaceSpecifier'
  ) {
    return false;
  }
  if (parent?.type === 'ExportSpecifier' && parent.exported === node && parent.local !== node) {
    return false;
  }
  if (parent?.type === 'MemberExpression' && !parent.computed && parent.property === node) {
    return false;
  }
  if (
    (parent?.type === 'Property' || parent?.type === 'MethodDefinition') &&
    !parent.computed &&
    !parent.shorthand &&
    parent.key === node
  ) {
    return false;
  }
  return true;
}

function focusedReferenceEscapeViolations(file, source, ownerDependencies) {
  const focusedBindings = focusedRuntimeBindings(ownerDependencies);
  if (focusedBindings.size === 0) return [];

  const rel = path.relative(root, file).replaceAll('\\', '/');
  const sourceFile = createSourceFile(rel, source);
  const violations = [];
  const seen = new Set();
  walkAst(sourceFile, node => {
    if (!isRuntimeFocusedReference(node, focusedBindings)) return;
    const parent = node.parent;
    if (parent?.type === 'CallExpression' && parent.callee === node) return;
    const key = `${node.name}:${node.start ?? 0}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({
      kind: 'focused-owner-reference-escape',
      file: rel,
      detail: node.name,
      parentType: parent?.type ?? null,
      start: node.start ?? 0,
    });
  });
  return violations;
}

function focusedLocalBridgeViolations(file, source, ownerDependencies) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const focusedBindings = focusedRuntimeBindings(ownerDependencies);
  if (focusedBindings.size === 0) return [];

  const sourceFile = createSourceFile(rel, source);
  const variableDeclarators = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator') variableDeclarators.push(node);
  });

  const derivedBindings = new Set(focusedBindings);
  let changed = true;
  while (changed) {
    changed = false;
    for (const declarator of variableDeclarators) {
      const localName = identifierName(declarator.id);
      if (
        !localName ||
        derivedBindings.has(localName) ||
        !declarator.init ||
        !hasEscapingFocusedReference(declarator.init, derivedBindings)
      ) {
        continue;
      }
      derivedBindings.add(localName);
      changed = true;
    }
  }

  const violations = [];
  const add = (node, detail) => {
    violations.push({
      kind: 'focused-owner-local-bridge',
      file: rel,
      detail,
      start: node?.start ?? 0,
    });
  };
  for (const statement of sourceFile.body ?? []) {
    if (statement.type === 'ExportNamedDeclaration' && statement.source == null) {
      for (const specifier of statement.specifiers ?? []) {
        const localName = identifierName(specifier.local);
        if (localName && derivedBindings.has(localName)) {
          add(specifier, localName);
        }
      }
      if (statement.declaration?.type === 'VariableDeclaration') {
        for (const declarator of statement.declaration.declarations ?? []) {
          const localName = identifierName(declarator.id);
          if (
            localName &&
            derivedBindings.has(localName) &&
            declarator.init &&
            hasEscapingFocusedReference(declarator.init, derivedBindings)
          ) {
            add(declarator, localName);
          }
        }
      }
      if (
        statement.declaration &&
        statement.declaration.type !== 'VariableDeclaration' &&
        hasEscapingFocusedReference(statement.declaration, derivedBindings)
      ) {
        add(statement.declaration, statement.declaration.type);
      }
    }
    if (
      statement.type === 'ExportDefaultDeclaration' &&
      hasEscapingFocusedReference(statement.declaration, derivedBindings)
    ) {
      add(statement.declaration, 'default');
    }
  }
  return violations;
}

function inspectNativeOwnerUniverse(entries) {
  const focusedImports = [];
  const violations = [];
  for (const [file, source] of entries) {
    const rel = path.relative(root, file).replaceAll('\\', '/');
    const dependencies = analyzeModuleDependencies(file, source).imports;
    const ownerDependencies = dependencies.filter(dependency => targetsFocusedOwner(file, dependency));
    const compatibilityFamilyDependencies = dependencies.filter(dependency =>
      isCompatibilityFamilyAttempt(file, dependency)
    );

    for (const dependency of ownerDependencies) {
      focusedImports.push({
        file: rel,
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      });
      if (!approvedNativeConsumerUniverse.has(rel)) {
        violations.push({ kind: 'unapproved-focused-owner-consumer', file: rel });
      }
      const allowedSyntax =
        rel === 'esm/native/runtime/api.ts'
          ? dependency.syntax === 'static-re-export'
          : dependency.syntax === 'static-import';
      if (dependency.kind !== 'value' || !allowedSyntax) {
        violations.push({
          kind: 'invalid-focused-owner-dependency',
          file: rel,
          dependencyKind: dependency.kind,
          syntax: dependency.syntax,
        });
      }
      if (
        dependency.importedSymbols.length === 0 ||
        dependency.importedSymbols.some(symbol => symbol === '*' || !publicFunctionSet.has(symbol))
      ) {
        violations.push({
          kind: 'invalid-focused-owner-symbols',
          file: rel,
          symbols: dependency.importedSymbols,
        });
      }
      for (const binding of dependency.bindings) {
        const validBinding =
          dependency.syntax === 'static-re-export'
            ? binding.localName === null && binding.exportedName === binding.importedName
            : binding.localName === binding.importedName && binding.exportedName === null;
        if (!validBinding) {
          violations.push({
            kind: 'focused-owner-alias',
            file: rel,
            importedName: binding.importedName,
            localName: binding.localName,
            exportedName: binding.exportedName,
          });
        }
      }
    }
    violations.push(...focusedReferenceEscapeViolations(file, source, ownerDependencies));
    violations.push(...focusedLocalBridgeViolations(file, source, ownerDependencies));
    if (ownerDependencies.length > 0 && compatibilityFamilyDependencies.length > 0) {
      violations.push({ kind: 'dual-focused-and-facade-family-import', file: rel });
    }
  }
  return { focusedImports, violations };
}

function inspectDomainApiConsumer(source) {
  const violations = [];
  const add = (kind, detail = null) => violations.push({ kind, detail });
  const file = path.join(root, domainApiRel);
  const dependencies = analyzeModuleDependencies(file, source).imports;
  const focusedDependencies = dependencies.filter(dependency => targetsFocusedOwner(file, dependency));
  const compatibilityDependencies = dependencies.filter(dependency =>
    targetsCompatibilityFamily(file, dependency)
  );

  if (focusedDependencies.length !== 1) {
    add('domain-focused-import-count', focusedDependencies.length);
  } else {
    const [dependency] = focusedDependencies;
    if (
      dependency.specifier !== '../../shared/dimensions/wardrobe_default_resolution_policy.js' ||
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import'
    ) {
      add('domain-focused-import-shape', {
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
      });
    }
    if (stableJson(dependency.importedSymbols) !== stableJson(domainApiResolutionFunctions)) {
      add('domain-focused-symbol-inventory', dependency.importedSymbols);
    }
  }

  if (compatibilityDependencies.length !== 0) {
    add(
      'domain-compatibility-overlap',
      compatibilityDependencies.map(dependency => ({
        specifier: dependency.specifier,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      }))
    );
  }

  for (const violation of inspectNativeOwnerUniverse([[file, source]]).violations) {
    add(violation.kind, violation);
  }

  if (moduleBodySemanticHash(domainApiRel, source) !== expectedDomainApiNonImportSemanticHash) {
    add('domain-non-import-semantic-hash');
  }

  const sourceFile = createSourceFile(domainApiRel, source);
  const initFunction = sourceFile.body.find(
    statement =>
      statement?.type === 'FunctionDeclaration' && identifierName(statement.id) === 'initWardrobeTypeDefaults'
  );
  if (!initFunction) {
    add('domain-init-function');
  } else {
    const calls = [];
    walkAst(initFunction, node => {
      if (
        node?.type === 'CallExpression' &&
        node.callee?.type === 'Identifier' &&
        domainApiResolutionFunctions.includes(node.callee.name)
      ) {
        calls.push({ name: node.callee.name, start: node.start ?? 0 });
      }
    });
    const callOrder = calls.sort((left, right) => left.start - right.start).map(call => call.name);
    if (stableJson(callOrder) !== stableJson(expectedDomainApiCallOrder)) {
      add('domain-resolution-call-order', callOrder);
    }
  }

  return violations;
}

function inspectPlatformPolicy(source) {
  const violations = [];
  const add = (kind, detail = null) => violations.push({ kind, detail });
  const file = path.join(root, platformPolicyRel);
  const dependencies = analyzeModuleDependencies(file, source).imports;
  const dependencyFacts = dependencies.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    symbols: dependency.importedSymbols,
  }));
  const expectedDependencies = [
    {
      specifier: './wardrobe_default_resolution_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['getDefaultDepthForWardrobeType'],
    },
    {
      specifier: './wardrobe_defaults.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['DEFAULT_HEIGHT', 'DEFAULT_WIDTH'],
    },
  ];
  if (stableJson(dependencyFacts) !== stableJson(expectedDependencies)) {
    add('platform-policy-dependencies', dependencyFacts);
  }
  for (const dependency of dependencies) {
    for (const binding of dependency.bindings) {
      if (binding.localName !== binding.importedName || binding.exportedName !== null) {
        add('platform-policy-import-alias', binding);
      }
    }
  }

  const exports = collectNamedModuleExports(platformPolicyRel, source).map(entry => ({
    name: entry.exportedName,
    kind: entry.kind,
  }));
  if (stableJson(exports) !== stableJson([{ name: platformPolicySymbol, kind: 'value' }])) {
    add('platform-policy-export-inventory', exports);
  }

  const sourceFile = createSourceFile(platformPolicyRel, source);
  const nonImports = sourceFile.body.filter(statement => statement?.type !== 'ImportDeclaration');
  if (nonImports.length !== 1 || nonImports[0]?.type !== 'ExportNamedDeclaration') {
    add(
      'platform-policy-top-level-shape',
      nonImports.map(statement => statement?.type ?? null)
    );
  }

  const declarators = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === platformPolicySymbol) {
      declarators.push(node);
    }
  });
  if (declarators.length !== 1) {
    add('platform-policy-declaration-count', declarators.length);
    return violations;
  }

  const [declarator] = declarators;
  if (
    declarator.parent?.type !== 'VariableDeclaration' ||
    declarator.parent.kind !== 'const' ||
    declarator.parent.parent?.type !== 'ExportNamedDeclaration' ||
    declarator.id?.typeAnnotation
  ) {
    add('platform-policy-export-const');
  }
  const initializer = declarator.init;
  if (
    initializer?.type !== 'CallExpression' ||
    memberPath(initializer.callee) !== 'Object.freeze' ||
    initializer.arguments?.length !== 1 ||
    initializer.arguments[0]?.type !== 'ObjectExpression'
  ) {
    add('platform-policy-freeze');
    return violations;
  }

  const properties = initializer.arguments[0].properties ?? [];
  const propertyFacts = properties.map(property => ({
    type: property?.type ?? null,
    computed: property?.computed ?? false,
    shorthand: property?.shorthand ?? false,
    key: identifierName(property?.key),
    value: identifierName(property?.value),
  }));
  const expectedProperties = [
    {
      type: 'Property',
      computed: false,
      shorthand: false,
      key: 'widthCm',
      value: 'DEFAULT_WIDTH',
    },
    {
      type: 'Property',
      computed: false,
      shorthand: false,
      key: 'heightCm',
      value: 'DEFAULT_HEIGHT',
    },
    {
      type: 'Property',
      computed: false,
      shorthand: false,
      key: 'resolveDepthCm',
      value: 'getDefaultDepthForWardrobeType',
    },
  ];
  if (stableJson(propertyFacts) !== stableJson(expectedProperties)) {
    add('platform-policy-property-shape', propertyFacts);
  }
  walkAst(initializer.arguments[0], node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') {
      add('platform-policy-numeric-literal', node.value);
    }
  });
  return violations;
}

function normalizedPlatformBodySemanticHash(source) {
  const normalized = source
    .replaceAll(`${platformPolicySymbol}.resolveDepthCm`, 'getDefaultDepthForWardrobeType')
    .replaceAll(`${platformPolicySymbol}.widthCm`, 'DEFAULT_WIDTH')
    .replaceAll(`${platformPolicySymbol}.heightCm`, 'DEFAULT_HEIGHT');
  return moduleBodySemanticHash(platformConsumerRel, normalized);
}

function inspectPlatformConsumer(source) {
  const violations = [];
  const add = (kind, detail = null) => violations.push({ kind, detail });
  const file = path.join(root, platformConsumerRel);
  const dependencies = analyzeModuleDependencies(file, source).imports;
  const policyDependencies = dependencies.filter(
    dependency => resolveExistingModuleTarget(file, dependency.specifier) === platformPolicyTarget
  );
  if (policyDependencies.length !== 1) {
    add('platform-policy-import-count', policyDependencies.length);
  } else {
    const [dependency] = policyDependencies;
    if (
      dependency.specifier !== '../../shared/dimensions/platform_startup_dimension_defaults_policy.js' ||
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import' ||
      stableJson(dependency.importedSymbols) !== stableJson([platformPolicySymbol])
    ) {
      add('platform-policy-import-shape', {
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      });
    }
    for (const binding of dependency.bindings) {
      if (binding.localName !== platformPolicySymbol || binding.exportedName !== null) {
        add('platform-policy-consumer-alias', binding);
      }
    }
  }

  const forbiddenTargets = new Set([
    ownerTarget,
    wardrobeDefaultsTarget,
    facadeTarget,
    publicDimensionsTarget,
  ]);
  const forbiddenDependencies = dependencies.filter(dependency =>
    forbiddenTargets.has(resolveExistingModuleTarget(file, dependency.specifier))
  );
  if (forbiddenDependencies.length !== 0) {
    add(
      'platform-forbidden-dimension-dependency',
      forbiddenDependencies.map(dependency => ({
        specifier: dependency.specifier,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      }))
    );
  }

  const sharedRootPrefix = `${path.normalize(path.join(root, 'esm/shared')).toLowerCase()}${path.sep}`;
  const sharedDependencies = dependencies.filter(dependency =>
    resolveExistingModuleTarget(file, dependency.specifier)?.startsWith(sharedRootPrefix)
  );
  if (sharedDependencies.length !== 1) {
    add(
      'platform-shared-statement-count',
      sharedDependencies.map(dependency => dependency.specifier)
    );
  }

  if (normalizedPlatformBodySemanticHash(source) !== expectedPlatformNonImportSemanticHash) {
    add('platform-normalized-semantic-hash');
  }

  const sourceFile = createSourceFile(platformConsumerRel, source);
  const memberCounts = {
    widthCm: 0,
    heightCm: 0,
    resolveDepthCm: 0,
  };
  walkAst(sourceFile, node => {
    if (node?.type !== 'MemberExpression') return;
    const pathValue = memberPath(node);
    const prefix = `${platformPolicySymbol}.`;
    if (!pathValue?.startsWith(prefix)) return;
    const member = pathValue.slice(prefix.length);
    if (Object.prototype.hasOwnProperty.call(memberCounts, member)) {
      memberCounts[member] += 1;
    } else {
      add('platform-policy-unknown-member', member);
    }
  });
  if (stableJson(memberCounts) !== stableJson({ widthCm: 1, heightCm: 1, resolveDepthCm: 1 })) {
    add('platform-policy-member-inventory', memberCounts);
  }
  return violations;
}

function collectPlatformPolicyConsumers(entries) {
  return entries.flatMap(([file, source]) =>
    analyzeModuleDependencies(file, source)
      .imports.filter(
        dependency => resolveExistingModuleTarget(file, dependency.specifier) === platformPolicyTarget
      )
      .map(dependency => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        specifier: dependency.specifier,
        kind: dependency.kind,
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
});

test('approved native consumer universe accepts any direct focused-owner subset without aliases or facade overlap', () => {
  const entries = listSourceFiles(path.join(root, 'esm/native')).map(file => [
    file,
    fs.readFileSync(file, 'utf8'),
  ]);
  assert.deepEqual(inspectNativeOwnerUniverse(entries).violations, []);
});

test('Domain API uses the exact focused resolver trio while preserving profile, fallback, and action-order semantics', () => {
  assert.deepEqual(inspectDomainApiConsumer(read(domainApiRel)), []);
});

test('Domain API mutation fixtures reject compatibility routes, aliases, bridges, literals, and flow drift', () => {
  const source = read(domainApiRel);
  const focusedSpecifier = '../../shared/dimensions/wardrobe_default_resolution_policy.js';
  const focusedImport = `import {
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
  getDefaultPerDoorWidthForWardrobeType,
} from '${focusedSpecifier}';`;
  assert.match(source, new RegExp(focusedSpecifier.replaceAll('.', '\\.'), 'u'));
  assert.match(source, new RegExp(focusedImport.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

  const assertRejected = (mutated, expectedKind, label) => {
    const violations = inspectDomainApiConsumer(mutated);
    assert.equal(
      violations.some(violation => violation.kind === expectedKind),
      true,
      `${label}: ${JSON.stringify(violations)}`
    );
  };

  assertRejected(
    source.replace(focusedSpecifier, '../../shared/wardrobe_dimension_tokens_shared.js'),
    'domain-focused-import-count',
    'legacy facade'
  );
  assertRejected(
    source.replace(focusedSpecifier, '../../shared/dimensions/wardrobe_default_resolution_policy'),
    'domain-focused-import-count',
    'extensionless owner path'
  );
  assertRejected(
    source.replace(focusedSpecifier, '../../shared/dimensions/index.js'),
    'domain-focused-import-count',
    'directory index path'
  );
  assertRejected(
    source.replace(focusedSpecifier, '../features/dimensions/index.js'),
    'domain-focused-import-count',
    'public dimensions barrel'
  );
  assertRejected(
    `${source}
import '../../shared/wardrobe_dimension_tokens_shared.js';
`,
    'domain-compatibility-overlap',
    'side-effect facade import'
  );
  assertRejected(
    `${source}
import '../features/dimensions/index.js';
`,
    'domain-compatibility-overlap',
    'side-effect public barrel import'
  );
  assertRejected(
    source.replace(
      'getDefaultDepthForWardrobeType,',
      'getDefaultDepthForWardrobeType as resolveDefaultDepth,'
    ),
    'focused-owner-alias',
    'focused alias'
  );
  assertRejected(
    source.replace(focusedImport, `import * as resolutionPolicy from '${focusedSpecifier}';`),
    'domain-focused-symbol-inventory',
    'namespace import'
  );
  assertRejected(
    source.replace(focusedImport, `const resolutionPolicyPromise = import('${focusedSpecifier}');`),
    'domain-focused-import-shape',
    'dynamic import'
  );
  assertRejected(
    source.replace(
      '  getDefaultPerDoorWidthForWardrobeType,\n',
      '  getDefaultPerDoorWidthForWardrobeType,\n  resolveAutoWidthForDoors,\n'
    ),
    'domain-focused-symbol-inventory',
    'fourth owner symbol'
  );
  assertRejected(
    source.replace(
      focusedImport,
      `${focusedImport}
export { getDefaultDepthForWardrobeType as domainDefaultDepthResolver };`
    ),
    'focused-owner-local-bridge',
    'local re-export bridge'
  );
  assertRejected(
    source.replace(
      '  rawPatch.depth = getDefaultDepthForWardrobeType(next);',
      "  rawPatch.depth = next === 'sliding' ? 60 : 55;"
    ),
    'domain-non-import-semantic-hash',
    'literal default'
  );
  assertRejected(
    source.replace('  rawPatch.width = doorsI * perDoor;', '  rawPatch.width = perDoor;'),
    'domain-non-import-semantic-hash',
    'width formula'
  );
  assertRejected(
    source.replace(
      `  const doorsI = getDefaultDoorsForWardrobeType(next);
  rawPatch.doors = doorsI;

  const perDoor = getDefaultPerDoorWidthForWardrobeType(next);
  rawPatch.width = doorsI * perDoor;
  rawPatch.depth = getDefaultDepthForWardrobeType(next);`,
      `  const depth = getDefaultDepthForWardrobeType(next);
  const doorsI = getDefaultDoorsForWardrobeType(next);
  rawPatch.doors = doorsI;

  const perDoor = getDefaultPerDoorWidthForWardrobeType(next);
  rawPatch.width = doorsI * perDoor;
  rawPatch.depth = depth;`
    ),
    'domain-resolution-call-order',
    'resolver call order'
  );
  assertRejected(
    source.replace(
      `  setCfgWardrobeType(App, next, m);
  setCfgManualWidth(App, false, m);`,
      `  setCfgManualWidth(App, false, m);
  setCfgWardrobeType(App, next, m);`
    ),
    'domain-non-import-semantic-hash',
    'fallback action order'
  );
});

test('Platform startup dimension policy has the exact pure composition shape and sole focused consumer', () => {
  assert.deepEqual(inspectPlatformPolicy(read(platformPolicyRel)), []);
  assert.deepEqual(inspectPlatformConsumer(read(platformConsumerRel)), []);

  const entries = listSourceFiles(path.join(root, 'esm')).map(file => [file, fs.readFileSync(file, 'utf8')]);
  assert.deepEqual(collectPlatformPolicyConsumers(entries), [
    {
      file: platformConsumerRel,
      specifier: '../../shared/dimensions/platform_startup_dimension_defaults_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: [platformPolicySymbol],
    },
  ]);

  for (const publicRel of [facadeRel, publicDimensionsRel, 'esm/native/runtime/api.ts']) {
    const source = read(publicRel);
    assert.equal(source.includes(platformPolicySymbol), false, publicRel);
    assert.equal(source.includes('platform_startup_dimension_defaults_policy'), false, publicRel);
  }
});

test('Platform startup dimension mutation fixtures reject dependency drift, compatibility paths, literals, and precedence changes', () => {
  const policy = read(platformPolicyRel);
  const consumer = read(platformConsumerRel);
  const policyImport = `import { ${platformPolicySymbol} } from '../../shared/dimensions/platform_startup_dimension_defaults_policy.js';`;
  assert.match(consumer, new RegExp(policyImport.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

  const assertPolicyRejected = (mutated, expectedKind, label) => {
    const violations = inspectPlatformPolicy(mutated);
    assert.equal(
      violations.some(violation => violation.kind === expectedKind),
      true,
      `${label}: ${JSON.stringify(violations)}`
    );
  };
  const assertConsumerRejected = (mutated, expectedKind, label) => {
    const violations = inspectPlatformConsumer(mutated);
    assert.equal(
      violations.some(violation => violation.kind === expectedKind),
      true,
      `${label}: ${JSON.stringify(violations)}`
    );
  };

  assertPolicyRejected(
    `${policy}
import './units.js';
`,
    'platform-policy-dependencies',
    'additional policy dependency'
  );
  assertPolicyRejected(
    policy.replace('DEFAULT_HEIGHT, DEFAULT_WIDTH', 'DEFAULT_HEIGHT as HEIGHT, DEFAULT_WIDTH'),
    'platform-policy-import-alias',
    'policy import alias'
  );
  assertPolicyRejected(
    policy.replace('widthCm: DEFAULT_WIDTH', 'widthCm: 160'),
    'platform-policy-property-shape',
    'copied width literal'
  );
  assertPolicyRejected(
    policy.replace('heightCm: DEFAULT_HEIGHT', 'heightCm: 240'),
    'platform-policy-property-shape',
    'copied height literal'
  );
  assertPolicyRejected(
    policy.replace(
      'resolveDepthCm: getDefaultDepthForWardrobeType',
      'resolveDepthCm: value => getDefaultDepthForWardrobeType(value)'
    ),
    'platform-policy-property-shape',
    'resolver wrapper'
  );
  assertPolicyRejected(policy.replace('Object.freeze({', '({'), 'platform-policy-freeze', 'removed freeze');
  assertPolicyRejected(
    `${policy}
export const PLATFORM_STARTUP_DEFAULT_WIDTH = DEFAULT_WIDTH;
`,
    'platform-policy-export-inventory',
    'additional export'
  );

  assertConsumerRejected(
    consumer.replace(
      '../../shared/dimensions/platform_startup_dimension_defaults_policy.js',
      '../../shared/wardrobe_dimension_tokens_shared.js'
    ),
    'platform-policy-import-count',
    'legacy facade'
  );
  assertConsumerRejected(
    consumer.replace(
      '../../shared/dimensions/platform_startup_dimension_defaults_policy.js',
      '../../shared/dimensions/platform_startup_dimension_defaults_policy'
    ),
    'platform-policy-import-shape',
    'extensionless owner path'
  );
  assertConsumerRejected(
    consumer.replace(
      '../../shared/dimensions/platform_startup_dimension_defaults_policy.js',
      '../../shared/dimensions/platform_startup_dimension_defaults_policy.js?platform=1#owner'
    ),
    'platform-policy-import-shape',
    'query and hash owner path'
  );
  assertConsumerRejected(
    consumer.replace(
      '../../shared/dimensions/platform_startup_dimension_defaults_policy.js',
      '../../shared/dimensions/index.js'
    ),
    'platform-policy-import-count',
    'directory index path'
  );
  assertConsumerRejected(
    consumer.replace(platformPolicySymbol, `${platformPolicySymbol} as PLATFORM_DEFAULTS`),
    'platform-policy-consumer-alias',
    'consumer alias'
  );
  assertConsumerRejected(
    consumer.replace(
      policyImport,
      `import * as platformDefaults from '../../shared/dimensions/platform_startup_dimension_defaults_policy.js';`
    ),
    'platform-policy-import-shape',
    'namespace import'
  );
  assertConsumerRejected(
    consumer.replace(
      policyImport,
      `const platformDefaults = import('../../shared/dimensions/platform_startup_dimension_defaults_policy.js');`
    ),
    'platform-policy-import-shape',
    'dynamic import'
  );
  assertConsumerRejected(
    `${consumer}
import { DEFAULT_WIDTH } from '../../shared/dimensions/wardrobe_defaults.js';
`,
    'platform-forbidden-dimension-dependency',
    'direct defaults owner'
  );
  assertConsumerRejected(
    `${consumer}
import { getDefaultDepthForWardrobeType } from '../../shared/dimensions/wardrobe_default_resolution_policy.js';
`,
    'platform-forbidden-dimension-dependency',
    'direct resolution owner'
  );
  assertConsumerRejected(
    `${consumer}
import '../../shared/wardrobe_dimension_tokens_shared.js';
`,
    'platform-forbidden-dimension-dependency',
    'side-effect facade import'
  );
  assertConsumerRejected(
    consumer.replace(`${platformPolicySymbol}.widthCm`, "cfg.wardrobeType === 'sliding' ? 180 : 160"),
    'platform-normalized-semantic-hash',
    'type-dependent width'
  );
  assertConsumerRejected(
    consumer.replace(`${platformPolicySymbol}.heightCm`, '240'),
    'platform-normalized-semantic-hash',
    'copied height literal'
  );
  assertConsumerRejected(
    consumer.replace('wVal <= 10', 'wVal < 10'),
    'platform-normalized-semantic-hash',
    'meter threshold'
  );
  assertConsumerRejected(
    consumer.replace(
      `      if (!Number.isFinite(wCm)) wCm = ${platformPolicySymbol}.widthCm;
      if (!Number.isFinite(hCm)) hCm = ${platformPolicySymbol}.heightCm;`,
      `      if (!Number.isFinite(hCm)) hCm = ${platformPolicySymbol}.heightCm;
      if (!Number.isFinite(wCm)) wCm = ${platformPolicySymbol}.widthCm;`
    ),
    'platform-normalized-semantic-hash',
    'fallback order'
  );
  assertConsumerRejected(
    consumer.replace(
      '      if (!Number.isFinite(wVal)) wVal = readNumberish(ui.w);',
      '      if (!Number.isFinite(wVal)) wVal = readNumberish(rawUi.w);'
    ),
    'platform-normalized-semantic-hash',
    'top-level precedence'
  );

  const actualEntries = [
    [path.join(root, platformConsumerRel), consumer],
    [
      path.join(root, 'esm/native/features/platform_defaults_bridge.ts'),
      `export { ${platformPolicySymbol} } from '../../shared/dimensions/platform_startup_dimension_defaults_policy';`,
    ],
    [
      path.join(root, 'esm/native/features/platform_defaults_query_bridge.ts'),
      `export { ${platformPolicySymbol} } from '../../shared/dimensions/platform_startup_dimension_defaults_policy.js?bridge=1#owner';`,
    ],
  ];
  assert.equal(collectPlatformPolicyConsumers(actualEntries).length, 3);
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
});

test('approved universe rejects focused reference escapes, local bridges, and broad compatibility overlap without blocking direct calls', () => {
  const approvedFixturePath = path.join(root, 'esm/native/kernel/domain_api_room_section_wardrobe.ts');
  const approvedRuntimePath = path.join(root, 'esm/native/runtime/api.ts');
  const unapprovedFixturePath = path.join(root, 'esm/native/ui/react/tabs/unapproved_default_consumer.ts');
  const focusedImport = `import { resolveAutoWidthForDoors } from '../../shared/dimensions/wardrobe_default_resolution_policy.js';`;
  const approvedDirectCall = `${focusedImport}
export const width = resolveAutoWidthForDoors('hinged', 4);`;
  const approvedConsumerFunction = `${focusedImport}
export function calculateWidth(doors: number): number {
  return resolveAutoWidthForDoors('hinged', doors);
}`;
  const assertViolation = (file, source, expectedKind, label) => {
    const result = inspectNativeOwnerUniverse([[file, source]]);
    assert.equal(
      result.violations.some(violation => violation.kind === expectedKind),
      true,
      `${label}: ${JSON.stringify(result.violations)}`
    );
  };
  const assertReferenceEscape = (source, label) =>
    assertViolation(approvedFixturePath, source, 'focused-owner-reference-escape', label);

  assert.deepEqual(inspectNativeOwnerUniverse([]).violations, []);
  assert.deepEqual(inspectNativeOwnerUniverse([[approvedFixturePath, approvedDirectCall]]).violations, []);
  assert.deepEqual(
    inspectNativeOwnerUniverse([[approvedFixturePath, approvedConsumerFunction]]).violations,
    []
  );

  assertViolation(
    approvedFixturePath,
    `${focusedImport}
export { resolveAutoWidthForDoors };`,
    'focused-owner-local-bridge',
    'two-statement focused bridge'
  );
  assertViolation(
    approvedFixturePath,
    `${focusedImport}
const autoWidthResolver = resolveAutoWidthForDoors;
export { autoWidthResolver };`,
    'focused-owner-local-bridge',
    'local alias export'
  );
  assertViolation(
    approvedFixturePath,
    `${focusedImport}
export const autoWidthResolver = resolveAutoWidthForDoors;`,
    'focused-owner-local-bridge',
    'exported const copy'
  );
  assertViolation(
    approvedFixturePath,
    `${focusedImport}
export default resolveAutoWidthForDoors;`,
    'focused-owner-local-bridge',
    'default export'
  );
  assertViolation(
    approvedFixturePath,
    `${focusedImport}
export const defaultResolvers = { resolveAutoWidthForDoors };`,
    'focused-owner-local-bridge',
    'object wrapper export'
  );

  assertReferenceEscape(
    `${focusedImport}
let resolver;
resolver = resolveAutoWidthForDoors;
export { resolver };`,
    'late assignment and export'
  );
  assertReferenceEscape(
    `${focusedImport}
registerDefaultResolver(resolveAutoWidthForDoors);`,
    'standalone callback argument'
  );
  assertReferenceEscape(
    `${focusedImport}
registry.defaultResolver = resolveAutoWidthForDoors;`,
    'member assignment'
  );
  assertReferenceEscape(
    `${focusedImport}
globalThis.defaultResolver = resolveAutoWidthForDoors;`,
    'global assignment'
  );
  assertReferenceEscape(
    `${focusedImport}
const resolvers = [resolveAutoWidthForDoors];`,
    'array storage'
  );
  assertReferenceEscape(
    `${focusedImport}
const resolvers = { width: resolveAutoWidthForDoors };`,
    'object storage'
  );
  assertReferenceEscape(
    `${focusedImport}
export function getResolver() {
  return resolveAutoWidthForDoors;
}`,
    'exported function returns focused reference'
  );
  assertReferenceEscape(
    `${focusedImport}
function getResolver() {
  return resolveAutoWidthForDoors;
}
export { getResolver };`,
    'local function exported after returning focused reference'
  );
  assertReferenceEscape(
    `${focusedImport}
const bound = resolveAutoWidthForDoors.bind(null, 'hinged');`,
    'bound reference'
  );
  assertReferenceEscape(
    `${focusedImport}
const same = resolveAutoWidthForDoors === otherResolver;`,
    'identity comparison'
  );
  assertReferenceEscape(
    `${focusedImport}
namespace ResolverBridge {
  export const resolver = resolveAutoWidthForDoors;
}
export { ResolverBridge };`,
    'runtime namespace stores focused reference'
  );
  assertReferenceEscape(
    `${focusedImport}
export class ResolverHolder {
  constructor(public resolver = resolveAutoWidthForDoors) {}
}`,
    'parameter property stores focused reference'
  );
  assertReferenceEscape(
    `${focusedImport}
export enum ResolverEnum {
  Width = resolveAutoWidthForDoors as unknown as number,
}`,
    'runtime enum stores focused reference'
  );
  assertReferenceEscape(
    `${focusedImport}
registerDefaultResolver(
  <typeof resolveAutoWidthForDoors>resolveAutoWidthForDoors
);`,
    'callback argument with legacy type assertion'
  );
  assertReferenceEscape(
    `${focusedImport}
let resolver;
resolver = <typeof resolveAutoWidthForDoors>resolveAutoWidthForDoors;`,
    'late assignment with legacy type assertion'
  );
  assertReferenceEscape(
    `${focusedImport}
const registry = {
  resolver: <typeof resolveAutoWidthForDoors>resolveAutoWidthForDoors,
};`,
    'object storage with legacy type assertion'
  );
  assertReferenceEscape(
    `${focusedImport}
const resolver =
  <unknown>(<typeof resolveAutoWidthForDoors>resolveAutoWidthForDoors);`,
    'nested legacy type assertions'
  );

  const namespaceDirectCall = `${focusedImport}
namespace PresetWidths {
  export const fourDoors = resolveAutoWidthForDoors('hinged', 4);
}
export { PresetWidths };`;
  const enumDirectCall = `${focusedImport}
export enum PresetWidth {
  FourDoors = resolveAutoWidthForDoors('hinged', 4),
}`;
  const parameterPropertyDirectCall = `${focusedImport}
export class WidthHolder {
  constructor(public width = resolveAutoWidthForDoors('hinged', 4)) {}
}`;
  const assertedDirectCall = `${focusedImport}
export const width = <number>resolveAutoWidthForDoors('hinged', 4);`;
  const assertedFunctionDirectCall = `${focusedImport}
export function calculateWidth(doors: number): number {
  return <number>resolveAutoWidthForDoors('hinged', doors);
}`;
  const typeOnlyQuery = `${focusedImport}
type AutoWidthResolver = typeof resolveAutoWidthForDoors;`;
  assert.deepEqual(inspectNativeOwnerUniverse([[approvedFixturePath, namespaceDirectCall]]).violations, []);
  assert.deepEqual(inspectNativeOwnerUniverse([[approvedFixturePath, enumDirectCall]]).violations, []);
  assert.deepEqual(
    inspectNativeOwnerUniverse([[approvedFixturePath, parameterPropertyDirectCall]]).violations,
    []
  );
  assert.deepEqual(inspectNativeOwnerUniverse([[approvedFixturePath, assertedDirectCall]]).violations, []);
  assert.deepEqual(
    inspectNativeOwnerUniverse([[approvedFixturePath, assertedFunctionDirectCall]]).violations,
    []
  );
  assert.deepEqual(inspectNativeOwnerUniverse([[approvedFixturePath, typeOnlyQuery]]).violations, []);

  const runtimeLocalBridge = `import { resolveAutoWidthForDoors } from '../../shared/dimensions/wardrobe_default_resolution_policy.js';
export { resolveAutoWidthForDoors };`;
  assertViolation(
    approvedRuntimePath,
    runtimeLocalBridge,
    'focused-owner-local-bridge',
    'runtime local import-then-export'
  );
  assertViolation(
    approvedRuntimePath,
    runtimeLocalBridge,
    'invalid-focused-owner-dependency',
    'runtime local import is not a direct re-export'
  );

  const approvedRuntimeReexport = `export { isAutoWidthForDoors } from '../../shared/dimensions/wardrobe_default_resolution_policy.js';`;
  assert.deepEqual(
    inspectNativeOwnerUniverse([[approvedRuntimePath, approvedRuntimeReexport]]).violations,
    []
  );

  assertViolation(
    approvedFixturePath,
    `${approvedDirectCall}
import { getDefaultDoorsForWardrobeType } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    'dual-focused-and-facade-family-import',
    'named facade overlap'
  );
  assertViolation(
    approvedFixturePath,
    `${approvedDirectCall}
import * as legacyDimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
export const legacy = legacyDimensions;`,
    'dual-focused-and-facade-family-import',
    'namespace facade overlap'
  );
  assertViolation(
    approvedFixturePath,
    `${approvedDirectCall}
export async function loadLegacyDimensions() {
  return import('../../shared/wardrobe_dimension_tokens_shared.js');
}`,
    'dual-focused-and-facade-family-import',
    'dynamic facade overlap'
  );
  assertViolation(
    approvedFixturePath,
    `${approvedDirectCall}
import * as publicDimensions from '../features/dimensions/index.js';
export const legacyDimensions = publicDimensions;`,
    'dual-focused-and-facade-family-import',
    'public dimensions barrel namespace overlap'
  );

  const unapprovedFocusedConsumer = `import { resolveAutoWidthForDoors } from '../../../../shared/dimensions/wardrobe_default_resolution_policy.js';
export const width = resolveAutoWidthForDoors('hinged', 4);`;
  assertViolation(
    unapprovedFixturePath,
    unapprovedFocusedConsumer,
    'unapproved-focused-owner-consumer',
    'consumer outside approved universe'
  );
});
