import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relPath, calls, cache = new Map()) {
  const file = path.join(process.cwd(), relPath);
  if (cache.has(file)) return cache.get(file).exports;

  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;

  const mod = { exports: {} };
  cache.set(file, mod);

  const localRequire = specifier => {
    if (specifier === '../actions/room_actions.js') {
      return {
        setManualWidth: (...args) => calls.push(['setManualWidth', ...args]),
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        runPerfAction: (app, name, fn, meta) => {
          calls.push(['runPerfAction', app, name, meta]);
          return fn();
        },
      };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        applyUiRawScalarPatch: (...args) => calls.push(['applyUiRawScalarPatch', ...args]),
        setUiCellDimsDepth: (...args) => calls.push(['setUiCellDimsDepth', ...args]),
        setUiCellDimsHeight: (...args) => calls.push(['setUiCellDimsHeight', ...args]),
        setUiCellDimsWidth: (...args) => calls.push(['setUiCellDimsWidth', ...args]),
        setUiSingleDoorPos: (...args) => calls.push(['setUiSingleDoorPos', ...args]),
        setUiStackSplitLowerDoors: (...args) => calls.push(['setUiStackSplitLowerDoors', ...args]),
        setUiStackSplitLowerDoorsManual: (...args) =>
          calls.push(['setUiStackSplitLowerDoorsManual', ...args]),
        setUiStructureSelect: (...args) => calls.push(['setUiStructureSelect', ...args]),
      };
    }
    if (specifier === './structure_tab_library_helpers.js') {
      return {
        normalizeSingleDoorPos: (doors, rawPos) => {
          calls.push(['normalizeSingleDoorPos', doors, rawPos]);
          if (!rawPos) return 'left';
          return rawPos === 'middle' ? 'center' : rawPos;
        },
        safeJsonParse: value => {
          calls.push(['safeJsonParse', value]);
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        },
        sumDoorsFromStructure: value => {
          calls.push(['sumDoorsFromStructure', value]);
          return Array.isArray(value) ? value.reduce((sum, entry) => sum + (Number(entry) || 0), 0) : null;
        },
      };
    }
    if (specifier === './structure_tab_core.js') {
      return {
        applyStructureTemplateRecomputeBatch: args =>
          calls.push(['applyStructureTemplateRecomputeBatch', args]),
        structureTabReportNonFatal: (...args) => calls.push(['structureTabReportNonFatal', ...args]),
      };
    }
    if (specifier === './structure_tab_structure_mutations_shared.js') {
      return {
        buildRawUiPatch: raw => ({ raw }),
        normalizeDoorsValue: (wardrobeType, value) =>
          Math.max(wardrobeType === 'sliding' ? 2 : 0, Math.round(Number(value) || 0)),
        readRawPatch: patch => (patch && patch.raw) || {},
        readSingleDoorPosOr: (value, fallback) => (value ? value : fallback),
      };
    }
    if (specifier.startsWith('./')) {
      const target = path.join(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      const rel = path.relative(process.cwd(), target);
      return loadTsModule(rel, calls, cache);
    }
    return require(specifier);
  };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

function createMeta() {
  return {
    uiOnlyImmediate: source => ({ source, immediate: true, uiOnly: true }),
    noBuildImmediate: source => ({ source, immediate: true, noBuild: true }),
    noBuild: (meta, source) => ({ ...(meta || {}), source, noBuild: true }),
    noHistory: (meta, source) => ({ ...(meta || {}), source, noHistory: true }),
  };
}

function baseArgs(overrides = {}) {
  return {
    app: { id: 'app' },
    meta: createMeta(),
    getDisplayedRawValue: key =>
      ({ width: 160, height: 240, depth: 60, doors: 4, stackSplitLowerDoors: 2 })[key] || 0,
    wardrobeType: 'hinged',
    isManualWidth: false,
    width: 160,
    doors: 4,
    structureSelectRaw: '',
    singleDoorPosRaw: '',
    ...overrides,
  };
}

test('[structure-raw-mutations] width commit batches manual-width config with ui raw patch', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs(),
    key: 'width',
    nextValue: 220,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:width');
  assert.equal(JSON.stringify(args.uiPatch), JSON.stringify({ raw: { width: 220 } }));
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({ ui: { raw: { width: 220 } }, config: { isManualWidth: true } })
  );
  assert.equal(typeof args.mutate, 'function');
  assert.ok(
    calls.some(entry => entry[0] === 'runPerfAction' && entry[2] === 'structure.dimensions.width.commit')
  );
  assert.ok(!calls.some(entry => entry[0] === 'setManualWidth'));
});

test('[structure-raw-mutations] doors commit collapses auto-width fix into the same canonical state patch', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ isManualWidth: true, width: 160, doors: 4 }),
    key: 'doors',
    nextValue: 5,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:doors');
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({
      ui: { raw: { doors: 5, width: 200 }, singleDoorPos: 'left' },
      config: { isManualWidth: false },
    })
  );
  assert.ok(!calls.some(entry => entry[0] === 'setManualWidth'));
});

test('[structure-raw-mutations] stack-split lower doors commit uses one ui patch instead of split writes', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ stackSplitLowerDoors: 2 })[key] || 0 }),
    key: 'stackSplitLowerDoors',
    nextValue: 3,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:stackSplitLowerDoors');
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({
      ui: { raw: { stackSplitLowerDoors: 3, stackSplitLowerDoorsManual: true } },
    })
  );
});
