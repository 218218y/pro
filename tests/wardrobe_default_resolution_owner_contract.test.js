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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const approvedNativeConsumerUniverse = new Set([
  'esm/native/builder/state_sanitize_pipeline.ts',
  'esm/native/features/library_preset/module_defaults.ts',
  'esm/native/kernel/domain_api_room_section_wardrobe.ts',
  'esm/native/platform/platform_services.ts',
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
const facadeTarget = path.normalize(path.join(root, facadeRel)).toLowerCase();
const publicDimensionsTarget = path.normalize(path.join(root, publicDimensionsRel)).toLowerCase();

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

test('approved native consumer universe accepts any direct focused-owner subset without aliases or facade overlap', () => {
  const entries = listSourceFiles(path.join(root, 'esm/native')).map(file => [
    file,
    fs.readFileSync(file, 'utf8'),
  ]);
  assert.deepEqual(inspectNativeOwnerUniverse(entries).violations, []);
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
  const approvedFixturePath = path.join(root, 'esm/native/builder/state_sanitize_pipeline.ts');
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
