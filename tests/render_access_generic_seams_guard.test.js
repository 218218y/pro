import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NATIVE = path.join(ROOT, 'esm', 'native');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.js')) out.push(p);
  }
  return out;
}

test('generic render seams are confined to runtime/render_access only', () => {
  const allowed = new Set([
    path.join(NATIVE, 'runtime', 'render_access.ts'),
    path.join(NATIVE, 'runtime', 'render_access.js'),
    path.join(NATIVE, 'runtime', 'render_access_surface.ts'),
    path.join(NATIVE, 'runtime', 'render_access_surface.js'),
    path.join(NATIVE, 'runtime', 'render_access_state.ts'),
    path.join(NATIVE, 'runtime', 'render_access_state.js'),
    path.join(NATIVE, 'runtime', 'render_access_state_bags.ts'),
    path.join(NATIVE, 'runtime', 'render_access_state_bags.js'),
    path.join(NATIVE, 'runtime', 'render_access_state_runtime.ts'),
    path.join(NATIVE, 'runtime', 'render_access_state_runtime.js'),
  ]);

  const offenders = [];
  for (const file of walk(NATIVE)) {
    const src = fs.readFileSync(file, 'utf8');
    if (
      !/export function getRenderNamespace\(|export function getRenderCache\(|export function getRenderMeta\(|export function getRenderMaterials\(/.test(
        src
      )
    )
      continue;
    if (!allowed.has(file)) offenders.push(path.relative(ROOT, file));
  }

  assert.deepEqual(offenders, []);
});
