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
const aggregateOwnerFiles = Object.freeze({
  DRAWER_SKETCH_POLICY: 'esm/shared/dimensions/drawer_sketch_policy.ts',
  EXTERNAL_DRAWER_POLICY: 'esm/shared/dimensions/external_drawer_policy.ts',
  INTERNAL_DRAWER_POLICY: 'esm/shared/dimensions/internal_drawer_policy.ts',
});
const aggregateOwnerTargets = new Map(
  Object.entries(aggregateOwnerFiles).map(([symbol, rel]) => [
    path.normalize(path.join(root, rel)).toLowerCase(),
    symbol,
  ])
);
const aggregateSymbols = new Set(Object.keys(aggregateOwnerFiles));
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

function isApprovedPublicProjection(file, dependency) {
  return (
    path.normalize(file).toLowerCase() === path.normalize(projectionBarrelAbsolute).toLowerCase() &&
    isFacadeTarget(file, dependency.specifier) &&
    dependency.syntax === 'static-re-export' &&
    dependency.importedSymbols.length === 1 &&
    dependency.importedSymbols[0] === '*'
  );
}

function findVariableDeclarator(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === name) result = node;
  });
  return result;
}

test('DRAWER_DIMENSIONS has no AST-visible production consumer or facade/barrel bypass', () => {
  const violations = [];
  const productionFiles = listSourceFiles(path.join(root, 'esm')).filter(
    file => path.normalize(file).toLowerCase() !== path.normalize(facadeAbsolute).toLowerCase()
  );

  for (const file of productionFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = createSourceFile(file, source);
    walkAst(sourceFile, node => {
      const symbol = identifierName(node);
      if (symbol === 'DRAWER_DIMENSIONS') {
        violations.push({ file: path.relative(root, file), kind: node.type, symbol });
      }
      const pathValue = memberPath(node);
      if (pathValue?.startsWith('DRAWER_DIMENSIONS.')) {
        violations.push({ file: path.relative(root, file), kind: 'member-chain', symbol: pathValue });
      }

      const specifier = moduleSpecifier(node);
      if (!isFacadeTarget(file, specifier) && !isProjectionBarrelTarget(file, specifier)) return;
      if (node.type === 'ImportDeclaration') {
        for (const imported of node.specifiers ?? []) {
          if (imported.type === 'ImportNamespaceSpecifier') {
            violations.push({ file: path.relative(root, file), kind: 'namespace-import' });
          }
          if (identifierName(imported.imported) === 'DRAWER_DIMENSIONS') {
            violations.push({ file: path.relative(root, file), kind: 'aliased-or-direct-import' });
          }
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const exported of node.specifiers ?? []) {
          if (identifierName(exported.local) === 'DRAWER_DIMENSIONS') {
            violations.push({ file: path.relative(root, file), kind: 'aliased-or-direct-re-export' });
          }
        }
      }
    });

    const analysis = analyzeModuleDependencies(file, source);
    for (const dependency of analysis.imports) {
      if (
        !isFacadeTarget(file, dependency.specifier) &&
        !isProjectionBarrelTarget(file, dependency.specifier)
      ) {
        continue;
      }
      if (isApprovedPublicProjection(file, dependency)) continue;
      if (
        dependency.syntax === 'dynamic-import' ||
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.includes('DRAWER_DIMENSIONS')
      ) {
        violations.push({
          file: path.relative(root, file),
          kind: dependency.syntax,
          symbols: dependency.importedSymbols,
        });
      }
    }
  }

  assert.deepEqual(violations, []);

  const barrelSourceFile = createSourceFile(projectionBarrelRel, read(projectionBarrelRel));
  assert.equal(barrelSourceFile.body.length, 1);
  assert.equal(barrelSourceFile.body[0]?.type, 'ExportAllDeclaration');
  assert.equal(isFacadeTarget(projectionBarrelAbsolute, moduleSpecifier(barrelSourceFile.body[0])), true);
});

test('Drawer aggregate owners remain definition/facade-only and cannot be bridged', () => {
  const violations = [];
  const occurrenceFiles = Object.fromEntries([...aggregateSymbols].map(symbol => [symbol, new Set()]));
  const productionFiles = listSourceFiles(path.join(root, 'esm'));

  for (const file of productionFiles) {
    const normalizedFile = path.normalize(file).toLowerCase();
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = createSourceFile(file, source);
    walkAst(sourceFile, node => {
      const symbol = identifierName(node);
      if (!aggregateSymbols.has(symbol)) return;
      occurrenceFiles[symbol].add(path.relative(root, file).replaceAll('\\', '/'));
      const expectedOwner = path.normalize(path.join(root, aggregateOwnerFiles[symbol])).toLowerCase();
      const isFacade = normalizedFile === path.normalize(facadeAbsolute).toLowerCase();
      if (normalizedFile !== expectedOwner && !isFacade) {
        violations.push({ file: path.relative(root, file), kind: node.type, symbol });
      }
    });

    const analysis = analyzeModuleDependencies(file, source);
    for (const dependency of analysis.imports) {
      const target = resolveModuleTarget(file, dependency.specifier);
      const targetAggregate = aggregateOwnerTargets.get(target);
      if (!targetAggregate) continue;
      const isFacade = normalizedFile === path.normalize(facadeAbsolute).toLowerCase();
      if (
        dependency.syntax === 'dynamic-import' ||
        dependency.importedSymbols.includes('*') ||
        (dependency.importedSymbols.includes(targetAggregate) && !isFacade)
      ) {
        violations.push({
          file: path.relative(root, file),
          kind: dependency.syntax,
          symbol: targetAggregate,
        });
      }
    }
  }

  assert.deepEqual(violations, []);
  assert.deepEqual(
    Object.fromEntries(Object.entries(occurrenceFiles).map(([symbol, files]) => [symbol, [...files].sort()])),
    {
      DRAWER_SKETCH_POLICY: [aggregateOwnerFiles.DRAWER_SKETCH_POLICY, facadeRel],
      EXTERNAL_DRAWER_POLICY: [aggregateOwnerFiles.EXTERNAL_DRAWER_POLICY, facadeRel],
      INTERNAL_DRAWER_POLICY: [aggregateOwnerFiles.INTERNAL_DRAWER_POLICY, facadeRel],
    }
  );
});

test('DRAWER_DIMENSIONS remains an exact frozen three-branch projection without numeric literals', () => {
  const source = read(facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const policyViews = new Map([
    ['DRAWER_SKETCH_DIMENSIONS', 'DRAWER_SKETCH_POLICY'],
    ['EXTERNAL_DRAWER_DIMENSIONS', 'EXTERNAL_DRAWER_POLICY'],
    ['INTERNAL_DRAWER_DIMENSIONS', 'INTERNAL_DRAWER_POLICY'],
  ]);
  for (const [viewName, ownerName] of policyViews) {
    const declaration = findVariableDeclarator(sourceFile, viewName);
    assert.ok(declaration, `missing ${viewName}`);
    assert.equal(declaration.parent?.kind, 'const');
    assert.equal(declaration.init?.type, 'CallExpression');
    assert.equal(identifierName(declaration.init?.callee), 'legacyDimensionNumberView');
    assert.deepEqual((declaration.init?.arguments ?? []).map(identifierName), [ownerName]);
  }

  const projection = findVariableDeclarator(sourceFile, 'DRAWER_DIMENSIONS');
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
      ['sketch', 'DRAWER_SKETCH_DIMENSIONS'],
      ['external', 'EXTERNAL_DRAWER_DIMENSIONS'],
      ['internal', 'INTERNAL_DRAWER_DIMENSIONS'],
    ]
  );

  const numericLiterals = [];
  walkAst(projection.init, node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
  });
  assert.deepEqual(numericLiterals, []);

  const valueExports = new Set(
    collectNamedModuleExports(facadeRel, source)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('DRAWER_DIMENSIONS'), true);
});

test('the public Drawer projection preserves owner identity, freezing, and serialization at runtime', () => {
  const probe = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `
        import { DRAWER_DIMENSIONS } from './esm/shared/wardrobe_dimension_tokens_shared.ts';
        import { DRAWER_SKETCH_POLICY } from './esm/shared/dimensions/drawer_sketch_policy.ts';
        import { EXTERNAL_DRAWER_POLICY } from './esm/shared/dimensions/external_drawer_policy.ts';
        import { INTERNAL_DRAWER_POLICY } from './esm/shared/dimensions/internal_drawer_policy.ts';
        const serialized = JSON.stringify(DRAWER_DIMENSIONS);
        const roundTrip = JSON.parse(serialized);
        process.stdout.write(JSON.stringify({
          sketchIdentity: DRAWER_DIMENSIONS.sketch === DRAWER_SKETCH_POLICY,
          externalIdentity: DRAWER_DIMENSIONS.external === EXTERNAL_DRAWER_POLICY,
          internalIdentity: DRAWER_DIMENSIONS.internal === INTERNAL_DRAWER_POLICY,
          frozen: Object.isFrozen(DRAWER_DIMENSIONS),
          serializable:
            typeof serialized === 'string' &&
            JSON.stringify(roundTrip) === serialized,
          keys: Object.keys(DRAWER_DIMENSIONS),
        }));
      `,
    ],
    { cwd: root, encoding: 'utf8' }
  );
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), {
    sketchIdentity: true,
    externalIdentity: true,
    internalIdentity: true,
    frozen: true,
    serializable: true,
    keys: ['sketch', 'external', 'internal'],
  });
});
