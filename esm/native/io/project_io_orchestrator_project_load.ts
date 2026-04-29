import type { ProjectLoadInputLike, ProjectLoadOpts, UnknownRecord } from '../../../types/index.js';

import {
  buildProjectPdfUiPatch,
  buildProjectUiSnapshot,
  captureProjectLoadSourceFlags,
  captureProjectPrevUiMode,
  preserveUiEphemeral,
} from './project_io_load_helpers.js';
import { requestBuilderForcedBuild } from '../runtime/builder_service_access.js';
import { cfgPatchWithReplaceKeys } from '../runtime/cfg_access.js';
import { restoreNotesFromSaveViaService } from '../runtime/notes_access.js';
import { resetHistoryBaselineRequiredOrThrow } from '../runtime/history_system_access.js';
import {
  applyProjectConfigSnapshotViaActionsOrThrow,
  commitUiSnapshotViaActionsOrThrow,
  patchViaActions,
  setDirtyViaActionsOrThrow,
} from '../runtime/actions_access_mutations.js';
import { assertCanonicalUiRawDims } from '../runtime/ui_raw_selectors.js';
import {
  buildCanonicalProjectConfigSnapshot,
  buildCanonicalProjectUiSnapshot,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS,
} from './project_migrations/index.js';
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
  setRuntimeSketchMode,
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
  cancelProjectIoAutosavePending,
  refreshProjectIoAutosaveAfterLoad,
} from './project_io_orchestrator_autosave.js';

function buildProjectLoadCommittedUiSnapshot(uiSnap: UnknownRecord): UnknownRecord {
  return {
    ...uiSnap,
    __snapshot: true,
    __capturedAt: Date.now(),
  };
}

function buildProjectLoadCanonicalPatch(
  cfg: UnknownRecord,
  committedUiSnap: UnknownRecord,
  restoring = false
): UnknownRecord {
  return {
    // Project loads must replace snapshot-owned config branches so empty maps/lists clear stale state.
    config: cfgPatchWithReplaceKeys({ ...cfg }, PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS),
    ui: { ...committedUiSnap },
    runtime: {
      sketchMode: !!committedUiSnap.sketchMode,
      restoring: !!restoring,
    },
    meta: { dirty: false },
  };
}

export function createProjectDataLoader(deps: ProjectIoOwnerDeps) {
  const { App, showToast, reportNonFatal, metaRestore, metaUiOnly, setProjectIoRestoring, deepCloneJson } =
    deps;

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

    let restoreGen = 0;

    try {
      if (data && typeof data.__migratedFrom !== 'undefined') {
        deps.log(
          '[ProjectIO] loaded with migrations from v' + data.__migratedFrom + ' -> v' + deps.schemaVersion
        );
      }
    } catch (err) {
      reportNonFatal('project.load.migrationLog', err);
    }

    try {
      setProjectIoRestoring(true, metaRestore('project.load', { silent: false }));
    } catch (err) {
      reportNonFatal('project.load.setRestoring.true', err);
    }

    cancelProjectIoAutosavePending(App, reportNonFatal);

    restoreGen = nextProjectIoRestoreGeneration(App);

    try {
      const cfg: UnknownRecord = buildCanonicalProjectConfigSnapshot(data) as UnknownRecord;
      const metaNoBuild = metaRestore('project.load', { silent: false });

      const { uiState, savedNotes } = loadSnapshot;
      const { isHistoryApply, isModelApply, isCloudApply } = captureProjectLoadSourceFlags(opts);

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

      let committedUiSnap: UnknownRecord | null = null;
      try {
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

        committedUiSnap = buildProjectLoadCommittedUiSnapshot(uiSnap);
        const committedPatch = buildProjectLoadCanonicalPatch(cfg, committedUiSnap, false);
        if (!patchViaActions(App, committedPatch, metaNoBuild)) {
          applyProjectConfigSnapshotViaActionsOrThrow(App, cfg, metaNoBuild, 'project.load config apply');
          commitUiSnapshotViaActionsOrThrow(App, uiSnap, metaNoBuild, 'project.load UI snapshot commit');

          try {
            setRuntimeSketchMode(
              App,
              !!committedUiSnap.sketchMode,
              metaRestore('project.load:sketchMode', { silent: false })
            );
          } catch (err) {
            reportNonFatal('project.load.syncSketchMode', err);
            throw err;
          }

          try {
            setDirtyViaActionsOrThrow(
              App,
              false,
              metaUiOnly('project.load', { silent: true }),
              'project.load dirty clear'
            );
          } catch (err) {
            reportNonFatal('project.load.clearDirty', err);
            throw err;
          }

          try {
            setProjectIoRestoring(false, metaRestore('project.load', { silent: true }));
          } catch (err) {
            reportNonFatal('project.load.setRestoring.false', err);
          }
        }
      } catch (err) {
        reportNonFatal('project.load.commitUiSnapshot', err);
        throw err;
      }

      resetAllEditModesViaService(App);

      refreshProjectIoAutosaveAfterLoad({
        App,
        restoreGen,
        isHistoryApply,
        isModelApply,
        isCloudApply,
        reportNonFatal,
      });

      if (!isHistoryApply && !isModelApply && !isCloudApply) {
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
      console.error('Load failed:', err);
      if (toastEnabled) {
        try {
          showToast('שגיאה בטעינת הנתונים', 'error');
        } catch (toastErr) {
          reportNonFatal('project.load.errorToast', toastErr);
        }
      }
      try {
        setProjectIoRestoring(false, metaRestore('project.load', { silent: true }));
      } catch (resetErr) {
        reportNonFatal('project.load.setRestoring.errorReset', resetErr);
      }
      return buildProjectLoadFailureResult('error', {
        restoreGen,
        message: normalizeUnknownError(err, 'שגיאה בטעינת הנתונים').message,
      });
    }
  };
}
