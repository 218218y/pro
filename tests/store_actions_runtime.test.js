import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule, requireFromTsRuntimeLoader } from './_ts_runtime_module_loader.mjs';

const require = requireFromTsRuntimeLoader;

function loadTsModule(relPath, calls, cache = new Map()) {
  const file = path.join(process.cwd(), relPath);
  const localRequire = specifier => {
    if (specifier === '../../../services/api.js') {
      return {
        setRuntimeGlobalClickMode: (...args) => calls.push(['setRuntimeGlobalClickMode', ...args]),
        setRuntimeSketchMode: (...args) => calls.push(['setRuntimeSketchMode', ...args]),
        runAppStructuralModulesRecompute: (...args) => {
          calls.push(['runAppStructuralModulesRecompute', ...args]);
          return { ok: true };
        },
      };
    }
    return require(specifier);
  };

  return loadTsRuntimeModule(file, {
    cache,
    mock: specifier => localRequire(specifier),
  });
}

test('store actions runtime: recomputeFromUi delegates to canonical app-bound structural recompute owner', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/actions/store_actions_runtime.ts', calls);
  const app = { id: 'app' };
  const meta = { source: 'custom:source', immediate: true };
  const opts = { structureChanged: false, preserveTemplate: false, anchorSide: 'right', extra: 7 };

  mod.recomputeFromUi(app, { doors: 4 }, meta, opts);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'runAppStructuralModulesRecompute');
  assert.equal(calls[0][1], app);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), { doors: 4 });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][3])), meta);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][4])), { source: 'react:recomputeFromUi' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][5])), opts);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][6])), {});
});

test('store actions runtime: recomputeFromUi swallows owner failures without throwing', () => {
  const calls = [];
  const file = path.join(process.cwd(), 'esm/native/ui/react/actions/store_actions_runtime.ts');
  const mod = loadTsRuntimeModule(file, {
    mock: specifier => {
      if (specifier === '../../../services/api.js') {
        return {
          setRuntimeGlobalClickMode: (...args) => calls.push(['setRuntimeGlobalClickMode', ...args]),
          setRuntimeSketchMode: (...args) => calls.push(['setRuntimeSketchMode', ...args]),
          runAppStructuralModulesRecompute: (...args) => {
            calls.push(['runAppStructuralModulesRecompute', ...args]);
            throw new Error('boom');
          },
        };
      }
      return require(specifier);
    },
  });

  assert.doesNotThrow(() => {
    mod.recomputeFromUi({ id: 'app' }, null, undefined, { structureChanged: true });
  });
  assert.equal(calls[0][0], 'runAppStructuralModulesRecompute');
});
