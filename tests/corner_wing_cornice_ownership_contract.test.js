import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const corniceOwnerRel = 'esm/shared/dimensions/carcass_cornice_render_policy.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const consumers = Object.freeze([
  'esm/native/builder/corner_wing_cornice_path.ts',
  'esm/native/builder/corner_wing_cornice_profile.ts',
  'esm/native/builder/corner_wing_cornice_wave.ts',
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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

function sourceFacts(consumerRel) {
  const source = read(consumerRel);
  const sourceFile = createSourceFile(consumerRel, source);
  const memberCounts = new Map();
  const declarations = new Map();
  const numericLiterals = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
    }
    if (node?.type === 'VariableDeclarator') {
      const name = identifierName(node.id);
      if (name) declarations.set(name, memberPath(node.init));
    }
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
  });
  numericLiterals.sort((left, right) => left - right);
  return { source, sourceFile, memberCounts, declarations, numericLiterals };
}

function subtreeContainsOwner(node) {
  let found = false;
  walkAst(node, child => {
    const name = identifierName(child);
    if (name === 'CARCASS_CORNICE_RENDER_POLICY' || name === 'CARCASS_SHELL_DIMENSIONS') found = true;
  });
  return found;
}

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CARCASS_CORNICE_DIMENSIONS', 'CARCASS_SHELL_DIMENSIONS'],
  syntax: 'static-import',
});

function expectedEntry({ fromFile, flow }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-26',
    reviewBy: '2026-10-18',
    fromFile,
    companionImport: {
      toFile: corniceOwnerRel,
      kind: 'value',
      importedSymbols: ['CARCASS_CORNICE_RENDER_POLICY'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile: shellOwnerRel,
      kind: 'value',
      importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
      syntax: 'static-import',
    },
    reason: `The Corner Wing Cornice ${flow} flow replaces one legacy facade statement with the focused Carcass Cornice Render owner plus the focused Carcass Shell owner on the existing builder to shared edge.`,
    removalCondition: `Remove this entry when a reviewed Corner Wing Cornice ${flow} composition seam eliminates the extra Carcass Shell statement without reintroducing the legacy facade.`,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({ fromFile: consumers[0], flow: 'path' }),
  expectedEntry({ fromFile: consumers[1], flow: 'profile' }),
  expectedEntry({ fromFile: consumers[2], flow: 'wave' }),
]);

test('Corner Wing Cornice trio imports exactly the focused Cornice Render and Carcass Shell owners', () => {
  for (const consumerRel of consumers) {
    const source = read(consumerRel);
    const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
    const sharedImports = analysis.imports.filter(dependency =>
      dependency.specifier.includes('../../shared/')
    );

    assert.deepEqual(
      sharedImports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
        specifier,
        kind,
        syntax,
        importedSymbols,
        bindings,
      })),
      [
        {
          specifier: '../../shared/dimensions/carcass_cornice_render_policy.js',
          kind: 'value',
          syntax: 'static-import',
          importedSymbols: ['CARCASS_CORNICE_RENDER_POLICY'],
          bindings: [
            {
              importedName: 'CARCASS_CORNICE_RENDER_POLICY',
              localName: 'CARCASS_CORNICE_RENDER_POLICY',
              exportedName: null,
            },
          ],
        },
        {
          specifier: '../../shared/dimensions/carcass_shell_policy.js',
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
      ],
      consumerRel
    );
    assert.equal(sharedImports.length, 2, consumerRel);
    assert.deepEqual(analysis.unresolvedDynamicImports, [], consumerRel);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], consumerRel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u, consumerRel);
    assert.doesNotMatch(source, /\bCARCASS_CORNICE_DIMENSIONS\b/u, consumerRel);
    assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u, consumerRel);
  }
});

test('Corner Wing Cornice branch and Shell field mappings remain direct and semantic', () => {
  const pathFacts = sourceFacts(consumers[0]);
  assert.equal(pathFacts.declarations.get('CORNICE_COMMON'), 'CARCASS_CORNICE_RENDER_POLICY.common');
  assert.equal(pathFacts.declarations.get('CORNICE_PROFILE'), 'CARCASS_CORNICE_RENDER_POLICY.profile');
  assert.equal(pathFacts.memberCounts.get('CARCASS_SHELL_DIMENSIONS.frontInsetZM'), 5);

  const profileFacts = sourceFacts(consumers[1]);
  assert.equal(profileFacts.declarations.get('corniceCommon'), 'CARCASS_CORNICE_RENDER_POLICY.common');
  assert.equal(profileFacts.declarations.get('corniceProfile'), 'CARCASS_CORNICE_RENDER_POLICY.profile');
  assert.equal(profileFacts.memberCounts.get('CARCASS_SHELL_DIMENSIONS.frontInsetZM'), 1);
  assert.equal(profileFacts.memberCounts.get('corniceCommon.yLiftM'), 2);
  assert.equal(profileFacts.memberCounts.get('args.yLiftM'), 3);

  const waveFacts = sourceFacts(consumers[2]);
  assert.equal(waveFacts.declarations.get('corniceCommon'), 'CARCASS_CORNICE_RENDER_POLICY.common');
  assert.equal(waveFacts.declarations.get('corniceWave'), 'CARCASS_CORNICE_RENDER_POLICY.wave');
  assert.equal(waveFacts.memberCounts.get('CARCASS_SHELL_DIMENSIONS.frontInsetZM'), 1);
  assert.equal(waveFacts.memberCounts.get('corniceCommon.yLiftM'), 2);
  assert.equal(waveFacts.memberCounts.get('args.yLiftM'), 3);
});

test('Corner Wing Cornice migration introduces no copied policy, wrapper, merge, or numeric replacement', () => {
  const expectedNumericLiteralHashes = new Map([
    [consumers[0], 'e29aaade275aa51e699622fd145b022dc19f9894ee57b4d2e632c3d7bff28c17'],
    [consumers[1], 'aebbccd22cdd51ec13dfeae0cdaf59a0832d8f1334ad15e0b56ba3ef3fc87ba3'],
    [consumers[2], '9efb2cc295aec962de605e59c08ad84236e917cb135979b2a70d9120635aeffb'],
  ]);

  for (const consumerRel of consumers) {
    const facts = sourceFacts(consumerRel);
    const violations = [];
    walkAst(facts.sourceFile, node => {
      if (node?.type === 'SpreadElement' && subtreeContainsOwner(node.argument)) {
        violations.push('owner-spread');
      }
      if (node?.type === 'VariableDeclarator' && node.init?.type === 'ObjectExpression') {
        if (subtreeContainsOwner(node.init)) violations.push('owner-copy');
      }
      if (node?.type === 'CallExpression') {
        const callee = memberPath(node.callee) ?? identifierName(node.callee);
        if (
          ['Object.assign', 'Object.freeze', 'structuredClone', 'legacyDimensionNumberView'].includes(
            callee
          ) &&
          (node.arguments ?? []).some(subtreeContainsOwner)
        ) {
          violations.push(`owner-wrapper:${callee}`);
        }
      }
    });

    assert.deepEqual(violations, [], consumerRel);
    assert.doesNotMatch(
      facts.source,
      /\b(?:CARCASS_CORNICE_POLICY|CARCASS_CORNICE_DIMENSIONS_OWNER|CARCASS_SHELL_POLICY)\b/u,
      consumerRel
    );
    assert.equal(
      createHash('sha256').update(JSON.stringify(facts.numericLiterals)).digest('hex'),
      expectedNumericLiteralHashes.get(consumerRel),
      `${consumerRel} numeric literal inventory`
    );
  }
});

test('Corner Wing Cornice appends exactly Entries 152-154 after the unchanged 151-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 151)),
    'e9e9c2b5c6446497ce5f8d3c9b4258b99a33ea23846a2f998c11375d10e03897'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(151, 154), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 154)),
    '0398ae9924f577c2f06a0293feac49f8a70eff80274c22717a9624421cdf5ef0'
  );
});
