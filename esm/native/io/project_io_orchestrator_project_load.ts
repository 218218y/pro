import type {
  AutosaveSuspensionLike,
  ProjectLoadFailFastOpts,
  ProjectLoadInputLike,
  ProjectLoadOpts,
  ProjectLoadTransactionHandleLike,
  UnknownRecord,
} from '../../../types/index.js';

import {
  buildProjectPdfUiPatch,
  buildProjectUiSnapshot,
  captureProjectLoadSourceFlags,
  captureProjectPrevUiMode,
  shouldPreserveProjectAutosaveOnLoad,
  preserveUiEphemeral,
} from './project_io_load_helpers.js';
import { requestBuilderForcedBuild } from '../runtime/builder_service_access.js';
import { restoreNotesFromSaveViaService } from '../runtime/notes_access.js';
import { resetHistoryBaselineRequiredOrThrow } from '../runtime/history_system_access.js';
import { assertCanonicalUiRawDims } from '../runtime/ui_raw_selectors.js';
import {
  buildCanonicalProjectConfigSnapshot,
  buildCanonicalProjectUiSnapshot,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS,
} from './project_load_canonical_snapshot.js';
import { setAutoCameraBuildKey } from '../runtime/render_access.js';
import {
  isProjectIoRestoreGenerationCurrent,
  nextProjectIoRestoreGeneration,
} from '../runtime/project_io_access.js';
import {
  adjustCameraForChest,
  adjustCameraForCorner,
  resetCameraPreset,
  resetAllEditModesViaService,
  updateSceneLightsViaService,
} from '../services/api.js';
import { normalizeProjectData } from './project_schema.js';
import { normalizeUnknownError } from '../runtime/error_normalization.js';
import {
  buildProjectLoadFailureResult,
  buildProjectLoadSuccessResult,
  createProjectLoadAcceptedResult,
  settleProjectLoadActionResult,
  type ProjectLoadWarning,
  type ProjectLoadActionResult,
  type ProjectLoadTerminalResult,
} from '../runtime/project_load_action_result.js';
import {
  normalizeProjectIoUiState,
  readProjectIoUiState as readUiStateRecord,
  readProjectLoadOptsRecord as readProjectLoadOpts,
  type ProjectIoOwnerDeps,
  type ProjectPdfPatchLike,
} from './project_io_orchestrator_shared.js';
import {
  refreshProjectIoAutosaveAfterLoad,
  suspendProjectIoAutosaveBeforeLoad,
} from './project_io_orchestrator_autosave.js';
import { createProjectLoadTransactionContext } from './project_load_transaction_context.js';
import {
  getProjectLoadCoordinator,
  isProjectLoadQueuedError,
  isProjectLoadSupersededError,
  type ProjectLoadCoordinatorLease,
} from './project_load_coordinator.js';

function assertProjectLoadConfigReplaceOwnedBranches(cfg: UnknownRecord): UnknownRecord {
  const missing = Object.keys(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS).filter(key => {
    return !Object.prototype.hasOwnProperty.call(cfg, key) || typeof cfg[key] === 'undefined';
  });
  if (missing.length) {
    throw new Error(`project.load.config missing replace-owned config branch(es): ${missing.join(', ')}`);
  }
  return cfg;
}

type ProjectDataLoader = {
  (
    input: ProjectLoadInputLike,
    options: ProjectLoadFailFastOpts & { queueIfBusy: false }
  ): ProjectLoadTerminalResult;
  (input: ProjectLoadInputLike, options?: ProjectLoadOpts): ProjectLoadActionResult;
};

export function createProjectDataLoader(deps: ProjectIoOwnerDeps): ProjectDataLoader {
  const { App, showToast, reportNonFatal, metaRestore, deepCloneJson } = deps;
  const transaction = createProjectLoadTransactionContext(deps);
  const coordinator = getProjectLoadCoordinator(App, {
    nextRestoreGeneration: () => nextProjectIoRestoreGeneration(App),
    isRestoreGenerationCurrent: restoreGen => isProjectIoRestoreGenerationCurrent(App, restoreGen),
  });

  function runProjectDataLoad(
    input: ProjectLoadInputLike,
    options: ProjectLoadOpts | undefined,
    coordinatorLease: ProjectLoadCoordinatorLease
  ): ProjectLoadTerminalResult {
    const data = normalizeProjectData(input);
    const opts = readProjectLoadOpts(options);
    const toastEnabled =
      opts.toast !== false && opts.silent !== true && !(opts.meta && opts.meta.silent === true);
    const toastMessage =
      typeof opts.toastMessage === 'string' && opts.toastMessage.trim()
        ? opts.toastMessage.trim()
        : 'הפרויקט נטען בהצלחה!';

    if (!data || !data.settings || typeof data.settings !== 'object') {
      if (toastEnabled) showToast('קובץ לא תקין', 'error');
      return buildProjectLoadFailureResult('invalid');
    }

    const loadSnapshot = buildProjectUiSnapshot(data, deps.getProjectNameFromState());
    const loadUiPreview = normalizeProjectIoUiState(buildCanonicalProjectUiSnapshot(loadSnapshot.uiState));
    try {
      assertCanonicalUiRawDims(loadUiPreview, 'project.load.preview');
    } catch {
      if (toastEnabled) showToast('קובץ לא תקין', 'error');
      return buildProjectLoadFailureResult('invalid');
    }

    let prevChestMode = false;
    let prevCornerMode = false;
    let prevCornerSide: 'left' | 'right' = 'right';
    try {
      const prevUiMode = captureProjectPrevUiMode(readUiStateRecord(App));
      prevChestMode = prevUiMode.prevChestMode;
      prevCornerMode = prevUiMode.prevCornerMode;
      prevCornerSide = prevUiMode.prevCornerSide;
    } catch (err) {
      reportNonFatal('loadProjectData.capturePrevUiMode', err, 6000);
      prevChestMode = false;
      prevCornerMode = false;
      prevCornerSide = 'right';
    }

    const { isHistoryApply, isModelApply, isCloudApply } = captureProjectLoadSourceFlags(opts);
    const preserveAutosave = shouldPreserveProjectAutosaveOnLoad(opts);

    let restoreGen = 0;
    let stateTransaction: ProjectLoadTransactionHandleLike | null = null;
    let historySnapshot: ReturnType<typeof transaction.captureHistory> = null;
    let autosaveSuspension: AutosaveSuspensionLike | null = null;
    const warnings: ProjectLoadWarning[] = [];

    const addWarning = (warning: ProjectLoadWarning, op: string, cause?: unknown): void => {
      warnings.push(warning);
      reportNonFatal(op, cause ?? new Error(warning.message), 6000);
    };

    const finishSupersededAfterCommit = (): ProjectLoadTerminalResult => {
      addWarning(
        {
          effect: 'post-effects-superseded',
          message: 'Project state was committed, but remaining post-load effects were skipped.',
        },
        'project.load.postEffectsSuperseded'
      );
      return buildProjectLoadSuccessResult({ restoreGen, warnings });
    };

    try {
      const cfg: UnknownRecord = assertProjectLoadConfigReplaceOwnedBranches(
        buildCanonicalProjectConfigSnapshot(data) as UnknownRecord
      );
      const metaNoBuild = metaRestore('project.load', { silent: false });
      const { uiState, savedNotes } = loadSnapshot;

      let uiSnap = normalizeProjectIoUiState(buildCanonicalProjectUiSnapshot(uiState));
      assertCanonicalUiRawDims(uiSnap, 'project.load.uiState');

      try {
        const preserved = preserveUiEphemeral(uiSnap, readUiStateRecord(App));
        uiSnap = normalizeProjectIoUiState(buildCanonicalProjectUiSnapshot(preserved));
        assertCanonicalUiRawDims(uiSnap, 'project.load.preservedUiState');
      } catch (err) {
        reportNonFatal('loadProjectData.preserveUiEphemeral', err, 6000);
      }

      try {
        const pdfPatch: ProjectPdfPatchLike = buildProjectPdfUiPatch(data, deepCloneJson);
        uiSnap = normalizeProjectIoUiState({ ...uiSnap, ...pdfPatch });
      } catch (err) {
        reportNonFatal('project.load.pdfDraft', err);
      }

      const requiresHistoryReset = !isHistoryApply && !isModelApply && !isCloudApply;
      transaction.assertReady(requiresHistoryReset);
      historySnapshot = transaction.captureHistory(requiresHistoryReset);
      restoreGen = coordinator.enterCritical(coordinatorLease, opts.queueIfBusy !== false);

      autosaveSuspension = suspendProjectIoAutosaveBeforeLoad(App);
      coordinator.assertCurrent(coordinatorLease, 'autosave suspension');
      stateTransaction = transaction.applyState(
        {
          ui: uiSnap,
          config: cfg,
          runtime: {
            sketchMode: !!uiSnap.sketchMode,
            wardrobeTypeProfiles: null,
            restoring: false,
          },
          mode: { primary: 'none', opts: {} },
          meta: { dirty: false },
        },
        metaNoBuild
      );
      coordinator.assertCurrent(coordinatorLease, 'state commit');

      if (requiresHistoryReset) {
        try {
          resetHistoryBaselineRequiredOrThrow(
            App,
            { source: 'project.load' },
            'project.load history baseline'
          );
        } catch (err) {
          reportNonFatal('project.load.resetHistoryBaseline', err);
          throw err;
        }
      }

      coordinator.assertCurrent(coordinatorLease, 'history finalize');

      transaction.markCommitted(stateTransaction);
      coordinator.markCommitted(coordinatorLease);

      try {
        autosaveSuspension.commit();
      } catch (err) {
        addWarning(
          {
            effect: 'autosave-finalize',
            message: 'Project loaded, but autosave suspension could not be finalized.',
          },
          'project.load.finalizeAutosave',
          err
        );
      }

      if (!coordinator.isCurrent(coordinatorLease)) {
        return finishSupersededAfterCommit();
      }

      if (!resetAllEditModesViaService(App)) {
        addWarning(
          { effect: 'edit-modes', message: 'Project loaded, but edit modes could not be reset.' },
          'project.load.resetEditModes'
        );
      }

      if (!coordinator.isCurrent(coordinatorLease)) {
        return finishSupersededAfterCommit();
      }

      const autosaveRefreshed = refreshProjectIoAutosaveAfterLoad({
        App,
        restoreGen,
        isHistoryApply,
        isModelApply,
        isCloudApply,
        preserveAutosave,
        reportNonFatal,
      });
      if (!autosaveRefreshed) {
        addWarning(
          {
            effect: 'autosave-refresh',
            message: 'Project loaded, but autosave refresh did not complete.',
          },
          'project.load.refreshAutosave.warning'
        );
      }

      if (!coordinator.isCurrent(coordinatorLease)) {
        return finishSupersededAfterCommit();
      }

      try {
        const nextChestMode = !!uiState.isChestMode;
        if (prevChestMode !== nextChestMode) {
          if (nextChestMode) adjustCameraForChest(App);
          else resetCameraPreset(App);
        }
      } catch (err) {
        reportNonFatal('project.load.syncChestCamera', err);
      }

      try {
        const cornerMode = !!uiState.cornerMode;
        const side: 'left' | 'right' = uiState.cornerSide === 'left' ? 'left' : 'right';
        const cornerChanged = prevCornerMode !== cornerMode || (cornerMode && prevCornerSide !== side);
        const shouldTouchCamera = !isHistoryApply || cornerChanged;

        if (shouldTouchCamera) {
          if (cornerMode) adjustCameraForCorner(App, side);
          else resetCameraPreset(App);
          try {
            setAutoCameraBuildKey(App, cornerMode ? `corner:${side}` : 'normal');
          } catch (err) {
            reportNonFatal('project.load.setAutoCameraBuildKey', err);
          }
        }
      } catch (err) {
        reportNonFatal('project.load.syncCornerCamera', err);
      }

      try {
        if (!updateSceneLightsViaService(App, true)) {
          throw new Error('Scene light refresh was rejected after project commit.');
        }
      } catch (err) {
        reportNonFatal('project.load.updateSceneLights', err);
      }

      if (!coordinator.isCurrent(coordinatorLease)) {
        return finishSupersededAfterCommit();
      }

      if (!restoreNotesFromSaveViaService(App, savedNotes)) {
        addWarning(
          { effect: 'notes', message: 'Project loaded, but saved notes could not be restored.' },
          'project.load.restoreNotes'
        );
      }

      if (!requestBuilderForcedBuild(App, { reason: 'project.load' })) {
        addWarning(
          { effect: 'build', message: 'Project loaded, but the required rebuild was not accepted.' },
          'project.load.requestBuilderForcedBuild'
        );
      }

      if (!coordinator.isCurrent(coordinatorLease)) {
        return finishSupersededAfterCommit();
      }

      if (toastEnabled) {
        try {
          showToast(toastMessage, 'success');
        } catch (toastErr) {
          reportNonFatal('project.load.successToast', toastErr);
        }
      }
      return buildProjectLoadSuccessResult({ restoreGen, warnings });
    } catch (err) {
      if (isProjectLoadQueuedError(err)) throw err;
      const superseded = isProjectLoadSupersededError(err);
      if (!superseded) reportNonFatal('project.load.error', err);
      if (stateTransaction?.state === 'prepared') {
        try {
          transaction.rollbackState(stateTransaction, metaRestore('project.load.rollback', { silent: true }));
        } catch (rollbackErr) {
          reportNonFatal('project.load.rollbackState', rollbackErr);
        }
        try {
          transaction.rollbackHistory(historySnapshot);
        } catch (rollbackErr) {
          reportNonFatal('project.load.rollbackHistory', rollbackErr);
        }
      }
      if (stateTransaction?.state !== 'committed') {
        try {
          autosaveSuspension?.resume();
        } catch (resumeErr) {
          reportNonFatal('project.load.resumeAutosave', resumeErr);
        }
      }
      if (superseded) {
        return buildProjectLoadFailureResult('superseded', {
          restoreGen: restoreGen || err.restoreGen,
        });
      }
      if (toastEnabled) {
        try {
          showToast('שגיאה בטעינת הנתונים', 'error');
        } catch (toastErr) {
          reportNonFatal('project.load.errorToast', toastErr);
        }
      }
      return buildProjectLoadFailureResult('error', {
        restoreGen,
        message: normalizeUnknownError(err, 'שגיאה בטעינת הנתונים').message,
      });
    }
  }

  function loadProjectData(input: ProjectLoadInputLike, options?: ProjectLoadOpts): ProjectLoadActionResult {
    const requestedAt = Date.now();
    const coordinatorLease = coordinator.begin();
    try {
      try {
        return runProjectDataLoad(input, options, coordinatorLease);
      } catch (error) {
        if (!isProjectLoadQueuedError(error)) throw error;
        if (options?.queueIfBusy === false) return buildProjectLoadFailureResult('busy');
        const queuedInput = deepCloneJson(input);
        const queuedOptions = typeof options === 'undefined' ? undefined : deepCloneJson(options);
        let settleQueued!: (result: ProjectLoadTerminalResult) => void;
        const settled = new Promise<ProjectLoadTerminalResult>(resolve => {
          settleQueued = resolve;
        });
        const settleQueuedFailure = (retryError: unknown): void => {
          reportNonFatal('project.load.queuedRetry', retryError, 6000);
          settleQueued(
            buildProjectLoadFailureResult('error', {
              message: normalizeUnknownError(retryError, '[WardrobePro] Queued project load failed.').message,
            })
          );
        };
        coordinator.enqueueRetry(
          coordinatorLease,
          () => {
            try {
              const result = loadProjectData(queuedInput, queuedOptions);
              void settleProjectLoadActionResult(result).then(settleQueued, settleQueuedFailure);
            } catch (retryError) {
              settleQueuedFailure(retryError);
            }
          },
          settleQueuedFailure
        );
        return createProjectLoadAcceptedResult(settled, Date.now(), requestedAt);
      }
    } finally {
      coordinator.finish(coordinatorLease);
    }
  }

  return loadProjectData as ProjectDataLoader;
}
