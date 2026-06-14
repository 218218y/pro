import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadInteriorActionsHarness(initialUi = {}) {
  const file = path.resolve('esm/native/ui/react/actions/interior_actions.ts');
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
    ui: {
      internalDrawersEnabled: false,
      ...initialUi,
    },
  };
  const app = {};
  const mod = { exports: {} };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: specifier => {
      if (specifier === './modes_actions.js') {
        return {
          getPrimaryMode: () => 'none',
          enterPrimaryMode: (...args) => calls.push(['enterPrimaryMode', ...args]),
          exitPrimaryMode: (...args) => calls.push(['exitPrimaryMode', ...args]),
        };
      }
      if (specifier === '../../../services/api.js') {
        return {
          MODES: {},
          getUiFeedback: () => ({ toast: (...args) => calls.push(['toast', ...args]) }),
          getMetaActionFn: (_app, name) =>
            name === 'interactiveImmediate'
              ? sourceName => ({ source: sourceName, immediate: true, profile: 'interactive' })
              : null,
          readStoreStateMaybe: () => store,
        };
      }
      if (specifier === './store_actions.js') {
        return {
          setUiCurrentLayoutType: (...args) => calls.push(['setUiCurrentLayoutType', ...args]),
          setUiExtDrawerSelection: (...args) => calls.push(['setUiExtDrawerSelection', ...args]),
          setUiGridDivisionsState: (...args) => calls.push(['setUiGridDivisionsState', ...args]),
          setUiGridShelfVariantState: (...args) => calls.push(['setUiGridShelfVariantState', ...args]),
          setUiFlag: (_app, key, value, meta) => {
            calls.push(['setUiFlag', key, value, meta]);
            store.ui[key] = !!value;
          },
        };
      }
      if (specifier === './structural_build_refresh_actions.js') {
        const buildMeta = (sourceName, overrides = {}) => {
          const meta = { ...overrides, source: String(sourceName || '').trim(), immediate: true };
          delete meta.noBuild;
          return meta;
        };
        return {
          applyImmediateStructuralUiMutation: (_app, sourceName, patch, applyDirectMutation, overrides) => {
            calls.push(['applyImmediateStructuralUiMutation', sourceName, patch, overrides]);
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

test('[interior-actions] internal drawer toggle routes through immediate structural ui mutation', () => {
  const { api, calls, store, app } = loadInteriorActionsHarness();

  api.setInternalDrawersEnabled(app, true);

  assert.equal(store.ui.internalDrawersEnabled, true);
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralUiMutation' &&
        entry[1] === 'react:interior:sketchIntDrawersToggle' &&
        JSON.stringify(entry[2]) === JSON.stringify({ internalDrawersEnabled: true }) &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({
            source: 'react:interior:sketchIntDrawersToggle',
            immediate: true,
            profile: 'interactive',
          })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiFlag' &&
        entry[1] === 'internalDrawersEnabled' &&
        entry[2] === true &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({
            source: 'react:interior:sketchIntDrawersToggle',
            immediate: true,
            profile: 'interactive',
          })
    )
  );
});

test('[interior-actions] internal drawer toggle keeps semantic no-op quiet', () => {
  const { api, calls, store, app } = loadInteriorActionsHarness({ internalDrawersEnabled: true });

  api.setInternalDrawersEnabled(app, true);

  assert.equal(store.ui.internalDrawersEnabled, true);
  assert.equal(
    calls.some(entry => entry[0] === 'applyImmediateStructuralUiMutation'),
    false
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setUiFlag'),
    false
  );
});
