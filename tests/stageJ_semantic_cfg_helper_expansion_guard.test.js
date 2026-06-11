import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setCfgBoardMaterial,
  setCfgCustomUploadedDataURL,
  setCfgGlobalHandleType,
  setCfgLibraryMode,
  setCfgLowerModulesConfiguration,
  setCfgModulesConfiguration,
  setCfgShowDimensions,
} from '../esm/native/runtime/cfg_access.ts';
import {
  setCfgBoardMaterial as setCfgBoardMaterialFromReact,
  setCfgGlobalHandleType as setCfgGlobalHandleTypeFromReact,
  setCfgLibraryMode as setCfgLibraryModeFromReact,
  setCfgLowerModulesConfiguration as setCfgLowerModulesConfigurationFromReact,
  setCfgModulesConfiguration as setCfgModulesConfigurationFromReact,
  setCfgMultiColorMode as setCfgMultiColorModeFromReact,
  setCfgShowDimensions as setCfgShowDimensionsFromReact,
} from '../esm/native/ui/react/actions/store_actions.ts';
import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { installDomainApi } from '../esm/native/kernel/domain_api.ts';

function createStoreStub(initialConfig = {}) {
  const state = {
    ui: {},
    config: { ...initialConfig },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 0, updatedAt: 0 },
  };

  /** @type {Array<Record<string, unknown>>} */
  const calls = [];

  const applyConfig = (patch, meta) => {
    if (!patch || typeof patch !== 'object') return undefined;
    calls.push({ op: 'store.setConfig', patch, meta });
    const next = { ...state.config };
    const replace = patch.__replace && typeof patch.__replace === 'object' ? patch.__replace : {};
    for (const [key, value] of Object.entries(patch)) {
      if (key === '__replace' || key === '__snapshot') continue;
      if (value === undefined) {
        delete next[key];
        continue;
      }
      if (replace[key]) {
        next[key] = value;
        continue;
      }
      next[key] = value;
    }
    if (patch.__snapshot) {
      state.config = next;
    } else {
      state.config = next;
    }
    return patch;
  };

  return {
    state,
    calls,
    store: {
      getState() {
        return state;
      },
      patch(payload, meta) {
        if (payload && typeof payload === 'object' && payload.config && typeof payload.config === 'object') {
          applyConfig(payload.config, meta);
        }
        return payload;
      },
      setConfig: applyConfig,
      setMeta(patch, meta) {
        calls.push({ op: 'store.setMeta', patch, meta });
        Object.assign(state.meta, patch || {});
        return patch;
      },
      subscribe() {
        return () => undefined;
      },
    },
  };
}

test('[stageJ] semantic cfg access helpers prefer dedicated namespace methods and normalize scalar hotpaths', () => {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];
  const App = {
    actions: {
      config: {
        setModulesConfiguration(next, meta) {
          calls.push({ op: 'config.setModulesConfiguration', next, meta });
        },
        setLowerModulesConfiguration(next, meta) {
          calls.push({ op: 'config.setLowerModulesConfiguration', next, meta });
        },
        setScalar(key, value, meta) {
          calls.push({ op: 'config.setScalar', key, value, meta });
        },
      },
    },
    store: createStoreStub().store,
  };

  setCfgModulesConfiguration(App, [{ id: 'top-1' }], { source: 'cfg:modules' });
  setCfgLowerModulesConfiguration(App, [{ id: 'bottom-1' }], { source: 'cfg:lower' });
  setCfgBoardMaterial(App, 'oak', { source: 'cfg:boardMaterial' });
  setCfgGlobalHandleType(App, 'bar', { source: 'cfg:handleType' });
  setCfgShowDimensions(App, 0, { source: 'cfg:showDimensions' });
  setCfgLibraryMode(App, 'x', { source: 'cfg:libraryMode' });
  setCfgCustomUploadedDataURL(App, undefined, { source: 'cfg:texture' });

  assert.deepEqual(calls, [
    { op: 'config.setModulesConfiguration', next: [{ id: 'top-1' }], meta: { source: 'cfg:modules' } },
    { op: 'config.setLowerModulesConfiguration', next: [{ id: 'bottom-1' }], meta: { source: 'cfg:lower' } },
    { op: 'config.setScalar', key: 'boardMaterial', value: 'oak', meta: { source: 'cfg:boardMaterial' } },
    { op: 'config.setScalar', key: 'globalHandleType', value: 'bar', meta: { source: 'cfg:handleType' } },
    { op: 'config.setScalar', key: 'showDimensions', value: false, meta: { source: 'cfg:showDimensions' } },
    { op: 'config.setScalar', key: 'isLibraryMode', value: true, meta: { source: 'cfg:libraryMode' } },
    { op: 'config.setScalar', key: 'customUploadedDataURL', value: null, meta: { source: 'cfg:texture' } },
  ]);
});

test('[stageJ] domain api stack/textures/doors writes mutate canonical config slices without legacy write paths', () => {
  const { state, calls, store } = createStoreStub({
    modulesConfiguration: [{ width: 40 }, { width: 50 }],
    stackSplitLowerModulesConfiguration: [{ width: 25 }, { width: 35 }],
    handlesMap: { door_1: 'old' },
  });

  const App = { actions: {}, store };
  installStateApi(App);
  installDomainApi(App);

  App.actions.modules.patchAt(1, { width: 55 }, { source: 'domain:top' });
  App.actions.modules.patchLowerAt(0, { width: 30 }, { source: 'domain:bottom' });
  App.actions.doors.setGlobalHandleType('line', { source: 'domain:handleType' });
  App.actions.textures.setCustomUploadedDataURL('data:image/png;base64,abc', { source: 'domain:texture' });

  assert.deepEqual(
    state.config.modulesConfiguration.map(item => item.width),
    [40, 55]
  );
  assert.deepEqual(
    state.config.stackSplitLowerModulesConfiguration.map(item => item.width),
    [30, 35]
  );
  assert.equal(state.config.globalHandleType, 'line');
  assert.deepEqual(state.config.handlesMap, {});
  assert.equal(state.config.customUploadedDataURL, 'data:image/png;base64,abc');

  const configPatches = calls.filter(call => call.op === 'store.setConfig').map(call => call.patch);
  assert.equal(
    configPatches.some(patch => Object.prototype.hasOwnProperty.call(patch, 'modulesConfiguration')),
    true
  );
  assert.equal(
    configPatches.some(patch =>
      Object.prototype.hasOwnProperty.call(patch, 'stackSplitLowerModulesConfiguration')
    ),
    true
  );
  assert.equal(
    configPatches.some(patch => Object.prototype.hasOwnProperty.call(patch, 'globalHandleType')),
    true
  );
  assert.equal(
    configPatches.some(patch => Object.prototype.hasOwnProperty.call(patch, 'customUploadedDataURL')),
    true
  );
});

test('[stageJ] react store cfg wrappers keep named hotpaths on semantic helpers and canonical config writers', () => {
  /** @type {Array<Record<string, unknown>>} */
  const nsCalls = [];
  const nsApp = {
    actions: {
      config: {
        setModulesConfiguration(next, meta) {
          nsCalls.push({ op: 'config.setModulesConfiguration', next, meta });
        },
        setLowerModulesConfiguration(next, meta) {
          nsCalls.push({ op: 'config.setLowerModulesConfiguration', next, meta });
        },
      },
    },
    store: createStoreStub().store,
  };

  setCfgModulesConfigurationFromReact(nsApp, [{ id: 'top' }], { source: 'react:modules' });
  setCfgLowerModulesConfigurationFromReact(nsApp, [{ id: 'bottom' }], { source: 'react:lower' });

  assert.deepEqual(nsCalls, [
    { op: 'config.setModulesConfiguration', next: [{ id: 'top' }], meta: { source: 'react:modules' } },
    { op: 'config.setLowerModulesConfiguration', next: [{ id: 'bottom' }], meta: { source: 'react:lower' } },
  ]);

  const { state, store } = createStoreStub();
  const App = { actions: {}, store };

  setCfgBoardMaterialFromReact(App, 'walnut', { source: 'react:boardMaterial' });
  setCfgGlobalHandleTypeFromReact(App, 'round', { source: 'react:handleType' });
  setCfgShowDimensionsFromReact(App, 1, { source: 'react:showDimensions' });
  setCfgLibraryModeFromReact(App, 0, { source: 'react:libraryMode' });
  setCfgMultiColorModeFromReact(App, 'yes', { source: 'react:multiColor' });

  assert.deepEqual(state.config, {
    boardMaterial: 'walnut',
    globalHandleType: 'round',
    showDimensions: true,
    isLibraryMode: false,
    isMultiColorMode: true,
  });
});
