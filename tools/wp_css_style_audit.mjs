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

function countZIndexWithoutToken(source) {
  const declarations = source.matchAll(/z-index\s*:\s*([^;]+);/gi);
  let count = 0;
  for (const declaration of declarations) {
    const value = String(declaration[1] || '').trim();
    if (!/^var\(--wp-z-[^)]+\)$/i.test(value)) count += 1;
  }
  return count;
}

const metricReaders = Object.freeze({
  important: source => (source.match(/!important/g) || []).length,
  transitionAll: source => (source.match(/transition\s*:\s*all\b/gi) || []).length,
  zIndex: source => (source.match(/z-index\s*:/gi) || []).length,
  zIndexTokenless: countZIndexWithoutToken,
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

function formatMarkdownText(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\*/g, '\\*');
}

function formatMarkdownTable(rows) {
  const headers = ['Metric', 'Current', 'Max', 'Status', 'Note'];
  const aligns = ['left', 'right', 'right', 'left', 'left'];
  const widths = headers.map((header, index) =>
    Math.max(3, header.length, ...rows.map(row => String(row[index]).length))
  );

  const formatCell = (value, index) => {
    const text = String(value);
    return aligns[index] === 'right' ? text.padStart(widths[index]) : text.padEnd(widths[index]);
  };
  const separator = widths.map((width, index) =>
    aligns[index] === 'right' ? `${'-'.repeat(width - 1)}:` : '-'.repeat(width)
  );

  return [
    `| ${headers.map(formatCell).join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map(row => `| ${row.map(formatCell).join(' | ')} |`),
  ].join('\n');
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
  const rows = Object.keys(max).map(key => [
    key,
    metrics[key],
    max[key],
    metrics[key] <= max[key] ? 'ok' : 'FAIL',
    formatMarkdownText(notes[key]),
  ]);
  const table = formatMarkdownTable(rows);
  const md = `# CSS Style Audit\n\nBudget: \`${budgetPath}\`  \nFile: \`${rel}\`\n\n${formatMarkdownText(budget.policy || '')}\n\n${table}\n`;
  const target = join(root, mdOut);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, md);
}

if (check && !report.ok) {
  console.error('[css-style-audit] FAILED');
  for (const v of report.violations) console.error(`- ${v.metric}: ${v.value} > ${v.max}`);
  process.exit(1);
}
const metricSummary = Object.keys(metrics)
  .map(key => `${key}=${metrics[key]}`)
  .join(' ');
console.log(`[css-style-audit] ok ${metricSummary}`);
