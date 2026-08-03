import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/material_thickness_policy.ts';

const facadeAbsolute = path.join(root, facadeRel);

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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
