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
const structureTabAutoWidthPolicyRel = 'esm/shared/dimensions/structure_tab_auto_width_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const approvedNativeConsumerUniverse = new Set([
  'esm/native/features/order_pdf_dimension_support.ts',
  'esm/native/features/structure_tab_dimension_support.ts',
  'esm/native/kernel/domain_api_room_section_wardrobe.ts',
  'esm/native/runtime/api.ts',
]);
const approvedFocusedLocalNamedExports = new Map([
  [
    'esm/native/features/order_pdf_dimension_support.ts',
    new Set(['getDefaultDepthForWardrobeType', 'getDefaultDoorsForWardrobeType']),
  ],
  ['esm/native/features/structure_tab_dimension_support.ts', new Set(['getDefaultDepthForWardrobeType'])],
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
    if (
      parent?.type === 'ExportSpecifier' &&
      parent.local === node &&
      identifierName(parent.exported) === node.name &&
      approvedFocusedLocalNamedExports.get(rel)?.has(node.name)
    ) {
      return;
    }
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
          if (
            identifierName(specifier.exported) === localName &&
            approvedFocusedLocalNamedExports.get(rel)?.has(localName)
          ) {
            continue;
          }
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

test('private Structure Tab auto-width composition imports the exact focused owner pair', () => {
  const analysis = analyzeModuleDependencies(
    structureTabAutoWidthPolicyRel,
    read(structureTabAutoWidthPolicyRel)
  );
  assert.deepEqual(
    analysis.imports.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: dependency.importedSymbols,
      aliases: dependency.bindings
        .filter(binding => binding.importedName !== binding.localName)
        .map(binding => [binding.importedName, binding.localName]),
    })),
    [
      {
        specifier: './wardrobe_default_resolution_policy.js',
        kind: 'value',
        syntax: 'static-import',
        symbols: ['isAutoWidthForDoors', 'resolveAutoWidthForDoors'],
        aliases: [],
      },
    ]
  );
});

test('Domain API uses the exact focused resolver trio while preserving profile, fallback, and action-order semantics', () => {
  assert.deepEqual(inspectDomainApiConsumer(read(domainApiRel)), []);
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

  for (const publicRel of ['esm/native/runtime/api.ts']) {
    const source = read(publicRel);
    assert.equal(source.includes(platformPolicySymbol), false, publicRel);
    assert.equal(source.includes('platform_startup_dimension_defaults_policy'), false, publicRel);
  }
});
