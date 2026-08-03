import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionRel = 'esm/native/features/library_preset/module_defaults.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const libraryOwnerRel = 'esm/shared/dimensions/library_preset_policy.ts';
const defaultResolutionOwnerRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const compositionOwnerRel = 'esm/shared/dimensions/library_preset_module_defaults_dimension_policy.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const fieldCounts = Object.freeze({
  defaultDoorsCount: 1,
  topGridDivisions: 2,
  lowerGridDivisions: 1,
  defaultModuleDoorsCount: 2,
});
const protectedFields = new Set(Object.keys(fieldCounts));
const focusedSymbols = new Set(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', 'resolveAutoWidthForDoors']);
const aggregateSymbols = new Set([
  'LIBRARY_PRESET_POLICY',
  'LIBRARY_PRESET_LAYOUT_POLICY',
  'WARDROBE_DEFAULTS',
  'WARDROBE_LAYOUT_DIMENSIONS',
]);
const expectedNumericLiterals = Object.freeze([1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
const expectedExports = Object.freeze([
  'LIBRARY_PRESET_DEFAULT_DOORS',
  'LIBRARY_PRESET_DOOR_WIDTH_CM',
  'calcLibraryPresetAutoWidth',
  'createLibraryTopModuleConfig',
  'createLibraryLowerModuleConfig',
  'buildLibraryModuleCfgs',
]);
const expectedFunctions = Object.freeze([
  'calcLibraryPresetAutoWidth',
  'normalizeDoors',
  'createLibraryModuleConfig',
  'createLibraryTopModuleConfig',
  'createLibraryLowerModuleConfig',
  'buildLibraryModuleCfgs',
]);
const expectedPrivateHelpers = Object.freeze(['normalizeDoors', 'createLibraryModuleConfig']);
const expectedSignatures = Object.freeze({
  calcLibraryPresetAutoWidth: {
    params: [['doors', false, 'unknown']],
    returnType: 'number',
  },
  normalizeDoors: {
    params: [['raw', false, 'unknown']],
    returnType: 'number',
  },
  createLibraryModuleConfig: {
    params: [
      ['doors', false, 'number'],
      ['options', false, '{ gridDivisions: number; shelves: boolean[] }'],
    ],
    returnType: 'ModuleConfigLike',
  },
  createLibraryTopModuleConfig: {
    params: [['doors', false, 'number']],
    returnType: 'NormalizedTopModuleConfigLike',
  },
  createLibraryLowerModuleConfig: {
    params: [['doors', false, 'number']],
    returnType: 'ModuleConfigLike',
  },
  buildLibraryModuleCfgs: {
    params: [
      ['topDoorsSig', false, 'number[]'],
      ['bottomDoorsSig', false, 'number[]'],
    ],
    returnType: '{ topCfgList: ModulesConfigurationLike; bottomCfgList: ModulesConfigurationLike; }',
  },
});
const expectedFunctionHashes = Object.freeze({
  calcLibraryPresetAutoWidth: '8c25fc2fb18291a34ccf9e1a5aba5ccea2d979aefd40a2203641ed0577b6611a',
  normalizeDoors: 'de28dbfdc91adc50cf18afaca4c4c1c3bb4cef13891397bdaf68ef3ca2fd4ff0',
  createLibraryModuleConfig: '276bd392c5d5134c6818a30bed9f09b4a4cd2f7112f1ef03e682a5192c379c5b',
  createLibraryTopModuleConfig: '6af335f495cf238faa20342deb47f296ee4be354647c09f45d119d25b8df9ca2',
  createLibraryLowerModuleConfig: '76d323ea5b820ddeac7f0e685a48f05ee33397e61bf4bd8f28fbd751da51a23c',
  buildLibraryModuleCfgs: 'f939edfc22edff382150ef3e65641e59d16cbf85fd26e827e1d3cc4fb7ffd9c4',
});
const expectedProductionBodyHash = '67304dd6ac0c0879173eb2072daa337cd989a7fc2b9156c4ebd074d4500f846c';

const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
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

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (
    value.type === 'Identifier' &&
    (value.name === 'LIBRARY_PRESET_DIMENSIONS' || value.name === 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY')
  ) {
    return {
      type: 'Identifier',
      name: 'libraryPresetModuleDefaults',
    };
  }
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
  const clean = stripQueryHash(specifier);
  if (!clean.startsWith('.')) return null;
  const raw = path.resolve(path.dirname(fromFile), clean);
  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];
  if (!extension) {
    for (const candidateExtension of sourceFileExtensions) {
      candidates.push(`${raw}${candidateExtension}`, path.join(raw, `index${candidateExtension}`));
    }
  } else {
    const stem = raw.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension] ?? []) {
      candidates.push(`${stem}${candidateExtension}`);
    }
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : canonicalModuleTarget(raw);
}

const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
const libraryOwnerTarget = canonicalModuleTarget(path.join(root, libraryOwnerRel));
const defaultResolutionOwnerTarget = canonicalModuleTarget(path.join(root, defaultResolutionOwnerRel));
const compositionOwnerTarget = canonicalModuleTarget(path.join(root, compositionOwnerRel));
const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));

function isImportIdentifier(node) {
  return [
    'ImportSpecifier',
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
    'ExportSpecifier',
  ].includes(node?.parent?.type);
}

function subtreeOwnerSymbols(node) {
  const symbols = new Set();
  walkAst(node, child => {
    const name = identifierName(child);
    if (focusedSymbols.has(name) || aggregateSymbols.has(name)) {
      symbols.add(name);
    }
  });
  return symbols;
}

function inspectOwnership(file, source) {
  const sourceFile = createSourceFile(productionRel, source);
  const analysis = analyzeModuleDependencies(file, source);
  const violations = [];
  const seen = new Set();
  const memberCounts = new Map();
  const autoWidthCalls = [];
  const addViolation = (kind, node, detail = '') => {
    const key = `${kind}:${node?.start ?? -1}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({ kind, detail, start: node?.start ?? -1 });
  };

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    const relevantTarget = [
      facadeTarget,
      libraryOwnerTarget,
      defaultResolutionOwnerTarget,
      compositionOwnerTarget,
      publicDimensionsTarget,
    ].includes(target);
    const relatedSymbols = dependency.importedSymbols.filter(
      symbol =>
        focusedSymbols.has(symbol) || aggregateSymbols.has(symbol) || symbol === 'LIBRARY_PRESET_DIMENSIONS'
    );

    if (target === facadeTarget) {
      addViolation('legacy-facade-import', {
        start: dependency.statementStart,
      });
    }
    if (target === publicDimensionsTarget) {
      addViolation('public-dimensions-barrel', {
        start: dependency.statementStart,
      });
    }
    if (relevantTarget && path.extname(stripQueryHash(dependency.specifier)) === '') {
      addViolation('extensionless-ownership-path', {
        start: dependency.statementStart,
      });
    }
    if (dependency.kind === 'dynamic' && relevantTarget) {
      addViolation('dynamic-owner-import', {
        start: dependency.statementStart,
      });
    }
    if (dependency.bindings.some(binding => binding.importedName === '*') && relevantTarget) {
      addViolation('namespace-owner-import', {
        start: dependency.statementStart,
      });
    }
    if (dependency.exportedSymbols.length > 0 && relevantTarget) {
      addViolation('focused-owner-bridge', {
        start: dependency.statementStart,
      });
    }
    if (relatedSymbols.includes('LIBRARY_PRESET_DIMENSIONS')) {
      addViolation('legacy-library-preset-symbol', {
        start: dependency.statementStart,
      });
    }
    for (const symbol of relatedSymbols.filter(symbol => aggregateSymbols.has(symbol))) {
      addViolation('aggregate-owner-import', { start: dependency.statementStart }, symbol);
    }
    for (const binding of dependency.bindings) {
      if (focusedSymbols.has(binding.importedName) && binding.localName !== binding.importedName) {
        addViolation(
          'focused-owner-alias',
          { start: dependency.statementStart },
          `${binding.importedName} as ${binding.localName}`
        );
      }
    }
    if (
      dependency.importedSymbols.includes('LIBRARY_PRESET_MODULE_DEFAULTS_POLICY') &&
      target !== compositionOwnerTarget
    ) {
      addViolation('wrong-focused-owner-path', { start: dependency.statementStart }, dependency.specifier);
    }
    if (
      dependency.importedSymbols.includes('resolveAutoWidthForDoors') &&
      target !== compositionOwnerTarget
    ) {
      addViolation('wrong-focused-owner-path', { start: dependency.statementStart }, dependency.specifier);
    }
    if (relatedSymbols.length > 0 && (dependency.kind !== 'value' || dependency.syntax !== 'static-import')) {
      addViolation('non-static-value-owner-import', { start: dependency.statementStart }, dependency.syntax);
    }
  }

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) {
        memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
      }
      const field = staticMemberName(node);
      if (field && protectedFields.has(field) && value !== `LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.${field}`) {
        addViolation('wrong-field-owner', node, value ?? field);
      }
    }

    if (node?.type === 'Identifier' && node.name === 'LIBRARY_PRESET_DIMENSIONS') {
      addViolation('legacy-library-preset-symbol', node);
    }
    if (node?.type === 'Identifier' && aggregateSymbols.has(node.name) && !isImportIdentifier(node)) {
      addViolation('aggregate-owner-use', node, node.name);
    }
    if (
      node?.type === 'Identifier' &&
      node.name === 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY' &&
      !isImportIdentifier(node)
    ) {
      const parent = node.parent;
      const field =
        parent?.type === 'MemberExpression' && parent.object === node ? staticMemberName(parent) : null;
      if (!field || !protectedFields.has(field) || parent.computed) {
        addViolation('focused-owner-wrapper', node, parent?.type ?? 'unknown');
      }
    }
    if (
      node?.type === 'Identifier' &&
      node.name === 'resolveAutoWidthForDoors' &&
      !isImportIdentifier(node)
    ) {
      const parent = node.parent;
      if (parent?.type === 'CallExpression' && parent.callee === node) {
        autoWidthCalls.push(parent);
        if (parent.arguments[0]?.type !== 'Literal' || parent.arguments[0].value !== 'hinged') {
          addViolation('wrong-auto-width-wardrobe-type', parent);
        }
      } else {
        addViolation('focused-owner-wrapper', node, parent?.type ?? 'unknown');
      }
    }
    if (node?.type !== 'VariableDeclarator' || !node.init) return;
    const roots = subtreeOwnerSymbols(node.init);
    if (node.init.type === 'ObjectExpression' && roots.size > 0) {
      addViolation('local-owner-aggregate', node, [...roots].sort().join(','));
    }
    if (
      node.init.type === 'Identifier' &&
      (focusedSymbols.has(node.init.name) || aggregateSymbols.has(node.init.name))
    ) {
      addViolation('local-owner-copy', node, node.init.name);
    }
  });

  return {
    analysis,
    autoWidthCalls,
    memberCounts,
    sourceFile,
    violations,
  };
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

function sourceFacts(source) {
  const sourceFile = createSourceFile(productionRel, source);
  const functions = new Map();
  const numericLiterals = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') {
      numericLiterals.push(node.value);
    }
    if (node?.type === 'FunctionDeclaration') {
      functions.set(identifierName(node.id), node);
    }
  });

  const functionHashes = {};
  const signatures = {};
  for (const [name, node] of functions) {
    functionHashes[name] = semanticSha256(canonicalSemanticAst(node));
    signatures[name] = signatureFor(source, node);
  }
  const body = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  return {
    bodyHash: semanticSha256(canonicalSemanticAst(body)),
    functionHashes,
    functionNames: [...functions.keys()],
    numericLiterals,
    signatures,
  };
}

test('Library Preset Module Defaults is one exact consumer with one composition-owner import', () => {
  const source = read(productionRel);
  const inspection = inspectOwnership(path.join(root, productionRel), source);
  assert.deepEqual(inspection.violations, []);

  const focusedImports = inspection.analysis.imports.filter(
    dependency =>
      dependency.importedSymbols.includes('LIBRARY_PRESET_MODULE_DEFAULTS_POLICY') ||
      dependency.importedSymbols.includes('resolveAutoWidthForDoors')
  );
  assert.deepEqual(
    focusedImports.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      bindings: dependency.bindings.map(binding => [
        binding.importedName,
        binding.localName,
        binding.exportedName,
      ]),
    })),
    [
      {
        specifier: '../../../shared/dimensions/library_preset_module_defaults_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', 'resolveAutoWidthForDoors'],
        bindings: [
          ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', null],
          ['resolveAutoWidthForDoors', 'resolveAutoWidthForDoors', null],
        ],
      },
    ]
  );
  for (const [field, count] of Object.entries(fieldCounts)) {
    assert.equal(
      inspection.memberCounts.get(`LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.${field}`) ?? 0,
      count,
      field
    );
  }
  assert.equal(inspection.autoWidthCalls.length, 2);
  assert.equal(
    inspection.autoWidthCalls.every(
      call => call.arguments[0]?.type === 'Literal' && call.arguments[0].value === 'hinged'
    ),
    true
  );
});

test('Library Preset Module Defaults preserves exports, helpers, signatures, shapes, literals, and historical semantics', () => {
  const source = read(productionRel);
  const facts = sourceFacts(source);
  assert.deepEqual(facts.functionNames, expectedFunctions);
  assert.deepEqual(
    facts.functionNames.filter(name => !expectedExports.includes(name)),
    expectedPrivateHelpers
  );
  assert.deepEqual(facts.numericLiterals, expectedNumericLiterals);
  assert.deepEqual(facts.signatures, expectedSignatures);
  assert.deepEqual(facts.functionHashes, expectedFunctionHashes);
  assert.equal(facts.bodyHash, expectedProductionBodyHash);
  assert.deepEqual(
    collectNamedModuleExports(productionRel, source).map(entry => [entry.exportedName, entry.kind]),
    expectedExports.map(name => [name, 'value'])
  );
});
