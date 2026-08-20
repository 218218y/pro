import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadStructureWorkflowsSharedModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts');
  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        patchUiSoft: (...args) => stubs.calls.push(['patchUiSoft', ...args]),
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
    if (specifier === '../actions/modes_actions.js') {
      return {
        getPrimaryMode: app => {
          stubs.calls.push(['getPrimaryMode', app]);
          return stubs.primaryMode || 'none';
        },
      };
    }
    if (specifier === './structure_tab_shared.js') {
      return {
        exitStructureEditMode: args => stubs.calls.push(['exitStructureEditMode', args]),
        structureTabReportNonFatal: (...args) => stubs.calls.push(['structureTabReportNonFatal', ...args]),
      };
    }
    if (specifier === './structure_tab_meta.js') {
      return {
        createStructureTabNoBuildImmediateMeta: (meta, source) =>
          typeof meta.noBuildImmediate === 'function'
            ? meta.noBuildImmediate(source)
            : meta.noBuild({ immediate: true }, source),
        createStructureTabNoBuildNoHistoryImmediateMeta: (meta, source) =>
          typeof meta.noHistoryImmediate === 'function'
            ? meta.noBuild(meta.noHistoryImmediate(source), source)
            : meta.noBuild(meta.noHistory({ immediate: true, source }, source), source),
        createStructureTabUiOnlyImmediateMeta: (meta, source) => meta.uiOnlyImmediate(source),
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
    return undefined;
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
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

test('[structure-workflows-shared] cell-dims exit atomically closes UI with the active expected mode', () => {
  const calls = [];
  const mod = loadStructureWorkflowsSharedModule({ calls, primaryMode: 'cell_dims' });
  const app = { id: 'app' };
  const meta = { uiOnlyImmediate: source => ({ source, immediate: true, uiOnly: true }) };

  mod.exitStructureCellDimsEditMode({
    app,
    meta,
    modeId: 'cell_dims',
    source: 'react:structure:cellDims:off',
  });

  assert.equal(calls[0]?.[0], 'getPrimaryMode');
  assert.equal(calls[1]?.[0], 'exitStructureEditMode');
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.[1]?.app, app);
  assert.equal(calls[1]?.[1]?.modeId, 'cell_dims');
  assert.equal(calls[1]?.[1]?.source, 'react:structure:cellDims:off');
  assert.equal(calls[1]?.[1]?.immediate, true);
  assert.equal(
    JSON.stringify(calls[1]?.[1]?.uiPatch),
    JSON.stringify({
      cellDimsPanelOpen: false,
      cellDimsHexPanelOpen: false,
      raw: { cellDimsHexMode: false },
    })
  );
  assert.equal(
    calls.some(entry => entry[0] === 'patchUiSoft'),
    false
  );
});

test('[structure-workflows-shared] cell-dims exit still closes the disclosure after the edit mode already ended', () => {
  const calls = [];
  const mod = loadStructureWorkflowsSharedModule({ calls, primaryMode: 'none' });
  const app = { id: 'app' };
  const meta = { uiOnlyImmediate: source => ({ source, immediate: true, uiOnly: true }) };

  mod.exitStructureCellDimsEditMode({
    app,
    meta,
    modeId: 'cell_dims',
    source: 'react:structure:cellDims:off',
  });

  assert.equal(calls[0]?.[0], 'getPrimaryMode');
  assert.equal(calls[1]?.[0], 'patchUiSoft');
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.[1], app);
  assert.equal(
    JSON.stringify(calls[1]?.[2]),
    JSON.stringify({
      cellDimsPanelOpen: false,
      cellDimsHexPanelOpen: false,
      raw: { cellDimsHexMode: false },
    })
  );
  assert.equal(calls[1]?.[3]?.source, 'react:structure:cellDims:off');
  assert.equal(calls[1]?.[3]?.immediate, true);
  assert.equal(
    calls.some(entry => entry[0] === 'exitStructureEditMode'),
    false
  );
});
