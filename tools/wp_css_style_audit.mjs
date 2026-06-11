#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));

function readOption(name) {
  const flag = `--${name}`;
  const inlinePrefix = `${flag}=`;
  const inline = process.argv.find(arg => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0 && index + 1 < process.argv.length) return process.argv[index + 1];
  return null;
}

const jsonOut = readOption('json-out');
const mdOut = readOption('md-out');
const budgetPath = readOption('budget') || 'tools/wp_css_style_budget.json';
const check = args.has('--check') || (!jsonOut && !mdOut);

const metricReaders = Object.freeze({
  important: source => (source.match(/!important/g) || []).length,
  transitionAll: source => (source.match(/transition\s*:\s*all\b/gi) || []).length,
  zIndex: source => (source.match(/z-index\s*:/gi) || []).length,
  boxShadow: source => (source.match(/box-shadow\s*:/gi) || []).length,
});

function readBudget() {
  const budget = JSON.parse(readFileSync(join(root, budgetPath), 'utf8'));
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) {
    throw new Error(`${budgetPath}: CSS style budget must be an object`);
  }
  if (typeof budget.file !== 'string' || !budget.file) {
    throw new Error(`${budgetPath}: missing file`);
  }
  if (!budget.metrics || typeof budget.metrics !== 'object' || Array.isArray(budget.metrics)) {
    throw new Error(`${budgetPath}: missing metrics`);
  }
  return budget;
}

const budget = readBudget();
const rel = budget.file;
const source = readFileSync(join(root, rel), 'utf8');
const metrics = {};
const max = {};
const notes = {};
for (const [key, entry] of Object.entries(budget.metrics)) {
  const readMetric = metricReaders[key];
  if (!readMetric) throw new Error(`${budgetPath}: unknown metric ${key}`);
  const limit = Number(entry && typeof entry === 'object' ? entry.max : entry);
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error(`${budgetPath}: invalid max for ${key}`);
  }
  metrics[key] = readMetric(source);
  max[key] = limit;
  notes[key] =
    entry && typeof entry === 'object' && typeof entry.description === 'string' ? entry.description : '';
}
const report = {
  file: rel,
  budget: budgetPath,
  policy: budget.policy || '',
  metrics,
  max,
  ok: true,
  violations: [],
};
for (const [key, limit] of Object.entries(max)) {
  if (metrics[key] > limit) {
    report.ok = false;
    report.violations.push({ metric: key, value: metrics[key], max: limit });
  }
}

if (jsonOut) {
  const target = join(root, jsonOut);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
}
if (mdOut) {
  const rows = Object.keys(max)
    .map(
      key =>
        `| ${key} | ${metrics[key]} | ${max[key]} | ${metrics[key] <= max[key] ? 'ok' : 'FAIL'} | ${notes[key]} |`
    )
    .join('\n');
  const md = `# CSS Style Audit\n\nBudget: \`${budgetPath}\`  \nFile: \`${rel}\`\n\n${budget.policy || ''}\n\n| Metric | Current | Max | Status | Note |\n|---|---:|---:|---|---|\n${rows}\n`;
  const target = join(root, mdOut);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, md);
}

if (check && !report.ok) {
  console.error('[css-style-audit] FAILED');
  for (const v of report.violations) console.error(`- ${v.metric}: ${v.value} > ${v.max}`);
  process.exit(1);
}
console.log(
  `[css-style-audit] ok important=${metrics.important} transitionAll=${metrics.transitionAll} zIndex=${metrics.zIndex} boxShadow=${metrics.boxShadow}`
);
