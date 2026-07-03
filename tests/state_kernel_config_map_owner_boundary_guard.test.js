import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT = fileURLToPath(new URL('../esm/native/', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walk(p, out);
      continue;
    }
    if (/\.(ts|tsx|js|mjs)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function relFromSource(p) {
  return path.relative(SOURCE_ROOT, p).replace(/\\/g, '/');
}

function relFromRepo(p) {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function hitsFor(files, patterns) {
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = patterns.filter(pattern => pattern.test(text)).map(pattern => String(pattern));
    if (matches.length) hits.push({ file: relFromRepo(file), matches });
  }
  return hits;
}

test('[state-kernel config-map owner] generic state-kernel config map names stay retired', () => {
  const files = [...walk(SOURCE_ROOT), path.join(REPO_ROOT, 'types/state.ts')];
  const retiredMapWriter = 'patch' + 'ConfigMaps';
  const retiredConfigWriter = 'apply' + 'Config';
  const legacyPatterns = [
    new RegExp(`__sk\\.${retiredMapWriter}\\b`),
    new RegExp(`__sk\\.${retiredConfigWriter}\\b`),
    new RegExp(`\\bstateKernel\\.${retiredMapWriter}\\b`),
    new RegExp(`\\bstateKernel\\.${retiredConfigWriter}\\b`),
    new RegExp(`${retiredMapWriter}\\?:`),
    new RegExp(`${retiredConfigWriter}\\?: \\(cfgIn: unknown`),
    new RegExp(`kernel\\.${retiredConfigWriter}`),
  ];

  assert.deepEqual(hitsFor(files, legacyPatterns), []);
});

test('[state-kernel config-map owner] snapshot writers stay constrained to kernel owner files', () => {
  const allowed = [
    'kernel/kernel.ts',
    'kernel/kernel_state_kernel_config_maps_apply.ts',
    'kernel/kernel_state_kernel_config_maps_patch_ops.ts',
    'runtime/assert.ts',
  ].sort();

  const hits = walk(SOURCE_ROOT)
    .filter(file => fs.readFileSync(file, 'utf8').includes('applyKernelConfig'))
    .map(relFromSource)
    .sort();

  assert.deepEqual(hits, allowed);
});

test('[state-kernel config-map owner] snapshot writer contract is documented as internal only', () => {
  const stateTypes = fs.readFileSync(path.join(REPO_ROOT, 'types/state.ts'), 'utf8');
  const applySurface = fs.readFileSync(
    path.join(SOURCE_ROOT, 'kernel/kernel_state_kernel_config_maps_apply.ts'),
    'utf8'
  );
  const mapSurface = fs.readFileSync(
    path.join(SOURCE_ROOT, 'kernel/kernel_state_kernel_config_maps_patch_ops.ts'),
    'utf8'
  );

  assert.match(stateTypes, /Internal kernel snapshot helpers\. Not UI\/service\/domain config writers\./);
  assert.match(
    applySurface,
    /Internal kernel snapshot boundary only\. UI\/service\/domain map writes must use semantic writers\./
  );
  assert.match(
    mapSurface,
    /Internal kernel snapshot boundary only\. UI\/service\/domain map writes must use semantic writers\./
  );
  assert.match(
    stateTypes,
    /applyKernelConfigSnapshot\?: \(cfgIn: unknown, metaIn\?: ActionMetaLike\) => unknown;/
  );
  assert.match(
    stateTypes,
    /applyKernelConfigMapSnapshot\?: \(patchObj: unknown, meta\?: ActionMetaLike\) => unknown;/
  );
});
