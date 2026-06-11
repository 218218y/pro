import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const moduleCache = new Map();

function resolveTsPath(specifier, fromFile) {
  if (specifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [resolved, resolved.replace(/\.js$/i, '.ts'), resolved.replace(/\.js$/i, '.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function loadTsModule(file, overrides = {}) {
  const normalized = path.resolve(file);
  const cacheKey = normalized + '::' + Object.keys(overrides).sort().join(',');
  if (moduleCache.has(cacheKey)) return moduleCache.get(cacheKey).exports;

  const source = fs.readFileSync(normalized, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: normalized,
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(cacheKey, mod);
  const localRequire = specifier => {
    if (Object.prototype.hasOwnProperty.call(overrides, specifier)) return overrides[specifier];
    const maybeTs = resolveTsPath(specifier, normalized);
    if (maybeTs) return loadTsModule(maybeTs, overrides);
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(normalized),
    __filename: normalized,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: normalized });
  return mod.exports;
}

const { applyPaintPartMutation } = loadTsModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_flow_apply_special.ts'),
  {
    '../features/mirror_layout.js': {
      readMirrorLayoutList(value) {
        return Array.isArray(value) ? value : [];
      },
    },
    './canvas_picking_core_helpers.js': {
      __wp_canonDoorPartKeyForMaps(value) {
        return value;
      },
      __wp_scopeCornerPartKeyForStack(value) {
        return value;
      },
    },
    './canvas_picking_paint_flow_mirror.js': {
      resolveMirrorLayoutForPaintClick() {
        return { nextLayout: null, removeMatch: null, canApplyMirror: true };
      },
    },
    './canvas_picking_paint_flow_shared.js': {
      isSpecialPart(value) {
        return /^d\d+_/.test(String(value || ''));
      },
      isSpecialVal(value) {
        return value === 'mirror' || value === 'glass';
      },
      readCurtainChoice() {
        return 'none';
      },
    },
  }
);

function createState(overrides = {}) {
  let colors = { ...(overrides.colors0 || {}) };
  let curtains = { ...(overrides.curtains0 || {}) };
  let special = { ...(overrides.special0 || {}) };
  let mirrorLayout = { ...(overrides.mirror0 || {}) };
  return {
    App: {},
    colors0: overrides.colors0 || {},
    curtains0: overrides.curtains0 || {},
    special0: overrides.special0 || {},
    mirror0: overrides.mirror0 || {},
    get colors() {
      return colors;
    },
    get curtains() {
      return curtains;
    },
    get special() {
      return special;
    },
    get mirrorLayout() {
      return mirrorLayout;
    },
    ensureColors: () => colors,
    ensureCurtains: () => curtains,
    ensureSpecial: () => special,
    ensureMirrorLayout: () => mirrorLayout,
  };
}

test('full default mirror is committed on the first click even when no explicit mirror layout payload is needed', () => {
  const state = createState();
  applyPaintPartMutation({
    state,
    paintPartKey: 'd4_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: {},
      foundPartId: 'd4_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.equal(state.mirrorLayout.d4_full, undefined);
});

test('full default mirror toggles off when clicked again on an already full-mirror door', () => {
  const state = createState({ special0: { d4_full: 'mirror' } });
  applyPaintPartMutation({
    state,
    paintPartKey: 'd4_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: {},
      foundPartId: 'd4_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d4_full, undefined);
  assert.equal(state.mirrorLayout.d4_full, undefined);
});

test('full inside mirror is stored as a face-specific full layout', () => {
  const state = createState();
  applyPaintPartMutation({
    state,
    paintPartKey: 'd4_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: {},
      foundPartId: 'd4_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: -1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.deepEqual(JSON.parse(JSON.stringify(state.mirrorLayout.d4_full)), [{ faceSign: -1 }]);
});

test('full outside mirror does not erase an existing full inside mirror', () => {
  const state = createState({
    special0: { d4_full: 'mirror' },
    mirror0: { d4_full: [{ faceSign: -1 }] },
  });
  applyPaintPartMutation({
    state,
    paintPartKey: 'd4_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: {},
      foundPartId: 'd4_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.deepEqual(JSON.parse(JSON.stringify(state.mirrorLayout.d4_full)), [
    { faceSign: -1 },
    { faceSign: 1 },
  ]);
});
