import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadSketchActionsHarness(initialRuntime = {}, options = {}) {
  const file = path.resolve('esm/native/ui/react/actions/sketch_actions.ts');
  const calls = [];
  const diagnostics = [];
  const store = {
    runtime: {
      sketchMode: false,
      ...initialRuntime,
    },
    ui: {},
  };
  const app = {};
  const api = loadTsRuntimeModule(file, {
    mock: specifier => {
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
          reportError: (_app, error, ctx) => diagnostics.push({ error, ctx }),
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
            if (options.rejectStructuralMutation) throw new Error('structural mutation rejected');
            applyDirectMutation(buildMeta(sourceName, overrides));
            return { appliedViaActions: false, requestedBuild: false };
          },
        };
      }
      return undefined;
    },
    globals: { console },
  });
  return { api, calls, diagnostics, store, app };
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

test('[sketch-actions] rejected runtime commit reports and does not publish a stale UI mirror', () => {
  const { api, calls, diagnostics, store, app } = loadSketchActionsHarness(
    {},
    { rejectStructuralMutation: true }
  );

  api.toggleSketchMode(app, { source: 'react:sketch:reject' });

  assert.equal(store.runtime.sketchMode, false);
  assert.equal(store.ui.sketchMode, undefined);
  assert.equal(
    calls.some(entry => entry[0] === 'setUiSketchModeMirror'),
    false
  );
  assert.equal(
    diagnostics.some(entry => entry.ctx?.op === 'runtime.commit'),
    true
  );
});
