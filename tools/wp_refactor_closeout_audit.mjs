#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  PURE_NPM_RUN_ALIAS_PATTERN,
  TEST_REF_PATTERN,
  createVerifyScriptCoverageMap,
} from './wp_refactor_closeout_audit_support.mjs';

const repoRoot = process.cwd();
const testsDir = path.join(repoRoot, 'tests');
const esmDir = path.join(repoRoot, 'esm');

function walk(dir, predicate, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, out);
      continue;
    }
    if (predicate(full)) out.push(full);
  }
  return out;
}

function relative(fullPath) {
  return path.relative(repoRoot, fullPath).replace(/\\/g, '/');
}

function ensureParentDir(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function readIfExists(targetPath) {
  return targetPath && fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
}

function writeIfRequested(targetPath, content) {
  if (!targetPath) return;
  ensureParentDir(targetPath);
  fs.writeFileSync(targetPath, content, 'utf8');
}

function countLines(fullPath) {
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.length) return 0;
  return content.split(/\r?\n/).length;
}

function deriveTestFamilyLabel(fullPath) {
  const basename = path.basename(fullPath).replace(/\.test\.(?:js|ts|tsx|cjs)$/, '');
  const parts = basename.split('_').filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}_${parts[1]}`;
  return parts[0] || basename;
}

function normalizeJsonReportContent(content) {
  if (typeof content !== 'string') return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.report && typeof parsed.report === 'object' && 'generated_at' in parsed.report) {
      parsed.report.generated_at = '<normalized>';
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content.trim();
  }
}

function normalizeMarkdownReportContent(content) {
  if (typeof content !== 'string') return null;
  return content.replace(/^Generated at: .*$/m, 'Generated at: <normalized>').trim();
}

function parseArgs(argv) {
  const args = { jsonOut: null, mdOut: null, checkSync: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json-out') {
      args.jsonOut = argv[i + 1] ? path.resolve(repoRoot, argv[i + 1]) : null;
      i += 1;
      continue;
    }
    if (arg === '--md-out') {
      args.mdOut = argv[i + 1] ? path.resolve(repoRoot, argv[i + 1]) : null;
      i += 1;
      continue;
    }
    if (arg === '--check-sync') {
      args.checkSync = true;
    }
  }
  return args;
}

function buildMarkdown(report, details) {
  const lines = [
    '# Refactor Closeout Status',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Top-level test files: **${report.top_level_test_files}**`,
    `- Family contract files: **${report.family_contract_files}**`,
    `- Residual thin-contract files: **${report.thin_contract_files}**`,
    `- Real \`export default\` hits under \`esm/\`: **${report.esm_default_export_hits}**`,
    `- package.json scripts total: **${report.package_script_total}**`,
    `- package.json \`test:*\` scripts: **${report.package_script_test_count}**`,
    `- package.json \`verify:*\` scripts: **${report.package_script_verify_count}**`,
    `- package.json \`typecheck:*\` scripts: **${report.package_script_typecheck_count}**`,
    `- package.json direct alias scripts: **${report.package_script_direct_alias_count}**`,
    `- package.json test refs: **${report.package_script_test_refs}**`,
    `- Missing package.json test refs: **${report.package_script_missing_test_refs}**`,
    `- package.json thin-contract refs: **${report.package_script_thin_contract_refs}**`,
    `- Family contracts missing direct test scripts: **${report.family_contract_files_missing_test_scripts}**`,
    `- Family contracts missing verify coverage: **${report.family_contract_files_missing_verify_scripts}**`,
    `- Closeout JSON report sync mismatches: **${report.closeout_json_report_sync_mismatches}**`,
    `- Closeout Markdown report sync mismatches: **${report.closeout_markdown_report_sync_mismatches}**`,
    '',
    '## Script Inventory',
    '',
  ];

  if (details.direct_alias_scripts.length) {
    for (const entry of details.direct_alias_scripts) {
      lines.push(`- \`${entry.scriptName}\` → \`${entry.targetScript}\``);
    }
    lines.push('');
  } else {
    lines.push('- No direct `npm run ...` alias scripts detected.');
    lines.push('');
  }

  lines.push('## Dense Test Families');
  lines.push('');
  for (const entry of details.dense_test_families) {
    lines.push(`- \`${entry.family}\`: **${entry.count}** files`);
  }
  lines.push('');

  lines.push('## Largest ESM Hotspots');
  lines.push('');
  for (const entry of details.largest_esm_files) {
    lines.push(`- \`${entry.file}\`: **${entry.lines}** lines`);
  }
  lines.push('');

  lines.push('## Family Contract Coverage');
  lines.push('');

  for (const entry of details.family_contract_coverage) {
    lines.push(`### ${entry.file}`);
    lines.push('');
    lines.push(
      `- Direct test scripts: ${entry.direct_test_scripts.length ? entry.direct_test_scripts.map(v => `\`${v}\``).join(', ') : 'none'}`
    );
    lines.push(
      `- Verify scripts: ${entry.verify_scripts.length ? entry.verify_scripts.map(v => `\`${v}\``).join(', ') : 'none'}`
    );
    lines.push('');
  }

  if (details.default_export_hits.length) {
    lines.push('## Residual `export default` hits');
    lines.push('');
    for (const hit of details.default_export_hits) lines.push(`- \`${hit}\``);
    lines.push('');
  }

  if (details.missing_script_test_refs.length) {
    lines.push('## Missing package.json test refs');
    lines.push('');
    for (const entry of details.missing_script_test_refs)
      lines.push(`- \`${entry.scriptName}\` → \`${entry.testRef}\``);
    lines.push('');
  }

  if (details.thin_contract_script_refs.length) {
    lines.push('## Residual package.json thin-contract refs');
    lines.push('');
    for (const entry of details.thin_contract_script_refs)
      lines.push(`- \`${entry.scriptName}\` → \`${entry.command}\``);
    lines.push('');
  }

  if (details.report_sync_mismatches.length) {
    lines.push('## Persisted report sync mismatches');
    lines.push('');
    for (const entry of details.report_sync_mismatches)
      lines.push(`- \`${entry.kind}\` → \`${entry.target}\``);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

const { jsonOut, mdOut, checkSync } = parseArgs(process.argv.slice(2));

const testFiles = walk(
  testsDir,
  full => /\.test\.(?:js|ts|tsx|cjs)$/.test(full) && path.dirname(full) === testsDir
);
const thinContractFiles = testFiles.filter(full => /thin_contracts/.test(path.basename(full)));
const familyContractFiles = testFiles.filter(full => /family_contracts/.test(path.basename(full)));
const esmFiles = walk(esmDir, full => /\.(?:js|ts|tsx|mjs)$/.test(full));

const defaultExportHits = [];
for (const full of esmFiles) {
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (/^\s*export\s+default\b/.test(line)) {
      defaultExportHits.push(`${relative(full)}:${idx + 1}:${line.trim()}`);
    }
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const scriptEntries = Object.entries(packageJson.scripts ?? {});
const testScriptEntries = scriptEntries.filter(([scriptName]) => scriptName.startsWith('test:'));
const verifyScriptEntries = scriptEntries.filter(([scriptName]) => scriptName.startsWith('verify:'));
const typecheckScriptEntries = scriptEntries.filter(([scriptName]) => scriptName.startsWith('typecheck:'));
const directAliasScripts = scriptEntries
  .map(([scriptName, command]) => {
    const match = String(command).match(PURE_NPM_RUN_ALIAS_PATTERN);
    if (!match) return null;
    return { scriptName, targetScript: match[1] };
  })
  .filter(Boolean)
  .sort((a, b) => a.scriptName.localeCompare(b.scriptName));
const verifyScriptCoverageMap = createVerifyScriptCoverageMap(scriptEntries);
const denseTestFamilies = Array.from(
  testFiles
    .reduce((acc, full) => {
      const family = deriveTestFamilyLabel(full);
      acc.set(family, (acc.get(family) || 0) + 1);
      return acc;
    }, new Map())
    .entries()
)
  .map(([family, count]) => ({ family, count }))
  .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family))
  .slice(0, 12);
const largestEsmFiles = esmFiles
  .map(full => ({ file: relative(full), lines: countLines(full) }))
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file))
  .slice(0, 12);

const scriptTestRefs = [];
const missingScriptTestRefs = [];
for (const [scriptName, command] of scriptEntries) {
  const hits = command.match(TEST_REF_PATTERN) ?? [];
  for (const testRef of hits) {
    scriptTestRefs.push({ scriptName, testRef });
    const full = path.join(repoRoot, testRef);
    if (!fs.existsSync(full)) missingScriptTestRefs.push({ scriptName, testRef });
  }
}

const thinContractScriptRefs = scriptEntries
  .filter(([, command]) => /thin_contracts/.test(command))
  .map(([scriptName, command]) => ({ scriptName, command }));

const familyContractCoverage = familyContractFiles
  .map(full => {
    const rel = relative(full);
    const basename = path.basename(full, path.extname(full)).replace(/\.test$/, '');
    const directTestScripts = testScriptEntries
      .filter(([, command]) => command.includes(rel) || command.includes(basename))
      .map(([scriptName]) => scriptName)
      .sort();
    const verifyScripts = verifyScriptEntries
      .filter(([scriptName, command]) => {
        if (
          command.includes(basename) ||
          directTestScripts.some(testScriptName => command.includes(testScriptName))
        )
          return true;
        const coverage = verifyScriptCoverageMap.get(scriptName);
        if (!coverage) return false;
        if (coverage.basenames.has(basename)) return true;
        return directTestScripts.some(testScriptName => coverage.scriptNames.has(testScriptName));
      })
      .map(([scriptName]) => scriptName)
      .sort();
    return {
      file: rel,
      direct_test_scripts: directTestScripts,
      verify_scripts: verifyScripts,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const familyContractsMissingTestScripts = familyContractCoverage.filter(
  entry => entry.direct_test_scripts.length === 0
);
const familyContractsMissingVerifyScripts = familyContractCoverage.filter(
  entry => entry.verify_scripts.length === 0
);

const report = {
  generated_at: new Date().toISOString(),
  top_level_test_files: testFiles.length,
  family_contract_files: familyContractFiles.length,
  thin_contract_files: thinContractFiles.length,
  esm_default_export_hits: defaultExportHits.length,
  package_script_total: scriptEntries.length,
  package_script_test_count: testScriptEntries.length,
  package_script_verify_count: verifyScriptEntries.length,
  package_script_typecheck_count: typecheckScriptEntries.length,
  package_script_direct_alias_count: directAliasScripts.length,
  package_script_test_refs: scriptTestRefs.length,
  package_script_missing_test_refs: missingScriptTestRefs.length,
  package_script_thin_contract_refs: thinContractScriptRefs.length,
  family_contract_files_missing_test_scripts: familyContractsMissingTestScripts.length,
  family_contract_files_missing_verify_scripts: familyContractsMissingVerifyScripts.length,
  closeout_json_report_sync_mismatches: 0,
  closeout_markdown_report_sync_mismatches: 0,
};

const details = {
  family_contract_coverage: familyContractCoverage,
  direct_alias_scripts: directAliasScripts,
  dense_test_families: denseTestFamilies,
  largest_esm_files: largestEsmFiles,
  default_export_hits: defaultExportHits,
  missing_script_test_refs: missingScriptTestRefs,
  thin_contract_script_refs: thinContractScriptRefs,
  report_sync_mismatches: [],
};

const renderedJson = `${JSON.stringify({ report, details }, null, 2)}\n`;
const renderedMarkdown = buildMarkdown(report, details);

const existingJson = readIfExists(jsonOut);
const existingMarkdown = readIfExists(mdOut);
const normalizedRenderedJson = normalizeJsonReportContent(renderedJson);
const normalizedRenderedMarkdown = normalizeMarkdownReportContent(renderedMarkdown);
const missingJsonOutput = Boolean(checkSync && jsonOut && existingJson === null);
const missingMarkdownOutput = Boolean(checkSync && mdOut && existingMarkdown === null);
const jsonSyncMismatch = Boolean(
  checkSync &&
  jsonOut &&
  existingJson !== null &&
  normalizeJsonReportContent(existingJson) !== normalizedRenderedJson
);
const markdownSyncMismatch = Boolean(
  checkSync &&
  mdOut &&
  existingMarkdown !== null &&
  normalizeMarkdownReportContent(existingMarkdown) !== normalizedRenderedMarkdown
);

report.closeout_json_report_sync_mismatches = Number(missingJsonOutput || jsonSyncMismatch);
report.closeout_markdown_report_sync_mismatches = Number(missingMarkdownOutput || markdownSyncMismatch);
if (missingJsonOutput)
  details.report_sync_mismatches.push({ kind: 'missing-json', target: relative(jsonOut) });
if (missingMarkdownOutput)
  details.report_sync_mismatches.push({ kind: 'missing-markdown', target: relative(mdOut) });
if (jsonSyncMismatch) details.report_sync_mismatches.push({ kind: 'stale-json', target: relative(jsonOut) });
if (markdownSyncMismatch)
  details.report_sync_mismatches.push({ kind: 'stale-markdown', target: relative(mdOut) });

if (!checkSync) {
  writeIfRequested(jsonOut, `${JSON.stringify({ report, details }, null, 2)}\n`);
  writeIfRequested(mdOut, buildMarkdown(report, details));
}

console.log('[refactor-closeout-audit] summary');
for (const [key, value] of Object.entries(report)) {
  console.log(`- ${key}: ${value}`);
}
if (jsonOut) console.log(`- json_out: ${relative(jsonOut)}`);
if (mdOut) console.log(`- md_out: ${relative(mdOut)}`);

if (thinContractFiles.length) {
  console.log('\n[refactor-closeout-audit] unexpected thin-contract files still present:');
  for (const file of thinContractFiles) console.log(`  - ${relative(file)}`);
}
if (defaultExportHits.length) {
  console.log('\n[refactor-closeout-audit] unexpected export default statements still present under esm/:');
  for (const hit of defaultExportHits) console.log(`  - ${hit}`);
}
if (missingScriptTestRefs.length) {
  console.log('\n[refactor-closeout-audit] package.json scripts reference missing test files:');
  for (const { scriptName, testRef } of missingScriptTestRefs) console.log(`  - ${scriptName}: ${testRef}`);
}
if (thinContractScriptRefs.length) {
  console.log('\n[refactor-closeout-audit] package.json scripts still mention thin-contract paths:');
  for (const { scriptName, command } of thinContractScriptRefs) console.log(`  - ${scriptName}: ${command}`);
}
if (familyContractsMissingTestScripts.length) {
  console.log('\n[refactor-closeout-audit] family contract files missing direct test scripts:');
  for (const entry of familyContractsMissingTestScripts) console.log(`  - ${entry.file}`);
}
if (familyContractsMissingVerifyScripts.length) {
  console.log('\n[refactor-closeout-audit] family contract files missing verify coverage:');
  for (const entry of familyContractsMissingVerifyScripts) {
    console.log(`  - ${entry.file} (test scripts: ${entry.direct_test_scripts.join(', ') || 'none'})`);
  }
}
if (details.report_sync_mismatches.length) {
  console.log('\n[refactor-closeout-audit] persisted closeout report outputs are missing or stale:');
  for (const entry of details.report_sync_mismatches) console.log(`  - ${entry.kind}: ${entry.target}`);
}

if (
  thinContractFiles.length ||
  defaultExportHits.length ||
  missingScriptTestRefs.length ||
  thinContractScriptRefs.length ||
  familyContractsMissingTestScripts.length ||
  familyContractsMissingVerifyScripts.length ||
  details.report_sync_mismatches.length
) {
  process.exitCode = 1;
} else {
  console.log('\n[refactor-closeout-audit] PASS');
}
