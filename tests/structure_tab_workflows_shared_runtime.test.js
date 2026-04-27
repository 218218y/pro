import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadStructureWorkflowsSharedModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts');
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
        setCfgModulesConfiguration: (...args) => stubs.calls.push(['setCfgModulesConfiguration', ...args]),
        setUiCellDimsDepth: (...args) => stubs.calls.push(['setUiCellDimsDepth', ...args]),
        setUiCellDimsHeight: (...args) => stubs.calls.push(['setUiCellDimsHeight', ...args]),
        setUiCellDimsWidth: (...args) => stubs.calls.push(['setUiCellDimsWidth', ...args]),
        setUiWidth: (...args) => stubs.calls.push(['setUiWidth', ...args]),
      };
    }
    if (specifier === './structure_tab_core.js') {
      return {
        applyStructureTemplateRecomputeBatch: args => {
          stubs.calls.push(['applyStructureTemplateRecomputeBatch', args]);
          if (typeof stubs.applyStructureTemplateRecomputeBatch === 'function') {
            return stubs.applyStructureTemplateRecomputeBatch(args);
          }
          if (typeof args.mutate === 'function') args.mutate();
        },
      };
    }
    if (specifier === '../actions/room_actions.js') {
      return {
        setManualWidth: (...args) => stubs.calls.push(['setManualWidth', ...args]),
      };
    }
    if (specifier === '../../store_access.js') {
      return {
        getCfg: app => {
          stubs.calls.push(['getCfg', app]);
          return stubs.cfg || { modulesConfiguration: [{ id: 'm1' }] };
        },
      };
    }
    if (specifier === './structure_tab_shared.js') {
      return {
        structureTabReportNonFatal: (...args) => stubs.calls.push(['structureTabReportNonFatal', ...args]),
      };
    }
    if (specifier === '../../../features/modules_configuration/modules_config_api.js') {
      return {
        readModulesConfigurationListFromConfigSnapshot: cfg => {
          stubs.calls.push(['readModulesConfigurationListFromConfigSnapshot', cfg]);
          return Array.isArray(cfg?.modulesConfiguration) ? cfg.modulesConfiguration : [];
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

test('[structure-workflows-shared] modules configuration and auto width collapse to canonical structural recompute batches', () => {
  const calls = [];
  const mod = loadStructureWorkflowsSharedModule({
    calls,
    cfg: { modulesConfiguration: [{ id: 'm1' }, { id: 'm2' }] },
  });
  const meta = {
    noBuildImmediate: source => ({ source, immediate: true, noBuild: true }),
    noBuild: (metaIn = {}, source) => ({ ...metaIn, source: source || metaIn.source, noBuild: true }),
    noHistoryImmediate: source => ({ source, immediate: true, noHistory: true }),
    noHistory: (metaIn = {}, source) => ({ ...metaIn, source: source || metaIn.source, noHistory: true }),
    uiOnlyImmediate: source => ({ source, immediate: true, uiOnly: true }),
    srcImmediate: source => ({ source, immediate: true }),
  };
  const app = { id: 'app' };
  const ops = mod.createStructureWorkflowOps(app, meta);

  assert.deepEqual(ops.getModulesConfiguration(), [{ id: 'm1' }, { id: 'm2' }]);
  ops.commitModulesConfiguration([{ id: 'mx' }], 'react:cellDims:resetAll');
  ops.setAutoWidth(240);

  const commitCall = calls.find(
    entry =>
      entry[0] === 'applyStructureTemplateRecomputeBatch' && entry[1].source === 'react:cellDims:resetAll'
  );
  assert.equal(
    JSON.stringify(commitCall?.[1].statePatch),
    JSON.stringify({ config: { modulesConfiguration: [{ id: 'mx' }] } })
  );
  assert.equal(commitCall?.[1].meta.noBuild, true);
  assert.equal(commitCall?.[1].meta.immediate, true);

  const autoWidthCall = calls.find(
    entry =>
      entry[0] === 'applyStructureTemplateRecomputeBatch' && entry[1].source === 'react:structure:width:auto'
  );
  assert.equal(JSON.stringify(autoWidthCall?.[1].uiPatch), JSON.stringify({ raw: { width: 240 } }));
  assert.equal(
    JSON.stringify(autoWidthCall?.[1].statePatch),
    JSON.stringify({ config: { isManualWidth: false }, ui: { raw: { width: 240 } } })
  );
  assert.equal(autoWidthCall?.[1].meta.noBuild, true);
  assert.equal(autoWidthCall?.[1].meta.noHistory, true);
  assert.equal(autoWidthCall?.[1].meta.immediate, true);
});
