import type {
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
  nextProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
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
  type ProjectLoadActionResult,
} from '../runtime/project_load_action_result.js';
import {
  normalizeProjectIoUiState,
  readProjectIoUiState as readUiStateRecord,
  readProjectLoadOptsRecord as readProjectLoadOpts,
  type ProjectIoOwnerDeps,
  type ProjectPdfPatchLike,
} from './project_io_orchestrator_shared.js';
import {
  prepareProjectIoAutosaveBeforeLoad,
  refreshProjectIoAutosaveAfterLoad,
} from './project_io_orchestrator_autosave.js';
import { createProjectLoadTransactionContext } from './project_load_transaction_context.js';

function assertProjectLoadConfigReplaceOwnedBranches(cfg: UnknownRecord): UnknownRecord {
  const missing = Object.keys(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS).filter(key => {
    return !Object.prototype.hasOwnProperty.call(cfg, key) || typeof cfg[key] === 'undefined';
  });
  if (missing.length) {
    throw new Error(`project.load.config missing replace-owned config branch(es): ${missing.join(', ')}`);
  }
  return cfg;
}

export function createProjectDataLoader(deps: ProjectIoOwnerDeps) {
  const { App, showToast, reportNonFatal, metaRestore, deepCloneJson } = deps;
  const transaction = createProjectLoadTransactionContext(deps);

  return function loadProjectData(
    input: ProjectLoadInputLike,
    options?: ProjectLoadOpts
  ): ProjectLoadActionResult {
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

      prepareProjectIoAutosaveBeforeLoad({ App, preserveAutosave, reportNonFatal });
      restoreGen = nextProjectIoRestoreGeneration(App);
      stateTransaction = transaction.commit(
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

      resetAllEditModesViaService(App);

      refreshProjectIoAutosaveAfterLoad({
        App,
        restoreGen,
        isHistoryApply,
        isModelApply,
        isCloudApply,
        preserveAutosave,
        reportNonFatal,
      });

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
        updateSceneLightsViaService(App, true);
      } catch (err) {
        reportNonFatal('project.load.updateSceneLights', err);
      }

      try {
        restoreNotesFromSaveViaService(App, savedNotes);
      } catch (err) {
        reportNonFatal('project.load.restoreNotes', err);
      }

      try {
        requestBuilderForcedBuild(App, { reason: 'project.load' });
      } catch (err) {
        reportNonFatal('project.load.requestBuilderForcedBuild', err);
      }

      if (!isProjectIoRestoreGenerationCurrent(App, restoreGen)) {
        return buildProjectLoadFailureResult('superseded', { restoreGen });
      }

      if (toastEnabled) showToast(toastMessage, 'success');
      return buildProjectLoadSuccessResult({ restoreGen });
    } catch (err) {
      reportNonFatal('project.load.error', err);
      if (stateTransaction && isProjectIoRestoreGenerationCurrent(App, restoreGen)) {
        try {
          stateTransaction.rollback(metaRestore('project.load.rollback', { silent: true }));
          transaction.rollbackHistory(historySnapshot);
        } catch (rollbackErr) {
          reportNonFatal('project.load.rollback', rollbackErr);
        }
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
  };
}
