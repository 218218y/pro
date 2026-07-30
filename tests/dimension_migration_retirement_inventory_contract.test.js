import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildInventory, renderMarkdown } from '../tools/wp_dimension_migration_retirement_inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportRel = 'tools/wp_dimension_migration_retirement_inventory.json';
const markdownRel = 'docs/DIMENSION_MIGRATION_RETIREMENT_INVENTORY.md';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Checkpoint 4J retirement inventory locks the final zero-active ledger', () => {
  const generated = buildInventory(root);
  const checkedIn = JSON.parse(read(reportRel));
  assert.deepEqual(checkedIn, generated);
  assert.equal(read(markdownRel), renderMarkdown(generated));
  assert.deepEqual(generated.summary, {
    historicalEntries: 178,
    activeEntries: 0,
    activeFromFiles: 0,
    twoEntryConsumers: 0,
    twoEntryConsumerEntries: 0,
    singleEntryConsumers: 0,
    singleEntryConsumerEntries: 0,
    exactImportSetSignatures: 0,
  });
  assert.equal(generated.entries.length, 0);
  assert.equal(new Set(generated.entries.map(entry => entry.entryNumber)).size, 0);
  assert.equal(new Set(generated.entries.map(entry => entry.fromFile)).size, 0);
  assert.deepEqual(generated.previousCapturedSnapshot, {
    capturedCheckpoint: '4G',
    capturedAt: '2026-07-29',
    summary: {
      historicalEntries: 178,
      activeEntries: 149,
      activeFromFiles: 93,
      multiEntryConsumers: 35,
      multiEntryConsumerEntries: 91,
      singleEntryConsumers: 58,
      singleEntryConsumerEntries: 58,
      exactImportSetSignatures: 81,
    },
  });
  assert.equal(
    generated.entries.every(entry => /^[a-f0-9]{64}$/u.test(entry.exactImportSetSignature)),
    true
  );
  assert.equal(
    generated.entries.every(entry => generated.dispositions.includes(entry.recommendedDisposition)),
    true
  );
  assert.equal(
    generated.entries.every(entry => entry.matchingSignatureConsumers.includes(entry.fromFile)),
    true
  );
});

test('Current inventory recommendations never mutate or retire Layer migration debt', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const generated = buildInventory(root);
  assert.equal(baseline.migrationBudgets.length, 178);
  assert.equal(generated.policy.includes('never retires'), true);
  assert.equal(
    generated.entries.some(entry => 'retiredAt' in entry),
    false
  );
  assert.equal(
    generated.entries.some(entry => 'replacementConsolidationId' in entry),
    false
  );
});
