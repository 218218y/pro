import test from 'node:test';
import assert from 'node:assert/strict';

import { PRESET_MODELS_RAW } from '../esm/native/data/preset_models_data.ts';
import { materializeTopModulesConfigurationFromUiConfig } from '../esm/native/features/modules_configuration/modules_config_api.ts';
import { createProjectDataLoader } from '../esm/native/io/project_io_orchestrator_project_load.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function createLoaderHarness() {
  const calls: string[] = [];
  const state: any = {
    ui: {
      projectName: 'Before preset',
      raw: { doors: 4, width: 160, height: 240, depth: 55 },
      structureSelect: '[2,2]',
      isChestMode: false,
      cornerMode: false,
      cornerSide: 'right',
    },
    config: {},
    runtime: {},
    mode: {},
    meta: {},
  };
  const App: any = {
    actions: {
      commitProjectLoadSnapshot(snapshot: Record<string, any>) {
        calls.push('transaction');
        const before = structuredClone(state);
        state.ui = structuredClone(snapshot.ui);
        state.config = {
          ...state.config,
          ...structuredClone(snapshot.config),
          modulesConfiguration: materializeTopModulesConfigurationFromUiConfig(
            snapshot.config.modulesConfiguration,
            snapshot.ui,
            { ...state.config, ...snapshot.config }
          ),
        };
        state.runtime = { ...state.runtime, ...structuredClone(snapshot.runtime) };
        state.meta = { ...state.meta, ...structuredClone(snapshot.meta) };
        return {
          rollback() {
            Object.assign(state, structuredClone(before));
          },
        };
      },
    },
    services: {
      projectIO: { runtime: {} },
      notes: { restoreFromSave() {} },
      history: { resetBaseline() {} },
      camera: { adjustForChest() {}, adjustForCorner() {}, resetPreset() {} },
      render: { setAutoCameraBuildKey() {}, requestBuild() {} },
      lights: { update() {} },
      editModes: { resetAll() {} },
    },
    store: {
      getState() {
        return state;
      },
    },
  };

  const reports: Array<[string, unknown]> = [];
  const loader = createProjectDataLoader({
    App,
    showToast() {},
    openCustomConfirm() {},
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 123,
    reportNonFatal(op, err) {
      reports.push([op, err]);
    },
    metaRestore(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    getHistorySystem() {
      return { resetBaseline() {} } as any;
    },
    deepCloneJson(value) {
      return JSON.parse(JSON.stringify(value));
    },
    getProjectNameFromState() {
      return String(state.ui.projectName || '');
    },
    asRecord,
    log() {},
  });

  return { loader, state, calls, reports };
}

for (const presetCase of [
  {
    name: '⭐ 012 6 דלתות',
    modules: [
      { doors: 2, shoe: true },
      { doors: 2, shoe: true },
      { doors: 2, shoe: true },
    ],
  },
  {
    name: '⭐ 012 5 דלתות',
    modules: [
      { doors: 2, shoe: true },
      { doors: 1, shoe: true },
      { doors: 2, shoe: true },
    ],
  },
]) {
  test(`project preset load materializes all shoe-drawer modules on first apply for ${presetCase.name}`, () => {
    const preset = PRESET_MODELS_RAW.find((model: any) => model.name === presetCase.name);
    assert.ok(preset);

    const { loader, state, calls, reports } = createLoaderHarness();
    const result = loader(preset as never, { toast: false, meta: { source: 'model.apply' } } as any);

    assert.equal(result.ok, true);
    assert.deepEqual(reports, []);
    assert.deepEqual(calls, ['transaction']);
    assert.deepEqual(
      state.config.modulesConfiguration.map((module: any) => ({
        doors: module.doors,
        shoe: module.hasShoeDrawer,
      })),
      presetCase.modules
    );
  });
}
