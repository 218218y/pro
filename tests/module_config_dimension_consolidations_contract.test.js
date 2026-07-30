import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sorted = values => [...values].sort((a, b) => a.localeCompare(b));

const cases = Object.freeze([
  Object.freeze({
    id: 'modules-configuration-defaults-dimension-consolidation',
    entryNumbers: Object.freeze([160]),
    consumer: 'esm/native/features/modules_configuration/module_defaults.ts',
    consumerSpecifier: '../../../shared/dimensions/modules_configuration_defaults_dimension_policy.js',
    owner: 'esm/shared/dimensions/modules_configuration_defaults_dimension_policy.ts',
    symbols: Object.freeze(['INTERIOR_STORAGE_GRID_POLICY', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
    sources: Object.freeze([
      Object.freeze({
        specifier: './interior_storage_policy.js',
        symbols: Object.freeze(['INTERIOR_STORAGE_GRID_POLICY']),
      }),
      Object.freeze({
        specifier: './library_preset_policy.js',
        symbols: Object.freeze(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
      }),
    ]),
  }),
  Object.freeze({
    id: 'stack-split-module-config-dimension-consolidation',
    entryNumbers: Object.freeze([161]),
    consumer: 'esm/native/features/stack_split/module_config.ts',
    consumerSpecifier: '../../../shared/dimensions/stack_split_module_config_dimension_policy.js',
    owner: 'esm/shared/dimensions/stack_split_module_config_dimension_policy.ts',
    symbols: Object.freeze([
      'INTERIOR_STORAGE_DEFAULTS_POLICY',
      'INTERIOR_STORAGE_GRID_POLICY',
      'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
    ]),
    sources: Object.freeze([
      Object.freeze({
        specifier: './interior_storage_policy.js',
        symbols: Object.freeze(['INTERIOR_STORAGE_DEFAULTS_POLICY', 'INTERIOR_STORAGE_GRID_POLICY']),
      }),
      Object.freeze({
        specifier: './library_preset_policy.js',
        symbols: Object.freeze(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
      }),
    ]),
  }),
]);

function dependencyFacts(rel) {
  return analyzeModuleDependencies(rel, read(rel)).imports.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: sorted(dependency.importedSymbols),
    hasAlias: dependency.bindings.some(binding =>
      dependency.syntax === 'static-re-export'
        ? binding.importedName !== binding.exportedName
        : binding.importedName !== binding.localName
    ),
  }));
}

for (const config of cases) {
  test(`${config.id} uses one identity-preserving feature composition boundary`, () => {
    const shared = dependencyFacts(config.consumer).filter(dependency =>
      dependency.specifier.includes('/shared/dimensions/')
    );
    assert.deepEqual(shared, [
      {
        specifier: config.consumerSpecifier,
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: sorted(config.symbols),
        hasAlias: false,
      },
    ]);

    assert.deepEqual(
      dependencyFacts(config.owner),
      config.sources.map(source => ({
        specifier: source.specifier,
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: sorted(source.symbols),
        hasAlias: false,
      }))
    );
    const ownerAst = createSourceFile(config.owner, read(config.owner));
    assert.equal(ownerAst.body.length, config.sources.length);
    assert.equal(
      ownerAst.body.every(
        statement =>
          statement.type === 'ExportNamedDeclaration' &&
          statement.source &&
          !statement.declaration &&
          statement.specifiers?.every(specifier => specifier.type === 'ExportSpecifier')
      ),
      true
    );
  });
}

test('the reviewed consolidation groups retire exactly their feature Entries', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  for (const config of cases) {
    const group = baseline.migrationConsolidations.find(candidate => candidate.id === config.id);
    assert.ok(group, config.id);
    assert.deepEqual(group.entryNumbers, [...config.entryNumbers]);
    assert.equal(group.replacementProvenance.mode, 'identity-reexport');
    assert.equal(group.replacementProvenance.ownerFile, config.owner);
    assert.deepEqual(sorted(group.replacementStatement.importedSymbols), sorted(config.symbols));
    const retirements = baseline.migrationRetirements.filter(retirement =>
      config.entryNumbers.includes(retirement.entryNumber)
    );
    assert.equal(retirements.length, config.entryNumbers.length);
    assert.equal(
      retirements.every(retirement => retirement.replacementConsolidationId === config.id),
      true
    );
  }
});
