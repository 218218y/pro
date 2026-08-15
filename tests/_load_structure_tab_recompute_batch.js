import path from 'node:path';

import { loadTsRuntimeModule, requireFromTsRuntimeLoader } from './_ts_runtime_module_loader.mjs';

const require = requireFromTsRuntimeLoader;

export function loadStructureTabRecomputeBatchModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/structure_tab_recompute_batch.ts');
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
          return typeof stubs.runAppStructuralModulesRecompute === 'function'
            ? stubs.runAppStructuralModulesRecompute(...args)
            : 'ok';
        },
      };
    }
    return require(specifier);
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
}
