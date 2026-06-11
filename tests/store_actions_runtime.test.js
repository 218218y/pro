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
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: specifier => {
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
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });

  assert.doesNotThrow(() => {
    mod.exports.recomputeFromUi({ id: 'app' }, null, undefined, { structureChanged: true });
  });
  assert.equal(calls[0][0], 'runAppStructuralModulesRecompute');
});
