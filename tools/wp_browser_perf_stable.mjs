import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { createStableSampleSummary } from './wp_browser_perf_support.js';
import { resolveNpmRunLaunchOptions } from './wp_npm_spawn_support.js';
import { BROWSER_PERF_TARGETS, resolveBrowserPerfTargetPaths } from './wp_browser_perf_targets.js';

const projectRoot = process.cwd();
const target = BROWSER_PERF_TARGETS.release;
const targetPaths = resolveBrowserPerfTargetPaths(projectRoot, target);
const stableLatestJsonPath = path.join(path.dirname(targetPaths.latestJsonPath), 'stable-latest.json');
const stableLatestMdPath = path.join(path.dirname(targetPaths.latestJsonPath), 'stable-latest.md');

function readPositiveIntegerFlag(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(value => value.startsWith(prefix));
  const index = process.argv.indexOf(`--${name}`);
  const raw = inline ? inline.slice(prefix.length) : index >= 0 ? process.argv[index + 1] : undefined;
  if (typeof raw === 'undefined') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[browser-perf-stable] --${name} must be a non-negative integer`);
  }
  return value;
}

function readStringFlag(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(value => value.startsWith(prefix));
  const index = process.argv.indexOf(`--${name}`);
  const raw = inline ? inline.slice(prefix.length) : index >= 0 ? process.argv[index + 1] : undefined;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : fallback;
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${String(result.status ?? 'unknown')}`);
  }
}

function runNpmScript(scriptName) {
  const launch = resolveNpmRunLaunchOptions(scriptName);
  const result = spawnSync(launch.command, launch.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: launch.shell,
  });
  if (result.status !== 0) {
    throw new Error(
      `[browser-perf-stable] ${scriptName} failed with exit code ${String(result.status ?? 'unknown')}`
    );
  }
}

function readLatestResult() {
  if (!fs.existsSync(targetPaths.latestJsonPath)) {
    throw new Error(`[browser-perf-stable] sample output is missing: ${targetPaths.latestJsonPath}`);
  }
  return JSON.parse(fs.readFileSync(targetPaths.latestJsonPath, 'utf8'));
}

function environmentIdentity(result) {
  const environment = result?.executionEnvironment || {};
  return {
    platform: environment.platform || null,
    osRelease: environment.osRelease || null,
    architecture: environment.architecture || null,
    cpuModel: environment.cpuModel || null,
    logicalCpuCount: Number(environment.logicalCpuCount) || 0,
    nodeVersion: environment.nodeVersion || null,
    browserVersion: environment.browserVersion || null,
    browserSource: environment.browserSource || null,
    headless: environment.headless === true,
    viewport: environment.viewport || null,
    cachePolicy: environment.cachePolicy || null,
    testSequence: environment.testSequence || null,
  };
}

function stableIdentityText(value) {
  return JSON.stringify(value);
}

function assertComparableSamples(samples) {
  const first = samples[0];
  if (!first) throw new Error('[browser-perf-stable] no measured samples were captured');
  const expectedEnvironment = stableIdentityText(environmentIdentity(first));
  const expectedArtifact = `${first.measurementArtifact?.buildId || ''}|${first.measurementArtifact?.bundleSha256 || ''}`;
  for (const sample of samples.slice(1)) {
    if (stableIdentityText(environmentIdentity(sample)) !== expectedEnvironment) {
      throw new Error('[browser-perf-stable] execution environment changed between measured runs');
    }
    const artifact = `${sample.measurementArtifact?.buildId || ''}|${sample.measurementArtifact?.bundleSha256 || ''}`;
    if (artifact !== expectedArtifact) {
      throw new Error('[browser-perf-stable] release artifact changed between measured runs');
    }
  }
}

const numericMetrics = {
  bootShellVisibleMs: result => Number(result.bootMilestones?.shellVisibleMs) || 0,
  bootOperationalReadyMs: result => Number(result.bootMilestones?.operationalReadyMs) || 0,
  bootAutosaveReadyMs: result => Number(result.bootMilestones?.autosaveReadyMs) || 0,
  lcpMs: result => Number(result.windowBrowserMetrics?.lcp?.valueMs) || 0,
  inpMs: result => Number(result.windowBrowserMetrics?.inp?.valueMs) || 0,
  documentLongTaskTotalMs: result => Number(result.windowBrowserMetrics?.longTasks?.totalMs) || 0,
  documentLongTaskMaxMs: result => Number(result.windowBrowserMetrics?.longTasks?.maxMs) || 0,
  documentLongTaskP95Ms: result => Number(result.windowBrowserMetrics?.longTasks?.p95Ms) || 0,
  bootJourneyLongTaskTotalMs: result =>
    Number(result.journeyResponsivenessSummary?.['boot-and-shell']?.longTasks?.totalMs) || 0,
  autosaveWaitLongTaskTotalMs: result =>
    Number(
      result.windowResponsivenessFlowSteps?.find(row => row?.name === 'boot.autosave-ready.wait')?.delta
        ?.longTasks?.totalMs
    ) || 0,
  autosaveWaitLongTaskMaxMs: result =>
    Number(
      result.windowResponsivenessFlowSteps?.find(row => row?.name === 'boot.autosave-ready.wait')?.delta
        ?.longTasks?.maxMs
    ) || 0,
  shaderWarmupSubmitMs: result =>
    Number(
      (
        result.windowPerfSummary?.['boot.ui.shader-warmup.submit'] ||
        result.windowPerfSummary?.['boot.ui.shader-warmup.execute']
      )?.codeExecutionMaxMs
    ) || 0,
  shaderWarmupCompletionMs: result =>
    Number(result.windowPerfSummary?.['boot.ui.shader-warmup.complete']?.codeExecutionMaxMs) || 0,
  firstAdhesiveGlassLongTaskMaxMs: result =>
    Number(result.adhesiveGlassFirstUse?.black?.longTasks?.maxMs) || 0,
  firstAdhesiveGlassRendererMaxMs: result =>
    Number(result.adhesiveGlassFirstUse?.black?.renderer?.maxMs) || 0,
  firstAdhesiveGlassFrameMaxMs: result => Number(result.adhesiveGlassFirstUse?.black?.frameTotal?.maxMs) || 0,
  adhesiveGlassVariantLongTaskMaxMs: result =>
    Number(result.adhesiveGlassFirstUse?.variant?.longTasks?.maxMs) || 0,
  adhesiveGlassVariantRendererMaxMs: result =>
    Number(result.adhesiveGlassFirstUse?.variant?.renderer?.maxMs) || 0,
  adhesiveGlassVariantFrameMaxMs: result =>
    Number(result.adhesiveGlassFirstUse?.variant?.frameTotal?.maxMs) || 0,
  builderCpuTotalMs: result => Number(result.windowBuildDebugSummary?.executeDurationTotalMs) || 0,
};

function summarizeNamedMetrics(samples) {
  return Object.fromEntries(
    Object.entries(numericMetrics).map(([name, read]) => [
      name,
      createStableSampleSummary(samples.map(sample => read(sample))),
    ])
  );
}

function summarizePerfPrefix(samples, prefix) {
  const names = new Set(
    samples.flatMap(sample =>
      Object.keys(sample.windowPerfSummary || {}).filter(name => name.startsWith(prefix))
    )
  );
  return Array.from(names)
    .map(name => ({
      name,
      durationMs: createStableSampleSummary(
        samples.map(sample => Number(sample.windowPerfSummary?.[name]?.codeExecutionTotalMs) || 0)
      ),
    }))
    .sort((left, right) => right.durationMs.median - left.durationMs.median);
}

function summarizePerfNames(samples, names) {
  return names.map(name => ({
    name,
    durationMs: createStableSampleSummary(
      samples.map(sample => Number(sample.windowPerfSummary?.[name]?.codeExecutionTotalMs) || 0)
    ),
  }));
}

function summarizeBrowserMetricPrefix(samples, prefix) {
  const names = new Set(
    samples.flatMap(sample =>
      (Array.isArray(sample.windowPerfEntries) ? sample.windowPerfEntries : [])
        .filter(
          entry =>
            entry?.kind === 'browser-metric' &&
            entry?.metricUnit === 'ms' &&
            typeof entry?.name === 'string' &&
            entry.name.startsWith(prefix)
        )
        .map(entry => entry.name)
    )
  );
  return Array.from(names)
    .map(name => ({
      name,
      durationMs: createStableSampleSummary(
        samples.map(sample =>
          (Array.isArray(sample.windowPerfEntries) ? sample.windowPerfEntries : [])
            .filter(entry => entry?.name === name && entry?.kind === 'browser-metric')
            .reduce((total, entry) => total + (Number(entry?.metricValue) || 0), 0)
        )
      ),
    }))
    .sort((left, right) => right.durationMs.median - left.durationMs.median);
}

function readResponsivenessStepRows(sample, name) {
  const rows = Array.isArray(sample.windowResponsivenessFlowSteps)
    ? sample.windowResponsivenessFlowSteps
    : [];
  return rows.filter(row => row?.name === name);
}

function readResponsivenessStepMetric(sample, name, metric, field) {
  const values = readResponsivenessStepRows(sample, name).map(
    row => Number(row?.delta?.[metric]?.[field]) || 0
  );
  if (field === 'maxMs' || field === 'p95Ms') return Math.max(0, ...values);
  return values.reduce((total, value) => total + value, 0);
}

function summarizeResponsivenessSteps(samples) {
  const names = new Set(
    samples.flatMap(sample =>
      (Array.isArray(sample.windowResponsivenessFlowSteps) ? sample.windowResponsivenessFlowSteps : [])
        .map(row => row?.name)
        .filter(Boolean)
    )
  );
  return Array.from(names)
    .map(name => ({
      name,
      longTaskTotalMs: createStableSampleSummary(
        samples.map(sample => readResponsivenessStepMetric(sample, name, 'longTasks', 'totalMs'))
      ),
      longTaskMaxMs: createStableSampleSummary(
        samples.map(sample => readResponsivenessStepMetric(sample, name, 'longTasks', 'maxMs'))
      ),
      longTaskCount: createStableSampleSummary(
        samples.map(sample => readResponsivenessStepMetric(sample, name, 'longTasks', 'count'))
      ),
      renderSettleTotalMs: createStableSampleSummary(
        samples.map(sample => readResponsivenessStepMetric(sample, name, 'renderSettle', 'totalMs'))
      ),
      renderSettleMaxMs: createStableSampleSummary(
        samples.map(sample => readResponsivenessStepMetric(sample, name, 'renderSettle', 'maxMs'))
      ),
    }))
    .sort((left, right) => right.longTaskTotalMs.median - left.longTaskTotalMs.median);
}

function summarizeJourneys(samples) {
  const names = new Set(samples.flatMap(sample => Object.keys(sample.journeyResponsivenessSummary || {})));
  return Array.from(names)
    .map(name => ({
      name,
      longTaskTotalMs: createStableSampleSummary(
        samples.map(sample => Number(sample.journeyResponsivenessSummary?.[name]?.longTasks?.totalMs) || 0)
      ),
      longTaskMaxMs: createStableSampleSummary(
        samples.map(sample => Number(sample.journeyResponsivenessSummary?.[name]?.longTasks?.maxMs) || 0)
      ),
      longTaskCount: createStableSampleSummary(
        samples.map(sample => Number(sample.journeyResponsivenessSummary?.[name]?.longTasks?.count) || 0)
      ),
    }))
    .sort((left, right) => right.longTaskTotalMs.median - left.longTaskTotalMs.median);
}

function formatSummary(summary) {
  return `${summary.median} (${summary.min}–${summary.max}; p25=${summary.p25}, p75=${summary.p75}, MAD=${summary.mad})`;
}

function renderMarkdown(report) {
  const lines = [
    '# Stable release browser performance profile',
    '',
    `Generated: ${report.generatedAt}`,
    `Warm-up runs: ${report.warmupRuns}; measured runs: ${report.measuredRuns}`,
    `Artifact: ${report.artifact.buildId} / ${report.artifact.bundleSha256}`,
    `Environment: ${report.environment.platform} ${report.environment.architecture}; CPU=${report.environment.cpuModel}; browser=${report.environment.browserVersion}; viewport=${report.environment.viewport?.width || 0}x${report.environment.viewport?.height || 0}; cache=${report.environment.cachePolicy}`,
    '',
    '> Runtime milliseconds are not directly comparable across environments. Compare only profiles with the same environment identity, viewport, cache policy, and test sequence.',
    '',
    '## Stable metrics',
    '',
    '| Metric | Median (min–max; quartiles; MAD) |',
    '|---|---:|',
  ];
  for (const [name, summary] of Object.entries(report.metrics)) {
    lines.push(`| ${name} | ${formatSummary(summary)} |`);
  }
  lines.push(
    '',
    '## Boot truth table',
    '',
    '| Milestone | Median distribution | What blocks it | User-visible? |',
    '|---|---:|---|---|',
    `| shell-visible | ${formatSummary(report.metrics.bootShellVisibleMs)} | React shell mounted and viewer canvas attached | yes |`,
    `| operational-ready | ${formatSummary(report.metrics.bootOperationalReadyMs)} | lifecycle bootReady, required UI boot, initial builder flush | mostly |`,
    `| autosave-ready | ${formatSummary(report.metrics.bootAutosaveReadyMs)} | intentional systemReady/autosave delay | no |`
  );
  lines.push('', '## Slowest boot steps', '', '| Step | Median ms |', '|---|---:|');
  for (const item of report.bootSteps.slice(0, 15)) {
    lines.push(`| ${item.name} | ${formatSummary(item.durationMs)} |`);
  }
  lines.push('', '## Boot phases', '', '| Phase | Median ms |', '|---|---:|');
  for (const item of report.bootPhases) {
    lines.push(`| ${item.name} | ${formatSummary(item.durationMs)} |`);
  }
  lines.push('', '## Boot macro spans', '', '| Span | Median ms |', '|---|---:|');
  for (const item of report.bootMacroSpans) {
    lines.push(`| ${item.name} | ${formatSummary(item.durationMs)} |`);
  }
  lines.push('', '## Post-mount UI boot', '', '| Operation | Median ms |', '|---|---:|');
  for (const item of report.uiBootPhases.slice(0, 30)) {
    lines.push(`| ${item.name} | ${formatSummary(item.durationMs)} |`);
  }
  lines.push('', '## Slow-frame phases', '', '| Phase | Median ms |', '|---|---:|');
  for (const item of report.slowFramePhases.slice(0, 20)) {
    lines.push(`| ${item.name} | ${formatSummary(item.durationMs)} |`);
  }
  lines.push(
    '',
    '## Top Long-Task journeys',
    '',
    '| Journey | Total ms | Max ms | Count |',
    '|---|---:|---:|---:|'
  );
  for (const item of report.longTaskJourneys.slice(0, 12)) {
    lines.push(
      `| ${item.name} | ${formatSummary(item.longTaskTotalMs)} | ${formatSummary(item.longTaskMaxMs)} | ${formatSummary(item.longTaskCount)} |`
    );
  }
  lines.push(
    '',
    '## Top Long-Task steps',
    '',
    '| Step | Total ms | Max ms | Count | Render-settle total ms |',
    '|---|---:|---:|---:|---:|'
  );
  for (const item of report.responsivenessSteps.slice(0, 20)) {
    lines.push(
      `| ${item.name} | ${formatSummary(item.longTaskTotalMs)} | ${formatSummary(item.longTaskMaxMs)} | ${formatSummary(item.longTaskCount)} | ${formatSummary(item.renderSettleTotalMs)} |`
    );
  }
  lines.push(
    '',
    '## Largest Long-Task root causes',
    '',
    '| Run | Journey | Step | Duration | Builder | Render | Renderer | Mirror | Store exact | Boot | Unattributed |',
    '|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'
  );
  for (const item of report.longTaskRootCauses.slice(0, 15)) {
    lines.push(
      `| ${item.run} | ${item.journey} | ${item.step} | ${item.durationMs} | ${item.builderContributionMs} | ${item.renderContributionMs} | ${item.renderPhaseContributionsMs?.renderer || 0} | ${item.renderPhaseContributionsMs?.mirror || 0} | ${item.storeContributionMs} | ${item.bootContributionMs || 0} | ${item.unattributedMs} |`
    );
  }
  lines.push(
    '',
    '## Slowest builder executions',
    '',
    '| Run | Journey | Step | Build reason | Execution id | Builder ms | Step overlap ms |',
    '|---:|---|---|---|---|---:|---:|'
  );
  for (const item of report.builderExecutions.slice(0, 20)) {
    lines.push(
      `| ${item.run} | ${item.journey} | ${item.step} | ${item.reason} | ${item.executionId} | ${item.durationMs} | ${item.overlapMs} |`
    );
  }
  return `${lines.join('\n')}\n`;
}

const warmupRuns = readPositiveIntegerFlag('warmups', 1);
const measuredRuns = readPositiveIntegerFlag('runs', 3);
const adhesiveGlassWarmupMode = readStringFlag('warmup-mode', 'startup');
const foldedGeometryMode = readStringFlag('folded-geometry-mode', 'canonical-scale');
const profileFoldedContents = process.argv.includes('--profile-folded-contents');
const profileShaderWarmup = process.argv.includes('--profile-shader-warmup');
if (!['startup', 'off', 'design-intent'].includes(adhesiveGlassWarmupMode)) {
  throw new Error('[browser-perf-stable] --warmup-mode must be startup, off, or design-intent');
}
if (!['exact', 'segments-2', 'canonical-scale'].includes(foldedGeometryMode)) {
  throw new Error(
    '[browser-perf-stable] --folded-geometry-mode must be exact, segments-2, or canonical-scale'
  );
}
if (measuredRuns < 1) throw new Error('[browser-perf-stable] at least one measured run is required');
process.env.WP_PERF_ADHESIVE_GLASS_WARMUP_MODE = adhesiveGlassWarmupMode;
process.env.WP_PERF_FOLDED_GEOMETRY_MODE = foldedGeometryMode;

const variantSuffix = profileFoldedContents
  ? `${adhesiveGlassWarmupMode}-folded-contents-${foldedGeometryMode}`
  : profileShaderWarmup
    ? `${adhesiveGlassWarmupMode}-shader-profile`
    : adhesiveGlassWarmupMode;
const stableJsonPath = path.join(
  path.dirname(targetPaths.latestJsonPath),
  `stable-warmup-${variantSuffix}.json`
);
const stableMdPath = path.join(path.dirname(targetPaths.latestJsonPath), `stable-warmup-${variantSuffix}.md`);

runNpmScript(target.buildScript);
const sampleScript = path.join(projectRoot, 'tools', 'wp_browser_perf_smoke.mjs');
const samples = [];
for (let index = 0; index < warmupRuns + measuredRuns; index += 1) {
  const measured = index >= warmupRuns;
  console.log(
    `[browser-perf-stable] ${measured ? 'measured' : 'warm-up'} run ${measured ? index - warmupRuns + 1 : index + 1}/${measured ? measuredRuns : warmupRuns}`
  );
  const sampleArgs = [sampleScript, '--target', 'release', '--reuse-release-artifact'];
  if (profileFoldedContents) sampleArgs.push('--profile-folded-contents');
  if (profileShaderWarmup) sampleArgs.push('--profile-shader-warmup');
  runCommand(process.execPath, sampleArgs, '[browser-perf-stable] browser sample');
  const result = readLatestResult();
  if (measured) samples.push(result);
}

assertComparableSamples(samples);
const first = samples[0];
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  comparisonPolicy: 'not directly comparable across environments',
  experiment: {
    adhesiveGlassWarmupMode,
    foldedGeometryMode,
    profileFoldedContents,
    profileShaderWarmup,
  },
  warmupRuns,
  measuredRuns,
  environment: environmentIdentity(first),
  artifact: {
    buildId: first.measurementArtifact?.buildId || null,
    bundleSha256: first.measurementArtifact?.bundleSha256 || null,
    bundleBytes: Number(first.measurementArtifact?.bundleBytes) || 0,
  },
  metrics: summarizeNamedMetrics(samples),
  evidenceCoverage: {
    shaderWarmupCompletionSamples: samples.filter(
      sample => Number(sample.windowPerfSummary?.['boot.ui.shader-warmup.complete']?.count) > 0
    ).length,
    adhesiveGlassFirstUseSamples: samples.filter(
      sample => Number(sample.adhesiveGlassFirstUse?.black?.longTasks?.count) >= 0
    ).length,
  },
  bootSteps: summarizePerfPrefix(samples, 'boot.step.'),
  bootPhases: summarizePerfPrefix(samples, 'boot.phase.'),
  bootMacroSpans: summarizePerfNames(samples, [
    'boot.pre-react',
    'boot.react.shell.mount',
    'boot.post-mount.app-start.readiness',
  ]),
  uiBootPhases: summarizePerfPrefix(samples, 'boot.ui.'),
  slowFramePhases: summarizeBrowserMetricPrefix(samples, 'render.frame.'),
  longTaskJourneys: summarizeJourneys(samples),
  responsivenessSteps: summarizeResponsivenessSteps(samples),
  longTaskRootCauses: samples
    .flatMap((sample, index) =>
      (Array.isArray(sample.longTaskRootCauseSummary) ? sample.longTaskRootCauseSummary : []).map(item => ({
        run: index + 1,
        ...item,
      }))
    )
    .sort((left, right) => right.durationMs - left.durationMs),
  builderExecutions: samples
    .flatMap((sample, index) =>
      (Array.isArray(sample.builderExecutionRootCauseSummary)
        ? sample.builderExecutionRootCauseSummary
        : []
      ).map(item => ({ run: index + 1, ...item }))
    )
    .sort((left, right) => right.durationMs - left.durationMs),
  rendererInfoProbes: samples.map((sample, index) => ({
    run: index + 1,
    ...sample.headerSketchRendererProbe,
  })),
  viewerContentsProbes: samples.map((sample, index) => ({
    run: index + 1,
    ...sample.viewerContentsProbe,
  })),
  samples: samples.map(sample => ({
    generatedAt: sample.generatedAt,
    metrics: Object.fromEntries(Object.entries(numericMetrics).map(([name, read]) => [name, read(sample)])),
  })),
};

fs.mkdirSync(path.dirname(stableJsonPath), { recursive: true });
fs.writeFileSync(stableJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(stableMdPath, renderMarkdown(report), 'utf8');
fs.copyFileSync(stableJsonPath, stableLatestJsonPath);
fs.copyFileSync(stableMdPath, stableLatestMdPath);
console.log(`[browser-perf-stable] wrote ${path.relative(projectRoot, stableJsonPath)}`);
