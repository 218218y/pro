#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

function buildDuplicateGroups(scripts) {
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

function buildSummary(groups) {
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
    duplicateGroupsByCategory: Object.fromEntries([...countsByCategory.entries()].sort()),
  };
}

function toMarkdown(summary, groups) {
  const lines = [];
  lines.push('# Script duplicate audit');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Exact duplicate command groups: **${summary.duplicateGroups}**`);
  lines.push(`- Scripts participating in duplicate groups: **${summary.duplicateScriptCount}**`);
  const byCategory = Object.entries(summary.duplicateGroupsByCategory);
  if (byCategory.length) {
    lines.push('- Duplicate groups touching categories:');
    for (const [category, count] of byCategory) {
      lines.push(`  - \`${category}\`: **${count}**`);
    }
  }
  lines.push('');
  lines.push('## Exact duplicate groups');
  lines.push('');
  if (!groups.length) {
    lines.push('- No exact duplicate script commands detected.');
    return `${lines.join('\n')}\n`;
  }
  for (const group of groups) {
    const names = group.entries.map(entry => `\`${entry.name}\``).join(', ');
    lines.push(`- ${names}`);
    lines.push(`  - command: \`${group.command}\``);
  }
  return `${lines.join('\n')}\n`;
}

const args = new Set(process.argv.slice(2));
const cwd = process.cwd();
const pkg = readJson(path.join(cwd, 'package.json'));
const groups = buildDuplicateGroups(pkg.scripts || {});
const summary = buildSummary(groups);
const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  groups,
};

const jsonOutIndex = process.argv.indexOf('--json-out');
if (jsonOutIndex >= 0 && process.argv[jsonOutIndex + 1]) {
  fs.writeFileSync(
    path.resolve(cwd, process.argv[jsonOutIndex + 1]),
    `${JSON.stringify(payload, null, 2)}\n`
  );
}
const mdOutIndex = process.argv.indexOf('--md-out');
if (mdOutIndex >= 0 && process.argv[mdOutIndex + 1]) {
  fs.writeFileSync(path.resolve(cwd, process.argv[mdOutIndex + 1]), toMarkdown(summary, groups));
}

const expectGroupsIndex = process.argv.indexOf('--expect-groups');
if (expectGroupsIndex >= 0 && process.argv[expectGroupsIndex + 1]) {
  const expected = Number(process.argv[expectGroupsIndex + 1]);
  if (Number.isFinite(expected) && groups.length !== expected) {
    console.error(`Expected ${expected} exact duplicate script command group(s), found ${groups.length}.`);
    process.exit(1);
  }
}

if (args.has('--check') && groups.length > 0 && expectGroupsIndex < 0) {
  console.error(`Found ${groups.length} exact duplicate script command group(s).`);
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
