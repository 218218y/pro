import path from 'node:path';

import { loadTsRuntimeModule, requireFromTsRuntimeLoader } from './_ts_runtime_module_loader.mjs';

const require = requireFromTsRuntimeLoader;

const KNOWN_PROJECT_CONFIG_MAP_KEYS = new Set([
  'groovesMap',
  'grooveLinesCountMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'roundedFrameSideShelvesMap',
  'drawerDividersMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'doorTrimMap',
]);

export function loadStructuralBuildRefreshActionsModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/actions/structural_build_refresh_actions.ts');
  const localRequire = specifier => {
    if (specifier === '../../../features/project_config/api.js') {
      return { KNOWN_PROJECT_CONFIG_MAP_KEYS };
    }
    if (specifier === '../../../services/api.js') {
      return {
        readConfigPatchDataKeys: patch => {
          const patchRec = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
          return Object.keys(patchRec).filter(
            key => key !== '__replace' && key !== '__snapshot' && key !== '__capturedAt'
          );
        },
        patchViaActions: (...args) => {
          stubs.calls?.push(['patchViaActions', ...args]);
          return typeof stubs.patchViaActions === 'function' ? stubs.patchViaActions(...args) : false;
        },
        requestBuilderStructuralRefresh: (...args) => {
          if (typeof stubs.requestBuilderStructuralRefresh === 'function') {
            return stubs.requestBuilderStructuralRefresh(...args);
          }
          stubs.calls?.push(['requestBuilderStructuralRefresh', ...args]);
          return { requestedBuild: true, triggeredRender: false, ensuredRenderLoop: false };
        },
      };
    }
    return require(specifier);
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
}
