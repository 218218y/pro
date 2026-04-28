#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const jsonOutArg = process.argv.find(arg => arg.startsWith('--json-out='));
const mdOutArg = process.argv.find(arg => arg.startsWith('--md-out='));
const jsonOut = jsonOutArg ? jsonOutArg.slice('--json-out='.length) : null;
const mdOut = mdOutArg ? mdOutArg.slice('--md-out='.length) : null;
const check = args.has('--check') || (!jsonOut && !mdOut);

const rel = 'css/react_styles.css';
const source = readFileSync(join(root, rel), 'utf8');
const metrics = {
  important: (source.match(/!important/g) || []).length,
  transitionAll: (source.match(/transition\s*:\s*all\b/gi) || []).length,
  zIndex: (source.match(/z-index\s*:/gi) || []).length,
  boxShadow: (source.match(/box-shadow\s*:/gi) || []).length,
};
const max = {
  important: 141,
  transitionAll: 22,
  zIndex: 52,
  boxShadow: 116,
};
const report = { file: rel, metrics, max, ok: true, violations: [] };
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
    .map(key => `| ${key} | ${metrics[key]} | ${max[key]} | ${metrics[key] <= max[key] ? 'ok' : 'FAIL'} |`)
    .join('\n');
  const md = `# CSS Style Audit\n\n| Metric | Current | Max | Status |\n|---|---:|---:|---|\n${rows}\n`;
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
