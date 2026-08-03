import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies } from '../../tools/wp_layer_contract_support.mjs';

const baselineRel = 'tools/wp_layer_baseline.json';
const publicFacadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const sorted = values => [...values].sort();

function exactStatementKey({ from, to, fromFile, statement }) {
  return JSON.stringify({
    from,
    to,
    fromFile,
    toFile: statement.toFile,
    kind: statement.kind,
    syntax: statement.syntax,
    importedSymbols: sorted(statement.importedSymbols),
  });
}

const sourceTarget = (fromFile, specifier) =>
  path.posix
    .normalize(path.posix.join(path.posix.dirname(fromFile), specifier.split(/[?#]/u, 1)[0]))
    .replace(/\.js$/u, '.ts');

export function assertReviewedOwnershipFamily({ root, label, entryNumbers }) {
  assert.equal(typeof label, 'string');
  assert.equal(label.length > 0, true);
  assert.equal(Array.isArray(entryNumbers), true);
  assert.equal(entryNumbers.length > 0, true);
  assert.equal(new Set(entryNumbers).size, entryNumbers.length);

  const baseline = JSON.parse(fs.readFileSync(path.join(root, baselineRel), 'utf8'));
  const retirementsByEntry = new Map(
    baseline.migrationRetirements.map(retirement => [retirement.entryNumber, retirement])
  );
  const reviewedById = new Map(baseline.reviewedOwnershipBudgets.map(budget => [budget.id, budget]));
  const dependencyCache = new Map();
  const dependenciesFor = fromFile => {
    if (!dependencyCache.has(fromFile)) {
      const source = fs.readFileSync(path.join(root, fromFile), 'utf8');
      dependencyCache.set(fromFile, analyzeModuleDependencies(fromFile, source).imports);
    }
    return dependencyCache.get(fromFile);
  };

  for (const entryNumber of entryNumbers) {
    assert.equal(Number.isInteger(entryNumber), true, `${label}: invalid Entry number`);
    const historical = baseline.migrationBudgets[entryNumber - 1];
    assert.ok(historical, `${label}: missing historical Entry ${entryNumber}`);

    const retirement = retirementsByEntry.get(entryNumber);
    assert.ok(retirement, `${label}: missing retirement for Entry ${entryNumber}`);
    assert.equal(retirement.mode, 'ownership-reviewed');
    assert.equal(retirement.retiredAt, '2026-07-30');

    const expectedBudgetId = `dimension-migration-entry-${entryNumber}-reviewed-ownership`;
    assert.equal(retirement.replacementReviewedOwnershipBudgetId, expectedBudgetId);
    const reviewed = reviewedById.get(expectedBudgetId);
    assert.ok(reviewed, `${label}: missing reviewed ownership budget ${expectedBudgetId}`);

    assert.deepEqual(
      {
        from: reviewed.from,
        to: reviewed.to,
        fromFile: reviewed.fromFile,
        statement: reviewed.statement,
      },
      {
        from: historical.from,
        to: historical.to,
        fromFile: historical.fromFile,
        statement: historical.addedImport,
      },
      `${label}: Entry ${entryNumber} must transfer the exact historical addedImport`
    );
    assert.equal(reviewed.owner, 'dimension-reviewed-ownership');
    assert.equal(reviewed.reviewedAt, '2026-07-30');
    assert.equal(reviewed.nextReviewBy, '2026-10-28');
    assert.match(reviewed.reason, /canonical direct focused import/u);
    assert.match(reviewed.reason, /cosmetic wrapper/u);
    assert.equal(Array.isArray(reviewed.evidenceContracts), true);
    assert.equal(reviewed.evidenceContracts.length, 2);

    assert.equal(reviewed.statement.kind, 'value');
    assert.equal(reviewed.statement.syntax, 'static-import');
    assert.equal(reviewed.statement.toFile.startsWith('esm/shared/dimensions/'), true);
    assert.notEqual(reviewed.statement.toFile, publicFacadeRel);
    assert.equal(reviewed.statement.importedSymbols.includes('*'), false);

    const key = exactStatementKey(reviewed);
    const matches = dependenciesFor(reviewed.fromFile).filter(
      dependency =>
        JSON.stringify({
          from: reviewed.from,
          to: reviewed.to,
          fromFile: reviewed.fromFile,
          toFile: sourceTarget(reviewed.fromFile, dependency.specifier),
          kind: dependency.kind,
          syntax: dependency.syntax,
          importedSymbols: sorted(dependency.importedSymbols),
        }) === key
    );
    assert.equal(matches.length, 1, `${label}: Entry ${entryNumber} exact import count`);
    const [match] = matches;
    assert.equal(match.exportedSymbols.length, 0);
    assert.equal(
      match.bindings.every(
        binding => !binding.importedName || !binding.localName || binding.importedName === binding.localName
      ),
      true,
      `${label}: Entry ${entryNumber} must not use aliases`
    );
  }

  const expectedIds = new Set(
    entryNumbers.map(entryNumber => `dimension-migration-entry-${entryNumber}-reviewed-ownership`)
  );
  const familyBudgets = baseline.reviewedOwnershipBudgets.filter(budget => expectedIds.has(budget.id));
  assert.equal(familyBudgets.length, entryNumbers.length);
}
