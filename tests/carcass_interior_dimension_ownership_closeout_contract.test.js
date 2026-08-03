import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const symbol = 'CARCASS_INTERIOR_DIMENSIONS';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';

const ownerRel = 'esm/shared/dimensions/carcass_interior_policy.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const unitsOwnerRel = 'esm/shared/dimensions/units.ts';
const stackSplitOwnerRel = 'esm/shared/dimensions/stack_split_lower_setup_dimension_policy.ts';

const facadeAbsolute = path.join(root, facadeRel);
const ownerAbsolute = path.join(root, ownerRel);
const shellOwnerAbsolute = path.join(root, shellOwnerRel);
const unitsOwnerAbsolute = path.join(root, unitsOwnerRel);
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));
const sourceCache = new Map();
const sourceFileCache = new Map();
const analysisCache = new Map();

const expectedOwnerInventory = Object.freeze({
  'esm/native/builder/build_flow_plan.ts': Object.freeze([symbol]),
  'esm/native/builder/build_flow_plan_inputs.ts': Object.freeze([symbol]),
  [stackSplitOwnerRel]: Object.freeze([symbol]),
  'esm/native/builder/module_loop_pipeline_module_depth.ts': Object.freeze([symbol]),
});

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function sourceFor(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(file, 'utf8'));
  return sourceCache.get(file);
}

function sourceFileFor(file) {
  if (!sourceFileCache.has(file)) sourceFileCache.set(file, createSourceFile(file, sourceFor(file)));
  return sourceFileCache.get(file);
}

function analysisFor(file) {
  if (!analysisCache.has(file)) analysisCache.set(file, analyzeModuleDependencies(file, sourceFor(file)));
  return analysisCache.get(file);
}

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
    const replacements = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacements.map(sourceExtension => `${stem}${sourceExtension}`));
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }

  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === canonicalModuleTarget(target);
}

function focusedOwnerInventory() {
  const result = {};
  for (const file of esmSourceFiles) {
    const dependencies = analysisFor(file).imports.filter(dependency =>
      isTarget(file, dependency.specifier, ownerAbsolute)
    );
    if (!dependencies.length) continue;
    assert.equal(dependencies.length, 1, `${rel(file)} must use one Carcass Interior owner statement`);
    const [dependency] = dependencies;
    const fileRel = rel(file);
    const expectedSyntax = fileRel === stackSplitOwnerRel ? 'static-re-export' : 'static-import';
    assert.equal(dependency.kind, 'value', `${fileRel} must use a value import`);
    assert.equal(dependency.syntax, expectedSyntax, `${fileRel} must use its reviewed statement form`);
    assert.deepEqual(dependency.importedSymbols, [symbol], `${fileRel} imports only ${symbol}`);
    assert.deepEqual(
      dependency.bindings,
      [
        expectedSyntax === 'static-re-export'
          ? { importedName: symbol, localName: null, exportedName: symbol }
          : { importedName: symbol, localName: symbol, exportedName: null },
      ],
      `${fileRel} must preserve ${symbol} identity without aliases`
    );
    result[rel(file)] = dependency.importedSymbols;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function findVariableDeclarator(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === name) result = node;
  });
  return result;
}

function frozenObjectProperties(node) {
  assert.equal(node?.type, 'CallExpression');
  assert.equal(memberPath(node.callee), 'Object.freeze');
  assert.equal(node.arguments?.length, 1);
  assert.equal(node.arguments[0]?.type, 'ObjectExpression');
  return node.arguments[0].properties ?? [];
}

test('Carcass Interior focused-owner inventory is exact, static, value-only, and alias-free', () => {
  assert.deepEqual(focusedOwnerInventory(), expectedOwnerInventory);
});

test('Carcass Interior owner preserves its exact dependencies and frozen four-field definition', () => {
  const analysis = analysisFor(ownerAbsolute);
  assert.deepEqual(
    analysis.imports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      bindings,
    })),
    [
      {
        specifier: './carcass_shell_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
        bindings: [
          {
            importedName: 'CARCASS_SHELL_DIMENSIONS',
            localName: 'CARCASS_SHELL_DIMENSIONS',
            exportedName: null,
          },
        ],
      },
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['meters'],
        bindings: [{ importedName: 'meters', localName: 'meters', exportedName: null }],
      },
    ]
  );
  assert.equal(
    analysis.imports.some(dependency => isTarget(ownerAbsolute, dependency.specifier, facadeAbsolute)),
    false
  );
  assert.equal(
    analysis.imports.every(
      dependency =>
        isTarget(ownerAbsolute, dependency.specifier, shellOwnerAbsolute) ||
        isTarget(ownerAbsolute, dependency.specifier, unitsOwnerAbsolute)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);

  const sourceFile = sourceFileFor(ownerAbsolute);
  const declaration = findVariableDeclarator(sourceFile, symbol);
  assert.ok(declaration);
  assert.equal(declaration.parent?.kind, 'const');
  assert.equal(declaration.parent?.parent?.type, 'ExportNamedDeclaration');
  const properties = frozenObjectProperties(declaration.init);
  assert.deepEqual(
    properties.map(property => identifierName(property.key)),
    ['minTopBodyHeightM', 'slidingDepthReductionM', 'hingedDepthReductionM', 'internalBackInsetM']
  );
  assert.equal(memberPath(properties[0].value), 'CARCASS_SHELL_DIMENSIONS.bodyMinHeightM');
  assert.equal(identifierName(properties[1].value?.callee), 'meters');
  assert.deepEqual(
    properties[1].value?.arguments?.map(argument => argument.value),
    [0.12]
  );
  assert.equal(identifierName(properties[2].value?.callee), 'meters');
  assert.deepEqual(
    properties[2].value?.arguments?.map(argument => argument.value),
    [0.03]
  );
  assert.equal(memberPath(properties[3].value), 'CARCASS_SHELL_DIMENSIONS.internalBackInsetM');

  const objectExpressions = [];
  const spreads = [];
  const merges = [];
  const numericLiterals = [];
  const metersCalls = [];
  const freezeCalls = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'ObjectExpression') objectExpressions.push(node);
    if (node?.type === 'SpreadElement') spreads.push(node);
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
    if (node?.type === 'CallExpression' && identifierName(node.callee) === 'meters') metersCalls.push(node);
    if (node?.type === 'CallExpression' && memberPath(node.callee) === 'Object.freeze') {
      freezeCalls.push(node);
    }
    if (node?.type === 'CallExpression' && memberPath(node.callee) === 'Object.assign') merges.push(node);
  });
  assert.equal(objectExpressions.length, 1);
  assert.deepEqual(spreads, []);
  assert.deepEqual(merges, []);
  assert.deepEqual(numericLiterals, [0.12, 0.03]);
  assert.equal(metersCalls.length, 2);
  assert.deepEqual(
    metersCalls.map(call => call.arguments.map(argument => argument.value)),
    [[0.12], [0.03]]
  );
  assert.equal(freezeCalls.length, 1);
  assert.equal(freezeCalls[0], declaration.init);
  assert.doesNotMatch(
    sourceFor(ownerAbsolute),
    /wardrobe_dimension_tokens_shared|legacyDimensionNumberView/u
  );
});
