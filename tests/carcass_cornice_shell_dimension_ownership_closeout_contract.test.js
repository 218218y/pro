import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';

const corniceOwnerRel = 'esm/shared/dimensions/carcass_cornice_render_policy.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const shellIdentityReexportOwners = new Set([
  'esm/shared/dimensions/core_carcass_dimension_policy.ts',
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
]);
const facadeAbsolute = path.join(root, facadeRel);

const corniceOwnerAbsolute = path.join(root, corniceOwnerRel);
const shellOwnerAbsolute = path.join(root, shellOwnerRel);
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

const expectedCorniceInventory = Object.freeze({
  'esm/native/builder/corner_connector_cornice_plan.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_cornice_shared.ts': Object.freeze(['CARCASS_CORNICE_COMMON_POLICY']),
  'esm/native/builder/corner_cornice_profile_plan.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_cornice_render.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cornice_plan.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/core_carcass_cornice.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
});

const expectedShellInventory = Object.freeze({
  'esm/native/builder/carcass_pipeline.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/core_carcass_dimension_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/core_carcass_shell.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_cornice_plan.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/module_loop_pipeline_hex_cell.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/module_loop_pipeline_module_depth.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts': Object.freeze([
    'CARCASS_SHELL_DIMENSIONS',
  ]),
  'esm/shared/dimensions/carcass_interior_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
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

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === canonicalModuleTarget(target);
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

function ownerInventory(ownerRel) {
  const ownerAbsolute = path.join(root, ownerRel);
  const result = {};
  for (const file of esmSourceFiles) {
    const dependencies = analysisFor(file).imports.filter(dependency =>
      isTarget(file, dependency.specifier, ownerAbsolute)
    );
    if (!dependencies.length) continue;
    assert.equal(dependencies.length, 1, `${rel(file)} must use one ${ownerRel} statement`);
    const [dependency] = dependencies;
    assert.equal(dependency.kind, 'value', `${rel(file)} must use a value import from ${ownerRel}`);
    const fileRel = rel(file);
    const expectedSyntax = shellIdentityReexportOwners.has(fileRel) ? 'static-re-export' : 'static-import';
    assert.equal(
      dependency.syntax,
      expectedSyntax,
      `${fileRel} must use its reviewed statement form from ${ownerRel}`
    );
    assert.equal(
      dependency.bindings.every(binding =>
        expectedSyntax === 'static-re-export'
          ? binding.localName === null && binding.importedName === binding.exportedName
          : binding.importedName === binding.localName && binding.exportedName === null
      ),
      true,
      `${fileRel} must preserve unaliased ${ownerRel} identity`
    );
    result[rel(file)] = dependency.importedSymbols;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

test('Carcass Cornice and Carcass Shell focused-owner inventories are exact and alias-free', () => {
  assert.deepEqual(ownerInventory(corniceOwnerRel), expectedCorniceInventory);
  assert.deepEqual(ownerInventory(shellOwnerRel), expectedShellInventory);
});

test('Cornice and Shell owners retain exact dependencies and direct frozen owner shapes', () => {
  const expectedDependencies = new Map([
    [corniceOwnerRel, ['./material_thickness_policy.js', './units.js']],
    [shellOwnerRel, ['./carcass_interior_grid_policy.js', './units.js']],
  ]);

  for (const [ownerRel, expectedSpecifiers] of expectedDependencies) {
    const ownerAbsolute = path.join(root, ownerRel);
    const analysis = analysisFor(ownerAbsolute);
    assert.deepEqual(
      [...new Set(analysis.imports.map(dependency => dependency.specifier))],
      expectedSpecifiers,
      ownerRel
    );
    assert.equal(
      analysis.imports.some(dependency => isTarget(ownerAbsolute, dependency.specifier, facadeAbsolute)),
      false,
      ownerRel
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, [], ownerRel);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], ownerRel);
  }

  const corniceOwner = sourceFileFor(corniceOwnerAbsolute);
  const corniceAggregate = findVariableDeclarator(corniceOwner, 'CARCASS_CORNICE_RENDER_POLICY');
  assert.ok(corniceAggregate);
  assert.equal(corniceAggregate.parent?.kind, 'const');
  assert.equal(corniceAggregate.parent?.parent?.type, 'ExportNamedDeclaration');
  const corniceProperties = frozenObjectProperties(corniceAggregate.init);
  assert.deepEqual(
    corniceProperties.map(property => [identifierName(property.key), identifierName(property.value)]),
    [
      ['common', 'CARCASS_CORNICE_COMMON_POLICY'],
      ['wave', 'CARCASS_CORNICE_WAVE_POLICY'],
      ['profile', 'CARCASS_CORNICE_PROFILE_POLICY'],
    ]
  );

  const forbiddenCorniceNodes = [];
  walkAst(corniceAggregate.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== corniceAggregate.init) ||
      (node?.type === 'ObjectExpression' && node !== corniceAggregate.init.arguments[0])
    ) {
      forbiddenCorniceNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenCorniceNodes, []);

  const shellOwner = sourceFileFor(shellOwnerAbsolute);
  const shellDeclaration = findVariableDeclarator(shellOwner, 'CARCASS_SHELL_DIMENSIONS');
  assert.ok(shellDeclaration);
  assert.equal(shellDeclaration.parent?.kind, 'const');
  assert.equal(shellDeclaration.parent?.parent?.type, 'ExportNamedDeclaration');
  assert.deepEqual(
    frozenObjectProperties(shellDeclaration.init).map(property => identifierName(property.key)),
    [
      'frontInsetZM',
      'backInsetZM',
      'boardMinDimensionM',
      'boardMinDepthM',
      'bodyMinDepthM',
      'bodyMinHeightM',
      'floorCeilWidthClearanceM',
      'backPanelWidthClearanceM',
      'backPanelSegmentWidthClearanceM',
      'backPanelThicknessM',
      'backPanelZM',
      'sideDepthClearanceM',
      'sideZOffsetM',
      'internalBackInsetM',
      'drawerGridDivisions',
      'drawerSplitGridLineIndex',
    ]
  );
});
