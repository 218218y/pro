import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerSpecifier = '../../shared/dimensions/chest_mode_policy.js';
const pipelineRel = 'esm/native/builder/chest_mode_pipeline.ts';
const drawerBoxRel = 'esm/native/builder/visuals_chest_mode_drawer_box.ts';
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

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

function assertExactFocusedOwnerImport(rel, expectedSymbol) {
  const source = read(rel);
  const analysis = analyzeModuleDependencies(path.join(root, rel), source);
  const ownerImports = analysis.imports.filter(dependency => dependency.specifier === ownerSpecifier);

  assert.deepEqual(
    ownerImports.map(({ kind, syntax, importedSymbols }) => ({ kind, syntax, importedSymbols })),
    [{ kind: 'value', syntax: 'static-import', importedSymbols: [expectedSymbol] }]
  );
  assert.equal(
    ownerImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
  assert.doesNotMatch(
    source,
    /\b(?:CHEST_MODE_DIMENSIONS|CHEST_MODE_COMMODE_POLICY|CHEST_MODE_DRAWER_BOX_POLICY)\b/u
  );
}

function builderAggregateConsumers() {
  return listSourceFiles(path.join(root, 'esm/native/builder'))
    .flatMap(file => {
      const analysis = analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'));
      return analysis.imports.some(
        dependency =>
          dependency.syntax === 'static-import' &&
          dependency.importedSymbols.includes('CHEST_MODE_DIMENSIONS')
      )
        ? [path.relative(root, file).replaceAll(path.sep, '/')]
        : [];
    })
    .sort();
}

test('Chest Mode builder pair imports exactly one focused owner each without aggregate aliases', () => {
  assertExactFocusedOwnerImport(pipelineRel, 'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY');
  assertExactFocusedOwnerImport(drawerBoxRel, 'CHEST_MODE_DRAWER_BOX_RENDER_POLICY');

  assert.doesNotMatch(
    read(drawerBoxRel),
    /const\s+[A-Za-z_$][\w$]*\s*=\s*CHEST_MODE_DRAWER_BOX_RENDER_POLICY\s*;/u
  );
  assert.doesNotMatch(
    read(pipelineRel),
    /const\s+[A-Za-z_$][\w$]*\s*=\s*CHEST_MODE_COMMODE_CONSTRAINTS_POLICY\s*;/u
  );
});

test('Chest Mode pipeline and drawer-box formulas read every value directly from the focused owner', () => {
  const pipeline = read(pipelineRel);
  const drawerBox = read(drawerBoxRel);

  assert.match(
    pipeline,
    /chestCommodeMirrorHeightCm:\s*ui\.chestCommodeMirrorHeightCm \?\?\s*CHEST_MODE_COMMODE_CONSTRAINTS_POLICY\.defaultMirrorHeightCm/u
  );
  assert.doesNotMatch(pipeline, /CHEST_MODE_COMMODE_CONSTRAINTS_POLICY\s*\[/u);

  for (const field of [
    'panelThicknessM',
    'accentZOffsetM',
    'accentMinWidthM',
    'accentMinHeightM',
    'accentThicknessMinM',
    'accentThicknessMaxM',
    'accentThicknessRatio',
    'accentStripDepthM',
    'accentRenderOrder',
    'handleWidthM',
    'handleHeightM',
    'handleDepthM',
    'handleFrontOffsetM',
  ]) {
    assert.match(drawerBox, new RegExp(`CHEST_MODE_DRAWER_BOX_RENDER_POLICY\\.${field}\\b`, 'u'));
  }
  assert.doesNotMatch(drawerBox, /CHEST_MODE_DRAWER_BOX_RENDER_POLICY\s*\[/u);
  assert.doesNotMatch(drawerBox, /drawerBoxDimensions/u);
});

test('Chest Mode builder aggregate pair preserves its closed 149-entry Ledger prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 149)),
    '017aabccfc1a4d0fccde156cff556af4f6d0006409f196868b3d8a53dbd666e5'
  );
});

test('Chest Mode builder aggregate pair leaves no builder aggregate consumer', () => {
  assert.deepEqual(builderAggregateConsumers(), []);
});
