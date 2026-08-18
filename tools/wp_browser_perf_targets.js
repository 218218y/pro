import path from 'node:path';

export const BROWSER_PERF_CONFIRMATION_FLAG = '--confirm-regression';

export function areBrowserPerfFailuresConfirmationEligible(failures) {
  return (
    Array.isArray(failures) &&
    failures.length > 0 &&
    failures.every(failure => (typeof failure === 'string' ? failure.includes(' exceeded budget (') : false))
  );
}

const DEV_TARGET = Object.freeze({
  id: 'dev',
  label: 'Vite dev regression',
  environmentKind: 'development',
  buildPipeline: 'vite-dev',
  serverKind: 'vite-dev-server',
  observabilityMode: 'debug',
  baseUrl: 'http://127.0.0.1:5175',
  pagePath: '/index_pro.html',
  serverScript: 'start:e2e',
  buildScript: null,
  artifactRelativeDir: '.artifacts/browser-perf',
  releaseRootRelativePath: null,
  docRelativePath: 'docs/BROWSER_PERF_AND_E2E_BASELINE.md',
});

const RELEASE_TARGET = Object.freeze({
  id: 'release',
  label: 'Release static UX',
  environmentKind: 'release',
  buildPipeline: 'wp_release:perf',
  serverKind: 'static-release-server',
  observabilityMode: 'perf',
  baseUrl: 'http://127.0.0.1:5176',
  pagePath: '/index.html',
  serverScript: 'start:browser-perf-release',
  buildScript: 'build:browser-perf-release',
  artifactRelativeDir: '.artifacts/browser-perf/release',
  releaseRootRelativePath: '.artifacts/browser-perf/release-site',
  docRelativePath: 'docs/RELEASE_BROWSER_PERF_BASELINE.md',
});

export const BROWSER_PERF_TARGETS = Object.freeze({
  dev: DEV_TARGET,
  release: RELEASE_TARGET,
});

export function parseBrowserPerfTarget(argv = process.argv.slice(2)) {
  const args = Array.isArray(argv) ? argv : [];
  let value = 'dev';
  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || '');
    if (token.startsWith('--target=')) {
      value = token.slice('--target='.length);
      continue;
    }
    if (token === '--target') {
      const next = args[index + 1];
      if (!next || String(next).startsWith('--')) {
        throw new Error('[browser-perf] --target requires dev or release');
      }
      value = String(next);
      index += 1;
    }
  }
  const normalized = value.trim().toLowerCase();
  const target = BROWSER_PERF_TARGETS[normalized];
  if (!target) {
    throw new Error(
      `[browser-perf] unknown target ${JSON.stringify(value)}; expected one of: ${Object.keys(BROWSER_PERF_TARGETS).join(', ')}`
    );
  }
  return target;
}

export function createBrowserPerfMeasurementProfile(target) {
  return Object.freeze({
    id: target.id,
    label: target.label,
    environmentKind: target.environmentKind,
    buildPipeline: target.buildPipeline,
    serverKind: target.serverKind,
    observabilityMode: target.observabilityMode,
    pagePath: target.pagePath,
  });
}

export function resolveBrowserPerfTargetPaths(projectRoot, target) {
  const root = path.resolve(projectRoot || process.cwd());
  const artifactDir = path.join(root, target.artifactRelativeDir);
  return Object.freeze({
    latestJsonPath: path.join(artifactDir, 'latest.json'),
    latestMdPath: path.join(artifactDir, 'latest.md'),
    docPath: path.join(root, target.docRelativePath),
    releaseRoot: target.releaseRootRelativePath ? path.join(root, target.releaseRootRelativePath) : null,
  });
}
