#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PARAMETERIZED_FACADE_RULES = Object.freeze([
  Object.freeze({
    kind: 'test-group',
    command: /^node\s+tools\/wp_test_group\.mjs\s+\S+(?:\s|$)/u,
    genericScript: 'test:group',
  }),
  Object.freeze({
    kind: 'verify-lane',
    command: /^node\s+tools\/wp_verify_lane\.js\s+\S+(?:\s|$)/u,
    genericScript: 'verify:lane',
  }),
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeCategory(name) {
  if (name.startsWith('test:')) return 'test';
  if (name.startsWith('verify:')) return 'verify';
  if (name.startsWith('typecheck:')) return 'typecheck';
  if (name.startsWith('check:')) return 'check';
  if (name.startsWith('report:')) return 'report';
  if (name.startsWith('release:') || name === 'bundle' || name.startsWith('bundle:')) return 'release';
  if (name.startsWith('lint')) return 'lint';
  return 'other';
}

export function buildDuplicateGroups(scripts) {
  const byCommand = new Map();
  for (const [name, command] of Object.entries(scripts)) {
    const normalized = String(command || '').trim();
    if (!normalized) continue;
    const list = byCommand.get(normalized) || [];
    list.push({ name, category: normalizeCategory(name), command: normalized });
    byCommand.set(normalized, list);
  }
  return [...byCommand.entries()]
    .map(([command, entries]) => ({ command, entries }))
    .filter(group => group.entries.length > 1)
    .sort((a, b) => b.entries.length - a.entries.length || a.command.localeCompare(b.command));
}

export function collectParameterizedFacades(scripts) {
  const facades = [];
  for (const [name, rawCommand] of Object.entries(scripts)) {
    const command = String(rawCommand || '').trim();
    if (!command) continue;
    for (const rule of PARAMETERIZED_FACADE_RULES) {
      if (!rule.command.test(command)) continue;
      facades.push({
        kind: rule.kind,
        script: name,
        command,
        genericScript: rule.genericScript,
      });
      break;
    }
  }
  return facades.sort((left, right) => left.script.localeCompare(right.script));
}

function buildSummary(groups, parameterizedFacades) {
  const countsByCategory = new Map();
  let duplicateScriptCount = 0;
  for (const group of groups) {
    duplicateScriptCount += group.entries.length;
    const seen = new Set();
    for (const entry of group.entries) {
      if (seen.has(entry.category)) continue;
      seen.add(entry.category);
      countsByCategory.set(entry.category, (countsByCategory.get(entry.category) || 0) + 1);
    }
  }
  return {
    duplicateGroups: groups.length,
    duplicateScriptCount,
    parameterizedFacadeCount: parameterizedFacades.length,
    duplicateGroupsByCategory: Object.fromEntries([...countsByCategory.entries()].sort()),
  };
}

function toMarkdown(summary, groups, parameterizedFacades) {
  const lines = [];
  lines.push('# Script duplicate audit');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Exact duplicate command groups: **${summary.duplicateGroups}**`);
  lines.push(`- Scripts participating in duplicate groups: **${summary.duplicateScriptCount}**`);
  lines.push(
    `- Parameterized package facades over canonical runners: **${summary.parameterizedFacadeCount}**`
  );
  const byCategory = Object.entries(summary.duplicateGroupsByCategory);
  if (byCategory.length) {
    lines.push('- Duplicate groups touching categories:');
    for (const [category, count] of byCategory) lines.push(`  - \`${category}\`: **${count}**`);
  }
  lines.push('');
  lines.push('## Exact duplicate groups');
  lines.push('');
  if (!groups.length) {
    lines.push('- No exact duplicate script commands detected.');
  } else {
    for (const group of groups) {
      const names = group.entries.map(entry => `\`${entry.name}\``).join(', ');
      lines.push(`- ${names}`);
      lines.push(`  - command: \`${group.command}\``);
    }
  }
  lines.push('');
  lines.push('## Parameterized runner facades');
  lines.push('');
  if (!parameterizedFacades.length) {
    lines.push('- No per-group or per-lane package facades detected.');
  } else {
    for (const facade of parameterizedFacades) {
      lines.push(
        `- \`${facade.script}\` (${facade.kind}) wraps \`${facade.command}\`; use \`${facade.genericScript}\` directly.`
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseNumberArg(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) return null;
  const value = Number(argv[index + 1]);
  return Number.isFinite(value) ? value : null;
}

const argv = process.argv.slice(2);
const args = new Set(argv);
const cwd = process.cwd();
const pkg = readJson(path.join(cwd, 'package.json'));
const groups = buildDuplicateGroups(pkg.scripts || {});
const parameterizedFacades = collectParameterizedFacades(pkg.scripts || {});
const summary = buildSummary(groups, parameterizedFacades);
const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  groups,
  parameterizedFacades,
};

const jsonOutIndex = argv.indexOf('--json-out');
if (jsonOutIndex >= 0 && argv[jsonOutIndex + 1]) {
  fs.writeFileSync(path.resolve(cwd, argv[jsonOutIndex + 1]), `${JSON.stringify(payload, null, 2)}\n`);
}
const mdOutIndex = argv.indexOf('--md-out');
if (mdOutIndex >= 0 && argv[mdOutIndex + 1]) {
  fs.writeFileSync(
    path.resolve(cwd, argv[mdOutIndex + 1]),
    toMarkdown(summary, groups, parameterizedFacades)
  );
}

const expectedGroups = parseNumberArg(argv, '--expect-groups');
if (expectedGroups !== null && groups.length !== expectedGroups) {
  console.error(
    `Expected ${expectedGroups} exact duplicate script command group(s), found ${groups.length}.`
  );
  process.exitCode = 1;
}

if (args.has('--check')) {
  if (expectedGroups === null && groups.length > 0) {
    console.error(`Found ${groups.length} exact duplicate script command group(s).`);
    process.exitCode = 1;
  }
  if (parameterizedFacades.length > 0) {
    console.error(`Found ${parameterizedFacades.length} parameterized package facade(s).`);
    process.exitCode = 1;
  }
}

console.log(JSON.stringify(payload, null, 2));
