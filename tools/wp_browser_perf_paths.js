import fs from 'node:fs';
import path from 'node:path';

export const BROWSER_PERF_BASELINE_CANDIDATES = Object.freeze([
  'tools/wp_browser_perf_smoke_baseline.json',
  'tools/wp_perf_smoke_baseline.json',
]);

export function resolveBrowserPerfBaselinePath(projectRoot = process.cwd()) {
  const root = typeof projectRoot === 'string' && projectRoot.trim() ? projectRoot : process.cwd();
  const resolved = BROWSER_PERF_BASELINE_CANDIDATES.map(relativePath => path.join(root, relativePath));
  const existing = resolved.find(filePath => fs.existsSync(filePath));
  return existing || resolved[0];
}
