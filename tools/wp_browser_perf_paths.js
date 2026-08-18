import path from 'node:path';

export const BROWSER_PERF_BASELINE_RELATIVE_PATH = 'tools/wp_browser_perf_smoke_baseline.json';
export const RELEASE_BROWSER_PERF_BASELINE_RELATIVE_PATH = 'tools/wp_browser_perf_release_baseline.json';

export function resolveBrowserPerfBaselinePath(projectRoot = process.cwd(), target = 'dev') {
  const root = typeof projectRoot === 'string' && projectRoot.trim() ? projectRoot : process.cwd();
  if (target !== 'dev' && target !== 'release') {
    throw new Error(`[browser-perf] unknown baseline target ${JSON.stringify(target)}`);
  }
  const relativePath =
    target === 'release' ? RELEASE_BROWSER_PERF_BASELINE_RELATIVE_PATH : BROWSER_PERF_BASELINE_RELATIVE_PATH;
  return path.join(root, relativePath);
}
