import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export function loadStructureTabRecomputeBatchModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/structure_tab_recompute_batch.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        getUiSnapshot: app => {
          stubs.calls?.push(['getUiSnapshot', app]);
          return stubs.uiSnapshot || {};
        },
        runHistoryBatch: (app, fn, meta) => {
          stubs.calls?.push(['runHistoryBatch', app, meta]);
          fn();
        },
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        createStructuralModulesRecomputeOpts: () => ({
          structureChanged: true,
          preserveTemplate: true,
          anchorSide: 'left',
        }),
        patchViaActions: (...args) => {
          stubs.calls?.push(['patchViaActions', ...args]);
          return typeof stubs.patchViaActions === 'function' ? stubs.patchViaActions(...args) : false;
        },
        runAppStructuralModulesRecompute: (...args) => {
          stubs.calls?.push(['runAppStructuralModulesRecompute', ...args]);
          return 'ok';
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
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}
