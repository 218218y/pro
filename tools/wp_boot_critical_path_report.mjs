import fs from 'node:fs';
import path from 'node:path';

import { createBootCriticalPathRows } from './wp_boot_critical_path_support.js';

const projectRoot = process.cwd();
const perfDir = path.join(projectRoot, '.artifacts', 'browser-perf', 'release');
const stablePath = path.join(perfDir, 'stable-latest.json');
const attributionPath = path.join(projectRoot, '.artifacts', 'bundle-attribution', 'latest.json');
const outputJsonPath = path.join(perfDir, 'boot-critical-path-latest.json');
const outputMdPath = path.join(perfDir, 'boot-critical-path-latest.md');

function readRequiredJson(filePath, prerequisite) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[boot-critical-path] missing ${path.relative(projectRoot, filePath)}; run ${prerequisite} first`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatDuration(summary) {
  if (!summary) return 'n/a';
  return `${summary.median} (${summary.min}-${summary.max}; MAD=${summary.mad})`;
}

const stable = readRequiredJson(stablePath, 'npm run perf:browser:release:stable');
const attribution = readRequiredJson(attributionPath, 'npm run bundle:analyze');
const steps = createBootCriticalPathRows(stable, attribution);
const categoryCounts = Object.fromEntries(
  ['A', 'B', 'C', 'D'].map(category => [category, steps.filter(step => step.category === category).length])
);
const canvasPicking = steps.find(step => step.step === 'services.canvasPicking') || null;
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  measurementPolicy: stable.comparisonPolicy,
  environment: stable.environment,
  artifact: stable.artifact,
  bundleSource: attribution.source,
  initialBundle: attribution.initial,
  macroSpans: stable.bootMacroSpans || [],
  phases: stable.bootPhases || [],
  categoryCounts,
  steps,
  recommendedNextRefactor: {
    subsystem: 'canvas picking',
    status: 'proposal only; no lifecycle refactor implemented in this phase',
    evidence: {
      bootInstallerMedianMs: Number(canvasPicking?.durationMs?.median) || 0,
      initialRenderedBytes: Number(canvasPicking?.subsystemRenderedBytes) || 0,
      initialModuleCount: Number(canvasPicking?.subsystemModuleCount) || 0,
    },
    rationale:
      'It has the largest measured initial dependency fan-out while its installer performs almost no boot CPU. The opportunity is download/parse/evaluation removal, not micro-optimizing the installer.',
    boundary:
      'Preserve services.canvasPicking as a small stable dispatcher; dynamically import one cached implementation promise and preload after first paint/idle.',
    requiredProof:
      'Measure actual raw/gzip closure savings in an isolated boundary experiment and prove first click, first hover, concurrent loads, disposal, project replacement, and import failure/retry behavior.',
  },
};

const lines = [
  '# Boot critical-path report',
  '',
  `Generated: ${report.generatedAt}`,
  `Artifact: ${report.artifact.buildId} / ${report.artifact.bundleSha256}`,
  `Environment: ${report.environment.platform} ${report.environment.architecture}; browser=${report.environment.browserVersion}; viewport=${report.environment.viewport?.width || 0}x${report.environment.viewport?.height || 0}`,
  '',
  '> Runtime milliseconds are not directly comparable across environments. Subsystem rendered bytes are attribution evidence before final chunk minification, not guaranteed savings.',
  '> Category C rows are candidates, not claims that deferral is already behaviorally safe. Unknown blockers must be resolved by a focused experiment before lifecycle changes.',
  '',
  '## Macro spans',
  '',
  '| Span | Median ms |',
  '|---|---:|',
  ...report.macroSpans.map(span => `| ${span.name} | ${formatDuration(span.durationMs)} |`),
  '',
  '## Phases',
  '',
  '| Phase | Median ms |',
  '|---|---:|',
  ...report.phases.map(phase => `| ${phase.name} | ${formatDuration(phase.durationMs)} |`),
  '',
  '## Steps',
  '',
  '| Step | Duration median (range; MAD) | Initial subsystem contribution | Must block React? | Must block first render? | Category / confidence | Candidate strategy | Risk |',
  '|---|---:|---:|---|---|---|---|---|',
  ...report.steps.map(
    step =>
      `| ${step.step} | ${formatDuration(step.durationMs)} | ${step.subsystem}: ${step.subsystemRenderedBytes} B / ${step.subsystemModuleCount} modules | ${step.mustBlockReact} | ${step.mustBlockFirstRender} | ${step.category}: ${step.confidence} | ${step.strategy} | ${step.risk} |`
  ),
  '',
  '## Recommended next refactor: Canvas Picking only',
  '',
  `Evidence: ${report.recommendedNextRefactor.evidence.initialRenderedBytes} rendered bytes across ${report.recommendedNextRefactor.evidence.initialModuleCount} initial modules; installer median ${report.recommendedNextRefactor.evidence.bootInstallerMedianMs} ms.`,
  '',
  report.recommendedNextRefactor.rationale,
  '',
  `Proposal: ${report.recommendedNextRefactor.boundary}`,
  '',
  `Required proof before implementation: ${report.recommendedNextRefactor.requiredProof}`,
  '',
];

fs.mkdirSync(perfDir, { recursive: true });
fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(outputMdPath, `${lines.join('\n')}\n`, 'utf8');
console.log(
  `[boot-critical-path] steps=${steps.length} A=${categoryCounts.A} B=${categoryCounts.B} C=${categoryCounts.C} D=${categoryCounts.D}`
);
