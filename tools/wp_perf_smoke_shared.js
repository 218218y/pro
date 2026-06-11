import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { planVerifyLaneRun } from './wp_verify_lane_flow.js';
import { normalizeVerifyLaneName } from './wp_verify_lane_catalog.js';
import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { header, resolveProjectRoot } from './wp_verify_shared.js';

export const DEFAULT_PERF_SMOKE_LANES = Object.freeze(['perf-toolchain-core', 'ui-react-jsx-hardening-core']);

export const DEFAULT_PERF_SMOKE_BASELINE_RELATIVE_PATH = 'tools/wp_perf_smoke_baseline.json';
export const DEFAULT_PERF_SMOKE_JSON_OUT_RELATIVE_PATH = '.artifacts/perf-smoke/latest.json';
export const DEFAULT_PERF_SMOKE_MD_OUT_RELATIVE_PATH = '.artifacts/perf-smoke/latest.md';
export const DEFAULT_PERF_SMOKE_DOC_RELATIVE_PATH = 'docs/PERF_AND_STABILITY_BASELINE.md';

const DEFAULT_BASELINE_POLICY = Object.freeze({
  perScriptRatio: 1.35,
  perScriptSlackMs: 750,
  perScriptMinimumMs: 1000,
  totalRatio: 1.2,
  totalSlackMs: 1500,
});

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolvePerfSmokeProjectRoot(importMetaUrl = import.meta.url) {
  return resolveProjectRoot(importMetaUrl);
}

export function createPerfSmokeChildEnv(env = process.env) {
  return createSanitizedChildEnv(env);
}

export function resolvePerfSmokePath(projectRoot, value, fallbackRelativePath) {
  const target = trimString(value) || trimString(fallbackRelativePath);
  if (!target) return '';
  return path.isAbsolute(target) ? target : path.join(projectRoot, target);
}

export function ensureParentDir(filePath) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeJsonFile(filePath, data) {
  if (!filePath) return;
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function writeTextFile(filePath, text) {
  if (!filePath) return;
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, text, 'utf8');
}

export function readJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function formatDurationMs(durationMs) {
  const ms = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0;
  if (ms >= 60000) return `${(ms / 60000).toFixed(2)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)}s`;
  return `${ms}ms`;
}

function ceilBudget(durationMs, ratio, slackMs, minimumMs = 0) {
  const numericDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const raw = Math.ceil(numericDuration * ratio + slackMs);
  return Math.max(Math.ceil(minimumMs), raw);
}

function normalizePlanInputs(values) {
  return Array.isArray(values) ? values.map(value => trimString(value)).filter(Boolean) : [];
}

export function resolvePerfSmokePlan({ laneNames = [], scriptNames = [], dedupe = true } = {}) {
  const normalizedLaneNames = normalizePlanInputs(laneNames)
    .map(value => normalizeVerifyLaneName(value))
    .filter(Boolean);
  const normalizedScriptNames = normalizePlanInputs(scriptNames);

  const scripts = [];
  const seenScripts = new Set();

  for (const scriptName of normalizedScriptNames) {
    if (dedupe && seenScripts.has(scriptName)) continue;
    scripts.push(scriptName);
    seenScripts.add(scriptName);
  }

  const requestedLaneNames = normalizedLaneNames.length
    ? normalizedLaneNames
    : DEFAULT_PERF_SMOKE_LANES.slice();
  const lanePlan = planVerifyLaneRun({ laneNames: requestedLaneNames, dedupe });
  for (const scriptName of lanePlan.scripts) {
    if (dedupe && seenScripts.has(scriptName)) continue;
    scripts.push(scriptName);
    seenScripts.add(scriptName);
  }

  return {
    laneNames: lanePlan.laneNames,
    scriptNames: scripts,
  };
}

function runNpmSpawn({ projectRoot, childEnv, scriptName, spawnImpl = spawnSync }) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'cmd.exe';
    return spawnImpl(comspec, ['/d', '/s', '/c', 'npm', 'run', scriptName], {
      stdio: 'inherit',
      cwd: projectRoot,
      env: childEnv,
      shell: false,
    });
  }
  return spawnImpl('npm', ['run', scriptName], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: childEnv,
    shell: false,
  });
}

export function runPerfSmokeScript({ projectRoot, childEnv, scriptName, spawnImpl = spawnSync }) {
  header(`[WP Perf Smoke] npm run ${scriptName}`);
  const startNs = process.hrtime.bigint();
  const result = runNpmSpawn({ projectRoot, childEnv, scriptName, spawnImpl });
  const durationMs = Number((process.hrtime.bigint() - startNs) / 1000000n);
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  return {
    scriptName,
    durationMs,
    ok: !result.error && exitCode === 0,
    exitCode,
    error: result.error || null,
  };
}

export function summarizePerfSmokeRun({ profileName = 'default', laneNames = [], results = [] } = {}) {
  const scripts = Array.isArray(results)
    ? results.map(result => ({
        scriptName: result.scriptName,
        durationMs: Math.max(0, Math.round(result.durationMs || 0)),
        ok: result.ok !== false,
        exitCode: typeof result.exitCode === 'number' ? result.exitCode : 0,
      }))
    : [];
  const totalDurationMs = scripts.reduce((sum, item) => sum + item.durationMs, 0);
  return {
    version: 1,
    profileName,
    laneNames: Array.isArray(laneNames) ? laneNames.slice() : [],
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    scripts,
    totalDurationMs,
    ok: scripts.every(item => item.ok !== false),
  };
}

export function createPerfSmokeBaseline(summary, policy = {}) {
  const mergedPolicy = {
    ...DEFAULT_BASELINE_POLICY,
    ...(policy && typeof policy === 'object' ? policy : {}),
  };
  const scripts = Array.isArray(summary?.scripts) ? summary.scripts : [];
  const totalBaselineMs = scripts.reduce((sum, item) => sum + Math.max(0, item.durationMs || 0), 0);
  const scriptBudgets = scripts.map(item => ({
    name: item.scriptName,
    baselineMs: Math.max(0, Math.round(item.durationMs || 0)),
    maxMs: ceilBudget(
      item.durationMs || 0,
      mergedPolicy.perScriptRatio,
      mergedPolicy.perScriptSlackMs,
      mergedPolicy.perScriptMinimumMs
    ),
  }));
  const totalMaxMs = ceilBudget(
    totalBaselineMs,
    mergedPolicy.totalRatio,
    mergedPolicy.totalSlackMs,
    totalBaselineMs
  );
  return {
    version: 1,
    profileName: trimString(summary?.profileName) || 'default',
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    laneNames: Array.isArray(summary?.laneNames) ? summary.laneNames.slice() : [],
    policy: mergedPolicy,
    scripts: scriptBudgets,
    totalBaselineMs,
    totalMaxMs,
  };
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function evaluatePerfSmokeBaseline(summary, baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return {
      ok: false,
      failures: [{ kind: 'missing-baseline', message: 'baseline is missing or unreadable' }],
    };
  }

  const actualScripts = Array.isArray(summary?.scripts) ? summary.scripts : [];
  const baselineScripts = Array.isArray(baseline.scripts) ? baseline.scripts : [];
  const actualNames = actualScripts.map(item => item.scriptName);
  const baselineNames = baselineScripts.map(item => item.name);

  const failures = [];
  if (!arraysEqual(actualNames, baselineNames)) {
    failures.push({
      kind: 'profile-drift',
      message: `script profile changed: actual=[${actualNames.join(', ')}] baseline=[${baselineNames.join(', ')}]`,
    });
  }

  const budgetByName = new Map(baselineScripts.map(item => [item.name, item]));
  for (const item of actualScripts) {
    const budget = budgetByName.get(item.scriptName);
    if (!budget) continue;
    if (item.durationMs > budget.maxMs) {
      failures.push({
        kind: 'script-budget',
        scriptName: item.scriptName,
        actualMs: item.durationMs,
        maxMs: budget.maxMs,
        message: `${item.scriptName} exceeded budget (${formatDurationMs(item.durationMs)} > ${formatDurationMs(
          budget.maxMs
        )})`,
      });
    }
  }

  const totalMaxMs =
    typeof baseline.totalMaxMs === 'number' && Number.isFinite(baseline.totalMaxMs) ? baseline.totalMaxMs : 0;
  if (totalMaxMs > 0 && (summary?.totalDurationMs || 0) > totalMaxMs) {
    failures.push({
      kind: 'total-budget',
      actualMs: summary.totalDurationMs,
      maxMs: totalMaxMs,
      message: `total exceeded budget (${formatDurationMs(summary.totalDurationMs)} > ${formatDurationMs(totalMaxMs)})`,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

function createBudgetStatus({ actualMs, maxMs }) {
  if (!(maxMs > 0)) return 'n/a';
  return actualMs <= maxMs ? 'ok' : 'regressed';
}

export function createPerfSmokeMarkdownReport({ summary, baseline = null, evaluation = null } = {}) {
  const lines = [];
  lines.push('# Perf and Stability Baseline');
  lines.push('');
  lines.push(`- Generated: ${summary?.generatedAt || new Date().toISOString()}`);
  lines.push(`- Profile: ${summary?.profileName || 'default'}`);
  lines.push(
    `- Verify lanes: ${
      Array.isArray(summary?.laneNames) && summary.laneNames.length ? summary.laneNames.join(', ') : 'none'
    }`
  );
  lines.push(`- Node: ${summary?.nodeVersion || process.version}`);
  lines.push(`- Total runtime: ${formatDurationMs(summary?.totalDurationMs || 0)}`);
  if (baseline && typeof baseline.totalMaxMs === 'number') {
    lines.push(`- Total budget: ${formatDurationMs(baseline.totalMaxMs)}`);
  }
  if (evaluation) {
    lines.push(`- Budget result: ${evaluation.ok ? 'pass' : 'fail'}`);
  }
  lines.push('');
  lines.push('## Definition of Done');
  lines.push('');
  lines.push('- All scripts in the perf smoke profile pass.');
  lines.push('- No script exceeds its stored budget.');
  lines.push('- Total profile runtime stays within the stored total budget.');
  lines.push('- The perf smoke profile remains dependency-light enough to run before larger verify waves.');
  lines.push('');
  lines.push('## Script timings');
  lines.push('');
  lines.push('| Script | Actual | Budget | Status |');
  lines.push('| --- | ---: | ---: | --- |');
  const budgets = new Map(
    Array.isArray(baseline?.scripts) ? baseline.scripts.map(item => [item.name, item.maxMs]) : []
  );
  for (const item of Array.isArray(summary?.scripts) ? summary.scripts : []) {
    const maxMs = budgets.get(item.scriptName) ?? 0;
    lines.push(
      `| ${item.scriptName} | ${formatDurationMs(item.durationMs)} | ${
        maxMs > 0 ? formatDurationMs(maxMs) : 'n/a'
      } | ${createBudgetStatus({ actualMs: item.durationMs, maxMs })} |`
    );
  }
  lines.push('');
  if (evaluation && Array.isArray(evaluation.failures) && evaluation.failures.length) {
    lines.push('## Budget failures');
    lines.push('');
    for (const failure of evaluation.failures) lines.push(`- ${failure.message}`);
    lines.push('');
  }
  lines.push('## Re-run commands');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run perf:smoke');
  lines.push('npm run perf:smoke:update-baseline');
  lines.push('```');
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.'
  );
  lines.push(
    '- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.'
  );
  lines.push('');
  return `${lines.join('\n')}\n`;
}
