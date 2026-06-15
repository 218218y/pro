import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadSketchActionsHarness(initialRuntime = {}) {
  const file = path.resolve('esm/native/ui/react/actions/sketch_actions.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const calls = [];
  const store = {
    runtime: {
      sketchMode: false,
      ...initialRuntime,
    },
    ui: {},
  };
  const app = {};
  const mod = { exports: {} };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: specifier => {
      if (specifier === '../../../services/api.js') {
        return {
          getMetaActionFn: (_app, name) =>
            name === 'uiOnlyImmediate'
              ? sourceName => ({
                  source: sourceName,
                  immediate: true,
                  noBuild: true,
                  noHistory: true,
                  noPersist: true,
                  uiOnly: true,
                })
              : null,
          readStoreStateMaybe: () => store,
        };
      }
      if (specifier === './store_actions.js') {
        return {
          setRuntimeSketchMode: (_app, next, meta) => {
            calls.push(['setRuntimeSketchMode', next, meta]);
            store.runtime.sketchMode = !!next;
          },
          setUiSketchModeMirror: (_app, next, meta) => {
            calls.push(['setUiSketchModeMirror', next, meta]);
            store.ui.sketchMode = !!next;
          },
        };
      }
      if (specifier === './structural_build_refresh_actions.js') {
        const buildMeta = (sourceName, overrides = {}) => {
          const meta = { ...overrides, source: String(sourceName || '').trim(), immediate: true };
          delete meta.noBuild;
          meta.noBuild = false;
          return meta;
        };
        return {
          applyImmediateStructuralRuntimeMutation: (
            _app,
            sourceName,
            patch,
            applyDirectMutation,
            overrides
          ) => {
            calls.push(['applyImmediateStructuralRuntimeMutation', sourceName, patch, overrides]);
            applyDirectMutation(buildMeta(sourceName, overrides));
            return { appliedViaActions: false, requestedBuild: false };
          },
        };
      }
      return require(specifier);
    },
    console,
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return { api: mod.exports, calls, store, app };
}

test('[sketch-actions] sketch mode runtime write routes through immediate structural runtime mutation', () => {
  const { api, calls, store, app } = loadSketchActionsHarness();

  api.toggleSketchMode(app, { source: ' custom:sketch ', noBuild: true, trace: 'kept' });

  assert.equal(store.runtime.sketchMode, true);
  assert.equal(store.ui.sketchMode, true);
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralRuntimeMutation' &&
        entry[1] === ' custom:sketch ' &&
        JSON.stringify(entry[2]) === JSON.stringify({ sketchMode: true }) &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({ source: ' custom:sketch ', noBuild: true, trace: 'kept' })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setRuntimeSketchMode' &&
        entry[1] === true &&
        JSON.stringify(entry[2]) ===
          JSON.stringify({ source: 'custom:sketch', trace: 'kept', immediate: true, noBuild: false })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiSketchModeMirror' &&
        entry[1] === true &&
        JSON.stringify(entry[2]) ===
          JSON.stringify({
            source: 'react:sketch:syncUi',
            immediate: true,
            noBuild: true,
            noHistory: true,
            noPersist: true,
            uiOnly: true,
          })
    )
  );
});
