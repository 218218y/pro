#!/usr/bin/env node
/*
  Write Contract Guard (fast static checks)

  Goals:
  - Keep config/map write semantics centralized (no scattered __replace patches).
  - Prevent stack/corner write regressions back into stateKernel compat seams.

  This is intentionally lightweight and dependency-free (no ESLint plugin needed).
  It runs as part of `wp_lint.js --profile migrate`.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['esm', 'types', 'tools', 'js'];
const EXT_OK = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function walk(dir, out) {
  let list = [];
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of list) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build' || ent.name === '.git')
        continue;
      walk(abs, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name);
    if (!EXT_OK.has(ext)) continue;
    out.push(abs);
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function lineNumberOf(text, idx) {
  // 1-based
  let n = 1;
  for (let i = 0; i < idx && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

const ALLOW__REPLACE = new Set([
  'esm/native/platform/store.ts',
  'esm/native/kernel/state_api.ts',
  'esm/native/runtime/cfg_access.ts',
  'esm/native/runtime/cfg_access.js',
]);

const ALLOW_STATEKERNEL_STACK_METHODS = new Set([
  // Kernel owns these compat seams; other layers must use App.actions.modules/corner.
  'esm/native/kernel/kernel.ts',
  // state_api intentionally owns the stack router surface and contains explicit, audited wrappers.
  'esm/native/kernel/state_api.ts',
]);

const ALLOW_UI_RUNTIME_PATCH = new Set([
  // Store owns patch application.
  'esm/native/platform/store.ts',
  // Kernel/state_api owns canonical action surfaces.
  'esm/native/kernel/kernel.ts',
  'esm/native/kernel/state_api.ts',
  // Canonical write access ladders.
  'esm/native/runtime/ui_write_access.ts',
  'esm/native/runtime/runtime_write_access.ts',
]);
const ALLOW_MODE_PATCH = new Set([
  // Store owns patch application.
  'esm/native/platform/store.ts',
  // Kernel/state_api owns canonical action surfaces.
  'esm/native/kernel/kernel.ts',
  'esm/native/kernel/state_api.ts',
  // Canonical mode write access ladder.
  'esm/native/runtime/mode_write_access.ts',
]);

const violations = [];

function scanFile(fileAbs) {
  let text = '';
  try {
    text = fs.readFileSync(fileAbs, 'utf8');
  } catch {
    return;
  }
  const rp = rel(fileAbs);

  // Don't self-scan.
  if (rp === 'tools/wp_write_contract_guard.js') return;

  // Types may legitimately mention protocol fields (e.g. __replace) and legacy method names.
  // This guard is about WRITE-PATH *implementations*.
  const isTypes = rp.startsWith('types/');

  // 1) Ban scattered __replace usage.
  const idxReplace = isTypes ? -1 : text.indexOf('__replace');
  if (idxReplace >= 0 && !ALLOW__REPLACE.has(rp)) {
    violations.push({
      file: rp,
      kind: 'no-scattered-__replace',
      line: lineNumberOf(text, idxReplace),
      msg: 'Use cfg_access helpers (setMap/patchMap or applyConfigPatchReplaceKeys) instead of hand-rolling __replace.',
    });
  }

  // 2) Ban stack/corner compat calls via stateKernel (outside kernel itself).
  const stackMethods = isTypes
    ? []
    : [
        'ensureModuleConfigForStack',
        'patchModuleConfigForStack',
        'ensureSplitLowerModuleConfig',
        'ensureCornerConfig',
        'ensureCornerCellConfig',
        'ensureSplitLowerCornerConfig',
        'ensureSplitLowerCornerCellConfig',
        'patchModuleConfig',
        'patchSplitLowerCornerConfig',
        'patchSplitLowerCornerCellConfig',
        'patchSplitLowerModuleConfig',
      ];
  if (!isTypes && (text.includes('stateKernel') || text.includes('stateKernelCompat'))) {
    for (const m of stackMethods) {
      const idx = text.indexOf(m);
      if (idx >= 0 && !ALLOW_STATEKERNEL_STACK_METHODS.has(rp)) {
        violations.push({
          file: rp,
          kind: 'no-stateKernel-stack-compat',
          line: lineNumberOf(text, idx),
          msg: `Do not call legacy stateKernel.${m}(). Use App.actions.modules.* / App.actions.corner.* instead.`,
        });
        break;
      }
    }
  }

  // 3) Ban direct config store.patch outside canonical routers.
  // (Keep it narrow to config writes only.)
  const reConfigPatch = /\.patch(?:\?\.)?\s*\(\s*\{\s*config\s*:/g;
  let mm;
  while ((mm = reConfigPatch.exec(text))) {
    const idx = mm.index;
    const allow =
      rp === 'esm/native/kernel/state_api.ts' ||
      rp === 'esm/native/runtime/cfg_access.ts' ||
      rp === 'esm/native/kernel/kernel.ts';
    if (!allow) {
      violations.push({
        file: rp,
        kind: 'no-direct-config-store.patch',
        line: lineNumberOf(text, idx),
        msg: 'Do not call store.patch({ config: ... }) directly. Use actions.config.* / cfg_access instead.',
      });
      break;
    }
  }

  // 4) Ban direct UI/runtime patch envelopes outside canonical write-access ladders.
  // This catches both store.patch({ ui/runtime }) and actions.patch({ ui/runtime }).
  const reUiPatch = /\.patch(?:\?\.)?\s*\(\s*\{\s*ui\s*:/g;
  let mu;
  while ((mu = reUiPatch.exec(text))) {
    const idx = mu.index;
    if (!ALLOW_UI_RUNTIME_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-ui-patch',
        line: lineNumberOf(text, idx),
        msg: 'Do not call *.patch({ ui: ... }) directly. Use services/api.patchUi/patchUiSoft or runtime/ui_write_access.',
      });
      break;
    }
  }

  const reRuntimePatch = /\.patch(?:\?\.)?\s*\(\s*\{\s*runtime\s*:/g;
  let mr;
  while ((mr = reRuntimePatch.exec(text))) {
    const idx = mr.index;
    if (!ALLOW_UI_RUNTIME_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-runtime-patch',
        line: lineNumberOf(text, idx),
        msg: 'Do not call *.patch({ runtime: ... }) directly. Use services/api.patchRuntime/setRuntimeScalar or runtime/runtime_write_access.',
      });
      break;
    }
  }

  // 4.5) Ban direct mode patch envelopes outside canonical mode write-access ladder.
  const reModePatch = /\.patch(?:\?\.)?\s*\(\s*\{\s*mode\s*:/g;
  let mmode;
  while ((mmode = reModePatch.exec(text))) {
    const idx = mmode.index;
    if (!ALLOW_MODE_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-mode-patch',
        line: lineNumberOf(text, idx),
        msg: 'Do not call *.patch({ mode: ... }) directly. Use App.actions.mode.set or services/api.setModePrimary or runtime/mode_write_access.',
      });
      break;
    }
  }

  // 4.6) Ban direct store.setMode calls outside canonical routers.
  const reSetMode = /\.setMode\s*\(/g;
  let msm;
  while ((msm = reSetMode.exec(text))) {
    const idx = msm.index;
    if (!ALLOW_MODE_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-store.setMode',
        line: lineNumberOf(text, idx),
        msg: 'Do not call store.setMode(...) directly. Use App.actions.mode.set or services/api.setModePrimary or runtime/mode_write_access.',
      });
      break;
    }
  }
  // 5) Ban direct store.setUi / store.setRuntime calls outside canonical ladders.
  // (Dot-form only; does not match function definitions.)
  const reSetUi = /\.setUi\s*\(/g;
  let msu;
  while ((msu = reSetUi.exec(text))) {
    const idx = msu.index;
    if (!ALLOW_UI_RUNTIME_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-store.setUi',
        line: lineNumberOf(text, idx),
        msg: 'Do not call store.setUi(...) directly. Use services/api.patchUi/patchUiSoft or runtime/ui_write_access.',
      });
      break;
    }
  }

  const reSetRuntime = /\.setRuntime\s*\(/g;
  let msr;
  while ((msr = reSetRuntime.exec(text))) {
    const idx = msr.index;
    if (!ALLOW_UI_RUNTIME_PATCH.has(rp)) {
      violations.push({
        file: rp,
        kind: 'no-direct-store.setRuntime',
        line: lineNumberOf(text, idx),
        msg: 'Do not call store.setRuntime(...) directly. Use services/api.patchRuntime/setRuntimeScalar or runtime/runtime_write_access.',
      });
      break;
    }
  }
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(ROOT, d);
    if (!exists(abs)) continue;
    walk(abs, files);
  }

  for (const f of files) scanFile(f);

  if (violations.length) {
    console.error('[WP Write Contract Guard] Violations found:\n');
    for (const v of violations) {
      console.error(`- ${v.file}:${v.line}  [${v.kind}]  ${v.msg}`);
    }
    console.error('\nFix the violations or update the allowlist only when absolutely necessary.');
    process.exit(2);
  }

  process.exit(0);
}

main();
