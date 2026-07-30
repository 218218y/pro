import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

import {
  buildLayerContractProposal,
  evaluateLayerContract,
  validateLayerContractSchema,
} from '../tools/wp_layer_contract_support.mjs';

const TEST_FILE = 'tests/wp_layer_contract_reviewed_ownership_runtime.test.js';
const RATCHET = Object.freeze({
  mode: 'decrease-only',
  owner: 'architecture-contract',
  reason: 'Reviewed budgets only move down.',
  reviewedAt: '2026-07-30',
});
const evidence = () => [
  { path: TEST_FILE, sha256: createHash('sha256').update(fs.readFileSync(TEST_FILE)).digest('hex') },
];

function rule(overrides = {}) {
  return {
    from: 'ui',
    to: 'services',
    decision: 'allow',
    maxImporterCount: 1,
    maxImportCount: 1,
    maxTypeImporterCount: 0,
    maxTypeImportCount: 0,
    maxValueImporterCount: 1,
    maxValueImportCount: 1,
    maxDynamicImporterCount: 0,
    maxDynamicImportCount: 0,
    reason: 'One reviewed general statement remains after exact ownership exclusion.',
    ...overrides,
  };
}
function migrationBudget(overrides = {}) {
  return {
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    additionalStatements: 1,
    addedImport: {
      toFile: 'esm/native/services/units.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CM_PER_METER'],
    },
    companionImport: {
      toFile: 'esm/native/services/policy.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['EXAMPLE_POLICY'],
    },
    removedImport: {
      toFile: 'esm/native/services/legacy.ts',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['LEGACY_DIMENSIONS'],
    },
    owner: 'historical-migration',
    reason: 'Historical exact statement split.',
    reviewedAt: '2026-07-20',
    reviewBy: '2026-10-18',
    removalCondition: 'Retire only after exact reviewed ownership transfer.',
    ...overrides,
  };
}
function ownershipBudget(overrides = {}) {
  return {
    id: 'focused-units-ownership',
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    statement: { ...migrationBudget().addedImport },
    owner: 'units-focused-owner',
    reason:
      'The direct focused import is canonical ownership; a composition owner would be a cosmetic wrapper only.',
    reviewedAt: '2026-07-30',
    nextReviewBy: '2027-07-30',
    evidenceContracts: evidence(),
    ...overrides,
  };
}
function ownershipRetirement(overrides = {}) {
  return {
    entryNumber: 1,
    retiredAt: '2026-07-30',
    mode: 'ownership-reviewed',
    reason: 'Exact historical statement transferred to reviewed internal ownership.',
    replacementReviewedOwnershipBudgetId: 'focused-units-ownership',
    ...overrides,
  };
}
function contract(overrides = {}) {
  return {
    version: '2.7',
    root: 'esm',
    ratchet: RATCHET,
    rules: [rule()],
    facades: [],
    dynamicImportAllowlist: [],
    migrationBudgets: [],
    migrationRetirements: [],
    compatibilityBudgets: [],
    reviewedOwnershipBudgets: [],
    migrationConsolidations: [],
    ...overrides,
  };
}
function importEntry({ toFile, symbols, statementKey, syntax = 'static-import', alias = false }) {
  return {
    from: 'ui',
    to: 'services',
    fromFile: 'esm/native/ui/example.ts',
    toFile,
    specifier: `../services/${toFile.split('/').at(-1).replace(/\.ts$/u, '.js')}`,
    kind: 'value',
    syntax,
    importedSymbols: symbols,
    statementKey,
    bindings: symbols.map(symbol => ({
      importedName: symbol,
      localName: alias ? `${symbol}_ALIAS` : symbol,
      exportedName: null,
    })),
  };
}
function graph({ added = {}, includeCompanion = true } = {}) {
  const imports = [
    importEntry({
      toFile: 'esm/native/services/units.ts',
      symbols: ['CM_PER_METER'],
      statementKey: 'units',
      ...added,
    }),
  ];
  if (includeCompanion)
    imports.push(
      importEntry({
        toFile: 'esm/native/services/policy.ts',
        symbols: ['EXAMPLE_POLICY'],
        statementKey: 'policy',
      })
    );
  return {
    edges: [
      {
        from: 'ui',
        to: 'services',
        importerCount: 1,
        importCount: imports.length,
        importerFiles: ['esm/native/ui/example.ts'],
        typeImporterCount: 0,
        typeImportCount: 0,
        typeImporterFiles: [],
        valueImporterCount: 1,
        valueImportCount: imports.length,
        valueImporterFiles: ['esm/native/ui/example.ts'],
        dynamicImporterCount: 0,
        dynamicImportCount: 0,
        dynamicImporterFiles: [],
      },
    ],
    imports,
    unresolvedDynamicImports: [],
    forbiddenModuleSyntax: [],
    unclassifiedSourceFiles: [],
    sourceFiles: {},
  };
}
function transferredContract(ownership = ownershipBudget(), retirement = ownershipRetirement()) {
  return contract({
    migrationBudgets: [migrationBudget()],
    migrationRetirements: [retirement],
    reviewedOwnershipBudgets: [ownership],
  });
}

function failureKinds(report) {
  return new Set(report.failures.map(failure => failure.kind));
}

test('Layer Contract 2.7 performs a valid exact ownership-reviewed transfer and accounts it separately', () => {
  const baseline = transferredContract();
  validateLayerContractSchema(baseline);
  const report = evaluateLayerContract(graph(), baseline, { currentDate: '2026-07-30' });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.activeMigrationEntries.length, 0);
  assert.equal(report.retiredMigrationEntries.length, 1);
  assert.equal(report.reviewedOwnershipBudgets.length, 1);
  const edge = report.edges[0];
  assert.deepEqual(
    {
      activeMigrationStatements: edge.activeMigrationStatements,
      compatibilityStatements: edge.compatibilityStatements,
      consolidationStatements: edge.consolidationStatements,
      reviewedOwnershipStatements: edge.reviewedOwnershipStatements,
      reviewedGeneralStatements: edge.reviewedGeneralStatements,
    },
    {
      activeMigrationStatements: 0,
      compatibilityStatements: 0,
      consolidationStatements: 0,
      reviewedOwnershipStatements: 1,
      reviewedGeneralStatements: 1,
    }
  );
});

test('wrong target, symbols, syntax, and alias fail transfer and leave the migration Entry active', () => {
  const cases = [
    [
      graph({ added: { toFile: 'esm/native/services/other.ts' } }),
      'reviewed-ownership-budget-statement-missing',
    ],
    [graph({ added: { symbols: ['OTHER'] } }), 'reviewed-ownership-budget-statement-missing'],
    [graph({ added: { syntax: 'static-re-export' } }), 'reviewed-ownership-budget-syntax-drift'],
    [graph({ added: { alias: true } }), 'reviewed-ownership-budget-alias-drift'],
  ];
  for (const [fixtureGraph, expectedFailure] of cases) {
    const report = evaluateLayerContract(fixtureGraph, transferredContract(), { currentDate: '2026-07-30' });
    assert.equal(report.ok, false);
    assert.equal(failureKinds(report).has(expectedFailure), true, expectedFailure);
    assert.equal(report.activeMigrationEntries.length, 1, expectedFailure);
    assert.equal(report.retiredMigrationEntries.length, 0, expectedFailure);
  }
});

test('future and stale ownership reviews follow compatibility lifecycle without proposal removal', () => {
  const future = transferredContract(
    ownershipBudget({ reviewedAt: '2026-08-01', nextReviewBy: '2027-08-01' }),
    ownershipRetirement({ retiredAt: '2026-08-01' })
  );
  const futureReport = evaluateLayerContract(graph(), future, { currentDate: '2026-07-30' });
  assert.equal(failureKinds(futureReport).has('reviewed-ownership-review-not-effective-yet'), true);
  assert.equal(futureReport.activeMigrationEntries.length, 1);
  assert.deepEqual(
    buildLayerContractProposal(graph(), future, { currentDate: '2026-07-30' }).contract.rules,
    future.rules
  );

  const stale = transferredContract(
    ownershipBudget({ reviewedAt: '2026-07-20', nextReviewBy: '2026-07-29' })
  );
  const staleReport = evaluateLayerContract(graph(), stale, { currentDate: '2026-07-30' });
  assert.equal(failureKinds(staleReport).has('stale-reviewed-ownership-review'), true);
  assert.equal(staleReport.retiredMigrationEntries.length, 1);
  assert.equal(staleReport.edges[0].reviewedOwnershipStatements, 1);
  assert.deepEqual(
    buildLayerContractProposal(graph(), stale, { currentDate: '2026-07-30' }).contract.rules,
    stale.rules
  );
});

test('schema rejects duplicate, compatibility, consolidation, wildcard, dynamic, and non-direct ownership', () => {
  const owner = ownershipBudget();
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({ reviewedOwnershipBudgets: [owner, { ...owner, id: 'duplicate-id' }] })
      ),
    /duplicate reviewed ownership statement ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          compatibilityBudgets: [
            {
              id: 'compat',
              from: owner.from,
              to: owner.to,
              fromFile: owner.fromFile,
              statement: owner.statement,
              owner: 'compat',
              reason: 'compat',
              reviewedAt: '2026-07-30',
              nextReviewBy: '2027-07-30',
              publicSurface: 'test',
            },
          ],
          reviewedOwnershipBudgets: [owner],
        })
      ),
    /conflicts with compatibility ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          reviewedOwnershipBudgets: [
            ownershipBudget({ statement: { ...owner.statement, importedSymbols: ['*'] } }),
          ],
        })
      ),
    /does not allow wildcard ownership/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          reviewedOwnershipBudgets: [
            ownershipBudget({ statement: { ...owner.statement, syntax: 'static-re-export' } }),
          ],
        })
      ),
    /must own a direct static import/
  );
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          reviewedOwnershipBudgets: [
            ownershipBudget({ statement: { ...owner.statement, syntax: 'dynamic-import' } }),
          ],
        })
      ),
    /syntax must be one of/
  );

  const budget = migrationBudget();
  const replacement = {
    toFile: 'esm/native/services/consolidated.ts',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['CONSOLIDATED_POLICY'],
  };
  const consolidation = {
    id: 'consolidation',
    retiredAt: '2026-07-30',
    entryNumbers: [1],
    from: 'ui',
    to: 'services',
    fromFile: budget.fromFile,
    owner: 'composition-owner',
    reason: 'Reviewed exact composition.',
    replacementStatement: replacement,
    absorbedStatements: [budget.addedImport, budget.companionImport].map(statement => ({
      fromFile: budget.fromFile,
      ...statement,
    })),
    replacementProvenance: {
      mode: 'reviewed-composition',
      ownerFile: replacement.toFile,
      sourceStatements: [{ ...budget.addedImport }, { ...budget.companionImport }],
    },
    evidenceContracts: evidence(),
  };
  assert.throws(
    () =>
      validateLayerContractSchema(
        contract({
          migrationBudgets: [budget],
          migrationRetirements: [
            {
              entryNumber: 1,
              retiredAt: '2026-07-30',
              mode: 'statement-consolidated',
              reason: 'group',
              replacementConsolidationId: 'consolidation',
            },
          ],
          migrationConsolidations: [consolidation],
          reviewedOwnershipBudgets: [ownershipBudget({ statement: replacement })],
        })
      ),
    /conflicts with migration consolidation ownership/
  );
});

test('active migration overlap is rejected and proposal preserves ownership records and historical prefixes', () => {
  const activeConflict = contract({
    migrationBudgets: [migrationBudget()],
    reviewedOwnershipBudgets: [ownershipBudget()],
  });
  const report = evaluateLayerContract(graph(), activeConflict, { currentDate: '2026-07-30' });
  assert.equal(failureKinds(report).has('reviewed-ownership-active-migration-conflict'), true);
  assert.equal(report.activeMigrationEntries.length, 1);

  const baseline = transferredContract();
  const historical = JSON.stringify(baseline.migrationBudgets);
  const proposal = buildLayerContractProposal(graph(), baseline, { currentDate: '2026-07-30' });
  assert.deepEqual(proposal.contract.reviewedOwnershipBudgets, baseline.reviewedOwnershipBudgets);
  assert.equal(JSON.stringify(proposal.contract.migrationBudgets), historical);
  assert.equal(proposal.diff.reviewedOwnershipBudgets, 1);
});
