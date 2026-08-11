import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildModernizationStateReport,
  toModernizationStateMarkdown,
} from '../tools/wp_modernization_state_report.mjs';

test('modernization current-state report aggregates canonical audits without manual snapshot counts', () => {
  const report = buildModernizationStateReport(process.cwd());

  assert.equal(report.status.allPassed, true);
  assert.equal(report.status.silentCatchPolicy, true);
  assert.equal(report.status.compatibilityAudit, true);
  assert.equal(report.status.privateOwnerBoundary, true);
  assert.equal(report.status.testPortfolio, true);

  assert.equal(report.silentCatches.bare, 0);
  assert.equal(report.silentCatches.vagueComments, 0);
  assert.equal(report.compatibility.legacyRuntimeRisk, 0);
  assert.equal(report.compatibility.unknown, 0);
  assert.equal(
    report.compatibility.guardedOccurrences,
    report.compatibility.projectMigration +
      report.compatibility.externalApiCompat +
      report.compatibility.compatBoundary
  );
  assert.equal(report.tests.historicalArchitectureProofs, 0);
  assert.equal(report.tests.failures, 0);

  const markdown = toModernizationStateMarkdown(report);
  assert.match(markdown, /Generated source of truth for mutable modernization metrics/);
  assert.match(markdown, /Living architecture documents should describe policy and ownership/);
});
