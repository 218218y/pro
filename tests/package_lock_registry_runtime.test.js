import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');

const BLOCKED_REGISTRY_NEEDLES = [
  'applied-caas',
  'internal.api.openai',
  'artifactory/api/npm/npm-public',
  'localhost',
  '127.0.0.1',
];

function collectResolvedEntries(lock) {
  const entries = [];
  for (const [name, meta] of Object.entries(lock.packages || {})) {
    if (meta && typeof meta.resolved === 'string') entries.push({ name, resolved: meta.resolved });
  }
  for (const [name, meta] of Object.entries(lock.dependencies || {})) {
    if (meta && typeof meta.resolved === 'string') entries.push({ name, resolved: meta.resolved });
  }
  return entries;
}

test('package-lock resolved tarballs stay on public registries', () => {
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const resolvedEntries = collectResolvedEntries(lock);
  assert.ok(resolvedEntries.length > 0, 'package-lock should include resolved tarball entries');

  const blocked = resolvedEntries.filter(({ resolved }) =>
    BLOCKED_REGISTRY_NEEDLES.some(needle => resolved.includes(needle))
  );

  assert.deepEqual(
    blocked,
    [],
    'package-lock must not contain private/internal registry URLs because npm ci in GitHub/local machines cannot fetch them'
  );
});
