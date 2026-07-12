import fs from 'node:fs';
import path from 'node:path';

export const CANONICAL_TEST_FILE_RE = /(?:\.test|\.spec)\.(?:js|cjs|mjs|ts|tsx)$/u;

function normalizeSlash(value) {
  return String(value).split(path.sep).join('/');
}

export function isCanonicalTestFile(filePath) {
  return CANONICAL_TEST_FILE_RE.test(path.basename(String(filePath)));
}

export function isPlaywrightE2ETestFile(filePath, projectRoot = process.cwd()) {
  const root = typeof projectRoot === 'string' && projectRoot ? projectRoot : process.cwd();
  const absolute = path.resolve(String(filePath));
  const e2eRoot = path.resolve(root, 'tests', 'e2e');
  return absolute === e2eRoot || absolute.startsWith(`${e2eRoot}${path.sep}`);
}

export function listCanonicalTestFiles(projectRoot) {
  const testsDir = path.join(projectRoot, 'tests');
  if (!fs.existsSync(testsDir)) return [];

  const files = [];
  const stack = [testsDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && isCanonicalTestFile(entry.name)) {
        files.push(full);
      }
    }
  }

  files.sort((left, right) => normalizeSlash(left).localeCompare(normalizeSlash(right)));
  return files;
}
