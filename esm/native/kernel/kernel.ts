// Native ESM: Kernel (stateKernel + HistorySystem + cfg surface)
// Stage: kernel native conversion

import type { AppContainer, StateKernelLike, UnknownRecord } from '../../../types';

import { getUi, getRuntime } from './store_access.js';
import { captureSavedNotesViaService } from '../runtime/notes_access.js';
import { getHistorySystem, setHistorySystem } from './history_access.js';
import { flushOrPushHistoryStateMaybe, scheduleHistoryPushMaybe } from '../runtime/history_system_access.js';
import {
  getProjectIoServiceMaybe,
  loadProjectDataResultViaServiceOrThrow,
} from '../runtime/project_io_access.js';
import {
  ensureProjectCaptureService,
  getProjectCaptureServiceMaybe,
} from '../runtime/project_capture_access.js';
import { getBrowserTimers } from '../runtime/api.js';
import { setBuildTag } from '../runtime/build_info_access.js';

import { ensureStateKernelService, getStateKernelService } from './state_kernel_service.js';
import { installKernelStateKernelConfigSurface } from './kernel_state_kernel_config.js';
import { createKernelHistorySystem, type KernelHistorySystem } from './kernel_history_system.js';
import { createKernelSnapshotStoreSystem } from './kernel_snapshot_store_system.js';
import { createKernelProjectCapture } from './kernel_project_capture.js';
import { createKernelEditStateSystem } from './kernel_edit_state_system.js';
import { asMeta, asRecord, asRecordOrNull, asString, isFn, isRecord } from './kernel_shared.js';
import { createKernelInstallSupport } from './kernel_install_support.js';

function ensureStateKernel(App: AppContainer): StateKernelLike {
  return ensureStateKernelService(App);
}

function asStateKernelRecord(v: StateKernelLike): StateKernelLike & UnknownRecord {
  return v;
}

export function installKernel(App: AppContainer | null | undefined): void {
  if (!App || typeof App !== 'object') return;
  const App0: AppContainer = App;
  const __sk = ensureStateKernel(App);

  const {
    setStoreConfigPatch,
    setStoreUiSnapshot,
    touchStore,
    cloneKernelValue,
    reportKernelError,
    reportNonFatal,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
  } = createKernelInstallSupport(App);

  const defaultBatchFlags = (): UnknownRecord => ({
    noBuild: false,
    noAutosave: false,
    noPersist: false,
    noHistory: false,
    immediate: false,
    force: false,
  });

  const batch = (__sk.__cfgBatch = __sk.__cfgBatch || {
    depth: 0,
    dirty: false,
    flags: defaultBatchFlags(),
    lastSource: '',
  });

  batch.flags = asRecord(batch.flags, defaultBatchFlags());
  batch._reset =
    batch._reset ||
    (() => {
      batch.dirty = false;
      batch.lastSource = '';
      batch.flags = defaultBatchFlags();
    });

  setBuildTag(App, 'kernel', 'step15_stage14_final_kernel_surface_cleanup');

  installKernelStateKernelConfigSurface({
    App,
    __sk: asStateKernelRecord(__sk),
    asMeta,
    asRecord,
    isRecord,
    isFn,
    cloneKernelValue,
    setStoreConfigPatch,
    asString,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
  });

  const editStateSystem = createKernelEditStateSystem({
    App,
    reportNonFatal,
  });

  __sk.captureEditState = editStateSystem.captureEditState;
  __sk.applyEditState = editStateSystem.applyEditState;

  const snapshotStore = createKernelSnapshotStoreSystem({
    App,
    stateKernel: __sk,
    asRecord,
    asRecordOrNull,
    isRecord,
    reportKernelError,
    reportNonFatal,
    setStoreUiSnapshot: (ui, meta, config) => setStoreUiSnapshot(ui, meta, config),
    touchStore: meta => touchStore(meta),
  });

  __sk.getBuildState = snapshotStore.getBuildState;
  __sk.commitFromSnapshot = snapshotStore.commitFromSnapshot;
  __sk.syncStore = snapshotStore.syncStore;
  __sk.setDirty = snapshotStore.setDirty;
  __sk.isDirty = snapshotStore.isDirty;
  __sk._markDirty = snapshotStore.markDirty;
  __sk._clearDirty = snapshotStore.clearDirty;
  __sk.touch = snapshotStore.touch;
  __sk.commit = snapshotStore.commit;
  __sk.persist = snapshotStore.persist;

  function isRestoring() {
    const runtime = asRecord(getRuntime(App0), {});
    return runtime.restoring === true;
  }

  const projectCapture = asRecord(ensureProjectCaptureService(App));
  if (typeof projectCapture.capture !== 'function') {
    projectCapture.capture = createKernelProjectCapture({
      App,
      stateKernel: __sk,
      getUiSnapshot: () => asRecord(getUi(App), {}),
      captureSavedNotes: () => captureSavedNotesViaService(App),
      reportKernelError,
    });
  }

  const HistorySystem: KernelHistorySystem = createKernelHistorySystem({
    App,
    existing: getHistorySystem(App),
    asRecord,
    isRecord,
    isRestoring,
    getTimers: () => getBrowserTimers(App),
    getProjectUndoSnapshot: () => {
      const project = getProjectCaptureServiceMaybe(App);
      if (!project || typeof project.capture !== 'function') return {};
      return project.capture('undo') || {};
    },
    captureSavedNotes: () => captureSavedNotesViaService(App),
    getCurrentUiSnapshot: () => asRecord(getUi(App), {}),
    loadProjectSnapshot: (record: UnknownRecord) => {
      try {
        loadProjectDataResultViaServiceOrThrow(
          App,
          record,
          {
            toast: false,
            meta: { source: 'history.undoRedo' },
          },
          'not-installed',
          '[WardrobePro] Undo/Redo project load failed.',
          'history.undoRedo loadProjectData'
        );
      } catch (error) {
        const projectIO = getProjectIoServiceMaybe(App);
        if (!projectIO || typeof projectIO.loadProjectData !== 'function') {
          console.warn(
            '[Undo/Redo] No project loader available (App.services.projectIO.loadProjectData / loadProjectData).'
          );
        }
        throw error;
      }
    },
    flushPendingPushViaAccess: opts => flushOrPushHistoryStateMaybe(App, opts),
    schedulePushViaAccess: meta => scheduleHistoryPushMaybe(App, meta),
    reportNonFatal,
  });

  setHistorySystem(App, HistorySystem);
  HistorySystem.init();
}

export function getStateKernel(App: unknown): UnknownRecord | null {
  return asRecordOrNull(getStateKernelService(App));
}

export function ensureKernelInstalled(App: unknown): boolean {
  const kernel = getStateKernel(App);
  return !!(kernel && isFn(kernel.captureConfig) && isFn(kernel.patchConfigMaps));
}
