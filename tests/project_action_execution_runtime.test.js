import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadModule() {
  const file = path.join(process.cwd(), 'esm/native/ui/project_action_execution.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === './project_load_input_shared.js') {
      return {
        readProjectLoadInputTarget: evt =>
          (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null,
        resetProjectLoadInputTarget: target => {
          try {
            if (target && typeof target === 'object' && 'value' in target) target.value = '';
          } catch {}
        },
      };
    }
    if (specifier === './project_action_execution_shared.js') {
      return {
        clearProjectLoadInputEventTarget: evt => {
          const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
          try {
            if (target && typeof target === 'object' && 'value' in target) target.value = '';
          } catch {}
        },
        runProjectActionFinally: handler => {
          if (typeof handler === 'function') handler();
        },
        reportProjectActionResult: (feedback, result, report) => {
          report(feedback, result);
          return result;
        },
        buildProjectActionErrorResultFromThrown: (feedback, error, report, buildError, fallbackMessage) => {
          const result = buildError(error, fallbackMessage);
          report(feedback, result);
          return result;
        },
      };
    }
    if (specifier === './project_action_execution_sync.js') {
      const shared = localRequire('./project_action_execution_shared.js');
      return {
        executeProjectActionResult: args => {
          const { feedback, run, report, buildError, fallbackMessage } = args;
          try {
            return shared.reportProjectActionResult(feedback, run(), report);
          } catch (error) {
            return shared.buildProjectActionErrorResultFromThrown(
              feedback,
              error,
              report,
              buildError,
              fallbackMessage
            );
          } finally {
            shared.runProjectActionFinally(args.finally);
          }
        },
      };
    }
    if (specifier === './project_action_execution_async.js') {
      const shared = localRequire('./project_action_execution_shared.js');
      return {
        executeAsyncProjectActionResult: async args => {
          const { feedback, run, report, buildError, fallbackMessage } = args;
          try {
            return shared.reportProjectActionResult(feedback, await run(), report);
          } catch (error) {
            return shared.buildProjectActionErrorResultFromThrown(
              feedback,
              error,
              report,
              buildError,
              fallbackMessage
            );
          } finally {
            shared.runProjectActionFinally(args.finally);
          }
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

test('[project-action-execution] sync execution reports results, preserves errors, and runs finally cleanup', () => {
  const mod = loadModule();
  const seen = [];
  const target = { value: 'dirty' };

  const ok = mod.executeProjectActionResult({
    feedback: { id: 'fb' },
    run: () => ({ ok: true }),
    report: (fb, result) => seen.push(['report', fb, result]),
    buildError: (error, fallbackMessage) => ({
      ok: false,
      reason: 'error',
      message: error?.message || fallbackMessage,
    }),
    fallbackMessage: 'fallback',
    finally: () => mod.clearProjectLoadInputEventTarget({ currentTarget: target }),
  });

  assert.deepEqual(ok, { ok: true });
  assert.equal(target.value, '');
  assert.deepEqual(seen, [['report', { id: 'fb' }, { ok: true }]]);

  const failed = mod.executeProjectActionResult({
    feedback: null,
    run: () => {
      throw new Error('sync exploded');
    },
    report: (_fb, result) => seen.push(['error', result]),
    buildError: (error, fallbackMessage) => ({
      ok: false,
      reason: 'error',
      message: error?.message || fallbackMessage,
    }),
    fallbackMessage: 'fallback',
  });

  assert.deepEqual(failed, { ok: false, reason: 'error', message: 'sync exploded' });
  assert.deepEqual(seen[1], ['error', { ok: false, reason: 'error', message: 'sync exploded' }]);
});

test('[project-action-execution] async execution reports awaited results, preserves thrown failures, and runs finally cleanup', async () => {
  const mod = loadModule();
  const seen = [];
  const target = { value: 'keep' };

  const ok = await mod.executeAsyncProjectActionResult({
    feedback: { id: 'fb' },
    run: async () => ({ ok: true, pending: false }),
    report: (fb, result) => seen.push(['report', fb, result]),
    buildError: (error, fallbackMessage) => ({
      ok: false,
      reason: 'error',
      message: error?.message || fallbackMessage,
    }),
    fallbackMessage: 'fallback',
    finally: () => mod.clearProjectLoadInputEventTarget({ currentTarget: target }),
  });

  assert.deepEqual(ok, { ok: true, pending: false });
  assert.equal(target.value, '');
  assert.deepEqual(seen, [['report', { id: 'fb' }, { ok: true, pending: false }]]);

  const failed = await mod.executeAsyncProjectActionResult({
    feedback: null,
    run: async () => {
      throw new Error('async exploded');
    },
    report: (_fb, result) => seen.push(['error', result]),
    buildError: (error, fallbackMessage) => ({
      ok: false,
      reason: 'error',
      message: error?.message || fallbackMessage,
    }),
    fallbackMessage: 'fallback',
  });

  assert.deepEqual(failed, { ok: false, reason: 'error', message: 'async exploded' });
  assert.deepEqual(seen[1], ['error', { ok: false, reason: 'error', message: 'async exploded' }]);
});
