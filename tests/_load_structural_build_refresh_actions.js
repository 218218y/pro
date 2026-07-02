import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

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
    if (specifier === '../../../features/project_config/api.js') {
      return { KNOWN_PROJECT_CONFIG_MAP_KEYS };
    }
    if (specifier === '../../../services/api.js') {
      return {
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
