import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export function resolveProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

export function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function listTestFiles(projectRoot) {
  const testsDir = path.join(projectRoot, 'tests');
  if (!fileExists(testsDir)) return [];

  const out = [];
  const stack = [testsDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        const isSupported =
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.mjs') ||
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx');
        if (isSupported) out.push(full);
      }
    }
  }

  out.sort();
  return out;
}

export function hasAnyTsTests(projectRoot) {
  return listTestFiles(projectRoot).some(filePath => filePath.endsWith('.ts') || filePath.endsWith('.tsx'));
}

export function ensureTsxInstalled(projectRoot) {
  const pkgJson = path.join(projectRoot, 'node_modules', 'tsx', 'package.json');
  if (fileExists(pkgJson)) return;

  const require = createRequire(import.meta.url);
  try {
    require.resolve('tsx', { paths: [projectRoot] });
    return;
  } catch {
    // fall through to explicit error below
  }

  throw new Error(
    '[WardrobePro] Missing dependency: tsx. Run `npm i` (or `npm i tsx`).\n' +
      'If you have NODE_ENV=production / omit=dev enabled, make sure dependencies are installed.'
  );
}

export function getNodeArgs({ projectRoot, forceTsx }) {
  const needsTsx = forceTsx || hasAnyTsTests(projectRoot);
  if (!needsTsx) return [];
  ensureTsxInstalled(projectRoot);
  return ['--import', 'tsx'];
}
