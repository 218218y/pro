#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(toolDir, '..');
const baselineRel = 'tools/wp_layer_baseline.json';
const reportJsonRel = 'tools/wp_dimension_migration_retirement_inventory.json';
const reportMarkdownRel = 'docs/DIMENSION_MIGRATION_RETIREMENT_INVENTORY.md';
const capturedAt = '2026-07-29';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const stableJson = value => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

function normalizedStatement(statement) {
  return {
    toFile: statement.toFile,
    kind: statement.kind,
    syntax: statement.syntax,
    importedSymbols: [...statement.importedSymbols].sort(),
  };
}

function buildInventory(root = defaultRoot) {
  const baselineSource = read(root, baselineRel);
  const baseline = JSON.parse(baselineSource);
  const retiredAtCapture = new Set(
    baseline.migrationRetirements
      .filter(retirement => retirement.retiredAt <= capturedAt)
      .map(retirement => retirement.entryNumber)
  );
  const activeEntries = baseline.migrationBudgets
    .map((entry, index) => ({ entryNumber: index + 1, ...entry }))
    .filter(entry => !retiredAtCapture.has(entry.entryNumber));

  const entriesByConsumer = new Map();
  for (const entry of activeEntries) {
    const entries = entriesByConsumer.get(entry.fromFile) ?? [];
    entries.push(entry);
    entriesByConsumer.set(entry.fromFile, entries);
  }

  const consumerSignatures = new Map();
  for (const [fromFile, entries] of entriesByConsumer) {
    const exactStatements = new Map();
    for (const entry of entries) {
      for (const field of ['addedImport', 'companionImport']) {
        const statement = normalizedStatement(entry[field]);
        exactStatements.set(stableJson(statement), statement);
      }
    }
    const importSet = [...exactStatements.values()].sort((left, right) =>
      stableJson(left).localeCompare(stableJson(right))
    );
    consumerSignatures.set(fromFile, sha256(stableJson(importSet)));
  }

  const consumersBySignature = new Map();
  for (const [fromFile, signature] of consumerSignatures) {
    const consumers = consumersBySignature.get(signature) ?? [];
    consumers.push(fromFile);
    consumersBySignature.set(signature, consumers);
  }
  for (const consumers of consumersBySignature.values()) consumers.sort();

  const entries = activeEntries.map(entry => {
    const consumerEntries = entriesByConsumer.get(entry.fromFile) ?? [];
    const signature = consumerSignatures.get(entry.fromFile);
    const matchingConsumers = consumersBySignature.get(signature) ?? [];
    const recommendedDisposition =
      consumerEntries.length > 1
        ? 'consolidation-candidate'
        : matchingConsumers.length > 1
          ? 'reviewed-ownership-candidate'
          : 'manual-review';
    return {
      entryNumber: entry.entryNumber,
      layer: entry.from,
      fromFile: entry.fromFile,
      addedStatement: normalizedStatement(entry.addedImport),
      companionStatement: normalizedStatement(entry.companionImport),
      consumerEntryCount: consumerEntries.length,
      exactImportSetSignature: signature,
      matchingSignatureConsumers: matchingConsumers,
      recommendedDisposition,
    };
  });

  const multiEntryConsumers = [...entriesByConsumer.values()].filter(entries => entries.length > 1);
  const singleEntryConsumers = [...entriesByConsumer.values()].filter(entries => entries.length === 1);
  return {
    version: 1,
    capturedCheckpoint: '4G',
    capturedAt,
    policy:
      'This is a captured remaining-debt inventory. It recommends review disposition only and never retires a migration Entry by itself.',
    source: { file: baselineRel, sha256: sha256(baselineSource) },
    summary: {
      historicalEntries: baseline.migrationBudgets.length,
      activeEntries: activeEntries.length,
      activeFromFiles: entriesByConsumer.size,
      multiEntryConsumers: multiEntryConsumers.length,
      multiEntryConsumerEntries: multiEntryConsumers.flat().length,
      singleEntryConsumers: singleEntryConsumers.length,
      singleEntryConsumerEntries: singleEntryConsumers.flat().length,
      exactImportSetSignatures: consumersBySignature.size,
    },
    dispositions: [
      'consolidation-candidate',
      'reviewed-ownership-candidate',
      'statement-removal-candidate',
      'manual-review',
    ],
    entries,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Dimension Migration Retirement Inventory',
    '',
    `Captured checkpoint: ${report.capturedCheckpoint} (${report.capturedAt})`,
    '',
    report.policy,
    '',
    '## Locked summary',
    '',
    `- Active Entries: ${report.summary.activeEntries}`,
    `- Active fromFiles: ${report.summary.activeFromFiles}`,
    `- Multi-entry consumers: ${report.summary.multiEntryConsumers} / ${report.summary.multiEntryConsumerEntries} Entries`,
    `- Single-entry consumers: ${report.summary.singleEntryConsumers} / ${report.summary.singleEntryConsumerEntries} Entries`,
    `- Exact import-set signatures: ${report.summary.exactImportSetSignatures}`,
    '',
    '## Entries',
    '',
    '| Entry | Layer | Consumer | Added statement | Companion statement | Consumer entries | Signature peers | Disposition |',
    '| ---: | --- | --- | --- | --- | ---: | ---: | --- |',
    ...report.entries.map(entry => {
      const added = `${entry.addedStatement.toFile}#${entry.addedStatement.importedSymbols.join(',')}`;
      const companion = `${entry.companionStatement.toFile}#${entry.companionStatement.importedSymbols.join(',')}`;
      return `| ${entry.entryNumber} | ${entry.layer} | \`${entry.fromFile}\` | \`${added}\` | \`${companion}\` | ${entry.consumerEntryCount} | ${entry.matchingSignatureConsumers.length} | ${entry.recommendedDisposition} |`;
    }),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function parseOutputs(args) {
  const jsonIndex = args.indexOf('--json-out');
  const mdIndex = args.indexOf('--md-out');
  if (jsonIndex < 0 && mdIndex < 0) return null;
  if (jsonIndex < 0 || mdIndex < 0 || !args[jsonIndex + 1] || !args[mdIndex + 1]) {
    throw new Error('--json-out and --md-out are both required');
  }
  return { json: args[jsonIndex + 1], markdown: args[mdIndex + 1] };
}

function runCli() {
  const args = process.argv.slice(2);
  const report = buildInventory(defaultRoot);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  const outputs = parseOutputs(args);
  if (outputs) {
    fs.writeFileSync(path.resolve(defaultRoot, outputs.json), json);
    fs.writeFileSync(path.resolve(defaultRoot, outputs.markdown), markdown);
    return;
  }
  if (args.includes('--write')) {
    fs.writeFileSync(path.join(defaultRoot, reportJsonRel), json);
    fs.writeFileSync(path.join(defaultRoot, reportMarkdownRel), markdown);
    return;
  }
  if (args.includes('--check')) {
    if (read(defaultRoot, reportJsonRel) !== json) throw new Error(`${reportJsonRel} is stale`);
    if (read(defaultRoot, reportMarkdownRel) !== markdown) throw new Error(`${reportMarkdownRel} is stale`);
    return;
  }
  process.stdout.write(json);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) runCli();

export { buildInventory, renderMarkdown };
