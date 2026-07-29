import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/material_thickness_policy.ts';
const publicFacadeRels = Object.freeze(['esm/native/features/dimensions/index.ts']);
const facadeAbsolute = path.join(root, facadeRel);
const publicFacadeAbsolutes = new Set(
  publicFacadeRels.map(rel => path.normalize(path.join(root, rel)).toLowerCase())
);
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

function isPublicFacadeTarget(fromFile, specifier) {
  return publicFacadeAbsolutes.has(resolveModuleTarget(fromFile, specifier));
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
  assert.equal(memberPath(node?.callee), 'Object.freeze');
  assert.equal(node?.arguments?.length, 1);
  const objectExpression = node.arguments[0];
  assert.equal(objectExpression?.type, 'ObjectExpression');
  return objectExpression.properties ?? [];
}

test('MATERIAL_DIMENSIONS has no AST-visible production consumer or facade/barrel bypass', () => {
  const violations = [];
  const facadeReexportFiles = new Set();
  const productionFiles = listSourceFiles(path.join(root, 'esm')).filter(
    file => path.normalize(file).toLowerCase() !== path.normalize(facadeAbsolute).toLowerCase()
  );

  for (const file of productionFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = createSourceFile(file, source);
    walkAst(sourceFile, node => {
      const symbol = identifierName(node);
      if (symbol === 'MATERIAL_DIMENSIONS') {
        violations.push({
          file: path.relative(root, file).replaceAll('\\', '/'),
          kind: node.type,
          symbol,
        });
      }
      const pathValue = memberPath(node);
      if (pathValue?.includes('MATERIAL_DIMENSIONS.')) {
        violations.push({
          file: path.relative(root, file).replaceAll('\\', '/'),
          kind: 'member-chain',
          symbol: pathValue,
        });
      }
    });

    const analysis = analyzeModuleDependencies(file, source);
    for (const dependency of analysis.imports) {
      if (
        isFacadeTarget(file, dependency.specifier) &&
        ['static-re-export', 'type-re-export'].includes(dependency.syntax)
      ) {
        facadeReexportFiles.add(path.relative(root, file).replaceAll('\\', '/'));
      }
      if (dependency.kind === 'type') continue;
      const targetsMaterialSurface =
        isFacadeTarget(file, dependency.specifier) || isPublicFacadeTarget(file, dependency.specifier);
      if (!targetsMaterialSurface) continue;
      if (
        dependency.syntax === 'dynamic-import' ||
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.includes('MATERIAL_DIMENSIONS')
      ) {
        const isApprovedFacadeProjection =
          path.normalize(file).toLowerCase() ===
            path.normalize(path.join(root, publicFacadeRels[0])).toLowerCase() &&
          isFacadeTarget(file, dependency.specifier) &&
          dependency.syntax === 'static-re-export' &&
          dependency.importedSymbols.length === 1 &&
          dependency.importedSymbols[0] === '*';
        if (!isApprovedFacadeProjection) {
          violations.push({
            file: path.relative(root, file).replaceAll('\\', '/'),
            kind: dependency.syntax,
            symbols: dependency.importedSymbols,
          });
        }
      }
    }
  }

  assert.deepEqual(violations, []);
  assert.deepEqual([...facadeReexportFiles].sort(), [...publicFacadeRels].sort());
});

test('Material Thickness owner is exact and has no dependency on the legacy facade', () => {
  const source = read(ownerRel);
  const sourceFile = createSourceFile(ownerRel, source);
  const analysis = analyzeModuleDependencies(path.join(root, ownerRel), source);

  assert.deepEqual(
    analysis.imports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['meters'],
      },
    ]
  );
  assert.equal(
    analysis.imports.some(dependency => isFacadeTarget(path.join(root, ownerRel), dependency.specifier)),
    false
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);

  const policy = findVariableDeclarator(sourceFile, 'MATERIAL_THICKNESS_POLICY');
  assert.ok(policy);
  assert.equal(policy.parent?.kind, 'const');
  assert.equal(policy.parent?.parent?.type, 'ExportNamedDeclaration');
  const branches = frozenObjectProperties(policy.init);
  assert.deepEqual(
    branches.map(branch => identifierName(branch.key)),
    ['wood', 'glassShelf']
  );
  for (const branch of branches) {
    const fields = frozenObjectProperties(branch.value);
    assert.deepEqual(
      fields.map(field => [identifierName(field.key), identifierName(field.value)]),
      [['thicknessM', 'MATERIAL_THICKNESS_M']]
    );
  }

  assert.match(
    source.replace(/\r\n/gu, '\n'),
    /export const MATERIAL_THICKNESS_POLICY = Object\.freeze\(\{\n  wood: Object\.freeze\(\{\n    thicknessM: MATERIAL_THICKNESS_M,\n  \}\),\n  glassShelf: Object\.freeze\(\{\n    thicknessM: MATERIAL_THICKNESS_M,\n  \}\),\n\}\);/u
  );
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|\bMATERIAL_DIMENSIONS\b/u);
});

test('public MATERIAL_DIMENSIONS remains the direct owner projection pending public-surface review', () => {
  const source = read(facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const projection = findVariableDeclarator(sourceFile, 'MATERIAL_DIMENSIONS');

  assert.ok(projection);
  assert.equal(projection.parent?.kind, 'const');
  assert.equal(projection.init?.type, 'CallExpression');
  assert.equal(identifierName(projection.init?.callee), 'legacyDimensionNumberView');
  assert.deepEqual((projection.init?.arguments ?? []).map(identifierName), ['MATERIAL_THICKNESS_POLICY']);
  assert.match(
    source,
    /const MATERIAL_DIMENSIONS = legacyDimensionNumberView\(MATERIAL_THICKNESS_POLICY\);/u
  );

  const forbiddenProjectionNodes = [];
  walkAst(projection.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ObjectExpression' ||
      (node?.type === 'Literal' && typeof node.value === 'number')
    ) {
      forbiddenProjectionNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenProjectionNodes, []);

  const valueExports = new Set(
    collectNamedModuleExports(facadeRel, source)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('MATERIAL_DIMENSIONS'), true);
});
