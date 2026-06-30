import path from 'node:path';

export const BROWSER_PERF_BASELINE_RELATIVE_PATH = 'tools/wp_browser_perf_smoke_baseline.json';

export function resolveBrowserPerfBaselinePath(projectRoot = process.cwd()) {
  const root = typeof projectRoot === 'string' && projectRoot.trim() ? projectRoot : process.cwd();
  return path.join(root, BROWSER_PERF_BASELINE_RELATIVE_PATH);
}
