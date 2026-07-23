import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const facadeAbsolute = path.join(root, facadeRel);
const projectionBarrelRel = 'esm/native/features/dimensions/index.ts';
const projectionBarrelAbsolute = path.join(root, projectionBarrelRel);
const focusedOwnerFiles = Object.freeze([
  'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
  'esm/shared/dimensions/sketch_box_geometry_policy.ts',
  'esm/shared/dimensions/sketch_box_divider_policy.ts',
  'esm/shared/dimensions/sketch_box_dimension_overlay_policy.ts',
  'esm/shared/dimensions/sketch_box_preview_policy.ts',
  'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
]);
const legacySymbols = new Set(['SKETCH_BOX_DIMENSIONS', 'HANDLE_DIMENSIONS']);
const forbiddenBranches = new Set([
  'SKETCH_BOX_DIMENSIONS.preview',
  'SKETCH_BOX_DIMENSIONS.geometry',
  'SKETCH_BOX_DIMENSIONS.freePlacement',
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
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

function moduleSpecifier(node) {
  const source = node?.source;
  return source?.type === 'Literal' && typeof source.value === 'string' ? source.value : null;
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  let absolute;
  if (specifier.startsWith('@/')) absolute = path.join(root, 'esm', specifier.slice(2));
  else if (specifier.startsWith('.')) absolute = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  return path
    .normalize(absolute)
    .replace(/\.(?:js|mjs|cjs)$/u, '.ts')
    .toLowerCase();
}

function isFacadeTarget(fromFile, specifier) {
  return resolveModuleTarget(fromFile, specifier) === path.normalize(facadeAbsolute).toLowerCase();
}

function isProjectionBarrelTarget(fromFile, specifier) {
  return resolveModuleTarget(fromFile, specifier) === path.normalize(projectionBarrelAbsolute).toLowerCase();
}

function findVariableDeclarator(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === name) result = node;
  });
  return result;
}

test('Sketch Box legacy dimensions have no AST-visible production consumer or bypass path', () => {
  const violations = [];
  const productionFiles = listSourceFiles(path.join(root, 'esm')).filter(
    file => path.normalize(file).toLowerCase() !== path.normalize(facadeAbsolute).toLowerCase()
  );

  for (const file of productionFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = createSourceFile(file, source);
    walkAst(sourceFile, node => {
      if (node?.type === 'Identifier' && legacySymbols.has(node.name)) {
        violations.push({ file: path.relative(root, file), kind: 'identifier', symbol: node.name });
      }
      const pathValue = memberPath(node);
      if (pathValue && forbiddenBranches.has(pathValue)) {
        violations.push({ file: path.relative(root, file), kind: 'member', symbol: pathValue });
      }

      const specifier = moduleSpecifier(node);
      const targetsFacade = isFacadeTarget(file, specifier);
      const targetsProjectionBarrel = isProjectionBarrelTarget(file, specifier);
      if (!targetsFacade && !targetsProjectionBarrel) return;
      if (node.type === 'ImportDeclaration') {
        for (const imported of node.specifiers ?? []) {
          if (imported.type === 'ImportNamespaceSpecifier') {
            violations.push({ file: path.relative(root, file), kind: 'namespace-import' });
          }
          const importedName = identifierName(imported.imported);
          if (importedName && legacySymbols.has(importedName)) {
            violations.push({
              file: path.relative(root, file),
              kind: 'aliased-or-direct-import',
              symbol: importedName,
            });
          }
        }
      } else if (node.type === 'ExportAllDeclaration') {
        const isApprovedPublicProjection =
          path.normalize(file).toLowerCase() === path.normalize(projectionBarrelAbsolute).toLowerCase() &&
          targetsFacade;
        if (!isApprovedPublicProjection) {
          violations.push({ file: path.relative(root, file), kind: 'wildcard-re-export' });
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const exported of node.specifiers ?? []) {
          const localName = identifierName(exported.local);
          if (localName && legacySymbols.has(localName)) {
            violations.push({
              file: path.relative(root, file),
              kind: 'aliased-or-direct-re-export',
              symbol: localName,
            });
          }
        }
      }
    });

    const analysis = analyzeModuleDependencies(file, source);
    for (const dependency of analysis.imports) {
      const targetsFacade = isFacadeTarget(file, dependency.specifier);
      const targetsProjectionBarrel = isProjectionBarrelTarget(file, dependency.specifier);
      if (!targetsFacade && !targetsProjectionBarrel) continue;
      if (dependency.syntax === 'dynamic-import') {
        violations.push({ file: path.relative(root, file), kind: 'dynamic-import' });
      }
      for (const symbol of dependency.importedSymbols) {
        const isApprovedPublicProjection =
          path.normalize(file).toLowerCase() === path.normalize(projectionBarrelAbsolute).toLowerCase() &&
          targetsFacade &&
          dependency.syntax === 'static-re-export' &&
          symbol === '*';
        if (!isApprovedPublicProjection && (legacySymbols.has(symbol) || symbol === '*')) {
          violations.push({
            file: path.relative(root, file),
            kind: 'dependency-symbol',
            symbol,
          });
        }
      }
    }
  }

  assert.deepEqual(violations, []);

  const barrelSourceFile = createSourceFile(projectionBarrelRel, read(projectionBarrelRel));
  assert.equal(barrelSourceFile.body.length, 1);
  assert.equal(barrelSourceFile.body[0]?.type, 'ExportAllDeclaration');
  assert.equal(isFacadeTarget(projectionBarrelAbsolute, moduleSpecifier(barrelSourceFile.body[0])), true);
});

test('focused Sketch Box owner modules never depend on the legacy facade', () => {
  for (const rel of focusedOwnerFiles) {
    const file = path.join(root, rel);
    const analysis = analyzeModuleDependencies(file, read(rel));
    assert.equal(
      analysis.imports.some(dependency => isFacadeTarget(file, dependency.specifier)),
      false,
      `${rel} must not import or re-export the legacy dimension facade`
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
  }
});

test('SKETCH_BOX_DIMENSIONS remains an exact frozen policy projection without numeric literals', () => {
  const source = read(facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const policyViews = new Map([
    ['SKETCH_BOX_GEOMETRY_DIMENSIONS', 'SKETCH_BOX_GEOMETRY_POLICY'],
    ['SKETCH_BOX_DIVIDER_DIMENSIONS', 'SKETCH_BOX_DIVIDER_POLICY'],
    ['SKETCH_BOX_DIMENSION_OVERLAY_DIMENSIONS', 'SKETCH_BOX_DIMENSION_OVERLAY_POLICY'],
    ['SKETCH_BOX_PREVIEW_DIMENSIONS', 'SKETCH_BOX_PREVIEW_POLICY'],
    ['SKETCH_BOX_FREE_PLACEMENT_DIMENSIONS', 'SKETCH_BOX_FREE_PLACEMENT_POLICY'],
  ]);
  for (const [viewName, ownerName] of policyViews) {
    const declaration = findVariableDeclarator(sourceFile, viewName);
    assert.ok(declaration, `missing ${viewName}`);
    assert.equal(declaration.parent?.kind, 'const');
    assert.equal(declaration.init?.type, 'CallExpression');
    assert.equal(identifierName(declaration.init?.callee), 'legacyDimensionNumberView');
    assert.deepEqual((declaration.init?.arguments ?? []).map(identifierName), [ownerName]);
  }

  const projection = findVariableDeclarator(sourceFile, 'SKETCH_BOX_DIMENSIONS');
  assert.ok(projection);
  assert.equal(projection.parent?.kind, 'const');
  assert.equal(projection.parent?.parent?.type, 'ExportNamedDeclaration');
  assert.equal(projection.init?.type, 'CallExpression');
  assert.equal(memberPath(projection.init?.callee), 'Object.freeze');
  assert.equal(projection.init?.arguments?.length, 1);
  const objectExpression = projection.init?.arguments?.[0];
  assert.equal(objectExpression?.type, 'ObjectExpression');
  assert.deepEqual(
    (objectExpression?.properties ?? []).map(property => [
      identifierName(property.key),
      identifierName(property.value),
    ]),
    [
      ['geometry', 'SKETCH_BOX_GEOMETRY_DIMENSIONS'],
      ['dividers', 'SKETCH_BOX_DIVIDER_DIMENSIONS'],
      ['dimensionOverlay', 'SKETCH_BOX_DIMENSION_OVERLAY_DIMENSIONS'],
      ['preview', 'SKETCH_BOX_PREVIEW_DIMENSIONS'],
      ['freePlacement', 'SKETCH_BOX_FREE_PLACEMENT_DIMENSIONS'],
    ]
  );

  const numericLiterals = [];
  walkAst(projection.init, node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
  });
  assert.deepEqual(numericLiterals, []);

  const facadeExports = collectNamedModuleExports(facadeRel, source);
  const valueExports = new Set(
    facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)
  );
  const typeExports = new Set(
    facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('SKETCH_BOX_DIMENSIONS'), true);
  assert.equal(valueExports.size, 89);
  assert.equal(typeExports.size, 10);

  const previewOwnerExports = collectNamedModuleExports(focusedOwnerFiles[4], read(focusedOwnerFiles[4]));
  assert.equal(
    previewOwnerExports.some(
      entry => entry.kind === 'value' && entry.exportedName === 'SKETCH_BOX_PREVIEW_POLICY'
    ),
    true
  );
});

test('the public Sketch Box projection is frozen and JSON-serializable at runtime', () => {
  const probe = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `
        import { SKETCH_BOX_DIMENSIONS } from './esm/shared/wardrobe_dimension_tokens_shared.ts';
        const serialized = JSON.stringify(SKETCH_BOX_DIMENSIONS);
        const clone = structuredClone(SKETCH_BOX_DIMENSIONS);
        const roundTrip = JSON.parse(serialized);
        const isSerializableValue = value => {
          if (value == null || typeof value === 'string' || typeof value === 'boolean') return true;
          if (typeof value === 'number') return Number.isFinite(value);
          if (Array.isArray(value)) return value.every(isSerializableValue);
          if (typeof value !== 'object') return false;
          return Object.values(value).every(isSerializableValue);
        };
        process.stdout.write(JSON.stringify({
          frozen: Object.isFrozen(SKETCH_BOX_DIMENSIONS),
          serializable:
            typeof serialized === 'string' &&
            JSON.stringify(roundTrip) === serialized &&
            JSON.stringify(clone) === serialized &&
            isSerializableValue(SKETCH_BOX_DIMENSIONS),
          keys: Object.keys(SKETCH_BOX_DIMENSIONS),
        }));
      `,
    ],
    { cwd: root, encoding: 'utf8' }
  );
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), {
    frozen: true,
    serializable: true,
    keys: ['geometry', 'dividers', 'dimensionOverlay', 'preview', 'freePlacement'],
  });
});
