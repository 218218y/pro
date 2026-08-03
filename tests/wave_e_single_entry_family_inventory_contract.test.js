import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));
const waveEEntryNumbers = Object.freeze([
  1, 2, 8, 13, 14, 17, 20, 21, 22, 25, 28, 29, 30, 35, 40, 41, 53, 54, 55, 56, 57, 58, 59, 60, 62, 75, 76, 77,
  78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 115, 116, 117, 120, 123, 124, 125, 132, 152,
  153, 154, 157, 158, 166,
]);
const repeatedFamilies = Object.freeze({
  MATERIAL_THICKNESS_POLICY: 17,
  CARCASS_SHELL_DIMENSIONS: 3,
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY: 6,
  INTERIOR_ROD_RENDER_POLICY: 3,
  DRAWER_SKETCH_DOOR_CUT_POLICY: 2,
  INTERIOR_SHELF_GEOMETRY_POLICY: 2,
  EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY: 2,
  EXTERNAL_DRAWER_SIZE_POLICY: 2,
});
const sorted = values => [...values].sort();
const sourceTarget = (fromFile, specifier) =>
  path.posix
    .normalize(path.posix.join(path.posix.dirname(fromFile), specifier.split(/[?#]/u, 1)[0]))
    .replace(/\.js$/u, '.ts');

test('Wave E inventory locks all 58 single-entry consumers and recurring focused surfaces', () => {
  assert.equal(waveEEntryNumbers.length, 58);
  assert.equal(new Set(waveEEntryNumbers).size, 58);
  const entries = waveEEntryNumbers.map(entryNumber => ({
    entryNumber,
    ...baseline.migrationBudgets[entryNumber - 1],
  }));
  assert.equal(new Set(entries.map(entry => entry.fromFile)).size, 58);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(repeatedFamilies).map(symbol => [
        symbol,
        entries.filter(entry => entry.addedImport.importedSymbols.includes(symbol)).length,
      ])
    ),
    repeatedFamilies
  );
  assert.equal(
    entries.every(
      entry =>
        entry.addedImport.kind === 'value' &&
        entry.addedImport.syntax === 'static-import' &&
        entry.addedImport.toFile.startsWith('esm/shared/dimensions/') &&
        !entry.addedImport.importedSymbols.includes('*')
    ),
    true
  );

  for (const entry of entries) {
    const source = fs.readFileSync(path.join(root, entry.fromFile), 'utf8');
    const matches = analyzeModuleDependencies(entry.fromFile, source).imports.filter(
      dependency =>
        dependency.kind === entry.addedImport.kind &&
        dependency.syntax === entry.addedImport.syntax &&
        sourceTarget(entry.fromFile, dependency.specifier) === entry.addedImport.toFile &&
        JSON.stringify(sorted(dependency.importedSymbols)) ===
          JSON.stringify(sorted(entry.addedImport.importedSymbols))
    );
    assert.equal(matches.length, 1, `Entry ${entry.entryNumber} exact import count`);
    assert.equal(
      matches[0].bindings.every(
        binding => !binding.importedName || !binding.localName || binding.importedName === binding.localName
      ),
      true,
      `Entry ${entry.entryNumber} alias-free`
    );
  }
});
