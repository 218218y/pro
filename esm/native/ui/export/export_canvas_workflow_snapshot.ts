import type { AppContainer } from '../../../../types';

import { syncCameraControlsForExportFrame } from './export_canvas_workflow_camera_sync.js';
import { attachNotesSourceRect, readCanvasImageSourceRect } from './export_canvas_workflow_notes_rect.js';
import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';
import { drawExportHeader, fillExportCanvasBackground } from './export_canvas_workflow_shared.js';

export function createTakeSnapshotWorkflow(
  deps: ExportCanvasWorkflowDeps
): (App: AppContainer) => Promise<void> {
  const {
    _requireApp,
    hasDom,
    _getRenderCore,
    getCameraControlsOrNull,
    _applyExportWallColorOverride,
    _getRendererSize,
    _isNotesEnabled,
    _getProjectName,
    _renderAllNotesToCanvas,
    _renderSceneForExport,
    _getRendererCanvasSource,
    _reportExportError,
    _toast,
    triggerCanvasDownloadViaBrowser,
    _createDomCanvas,
  } = deps;

  return async function takeSnapshot(App: AppContainer): Promise<void> {
    App = _requireApp(App);
    if (!hasDom(App)) return;

    const renderCore = _getRenderCore(App);
    if (!renderCore) return;
    const { renderer, scene } = renderCore;

    const cameraControls = getCameraControlsOrNull(App);
    if (!cameraControls) return;
    const { camera, controls } = cameraControls;

    const restoreExportWall = _applyExportWallColorOverride(App);
    const { width, height } = _getRendererSize(renderer);
    const maxTitleHeight = 120;
    const notesEnabled = _isNotesEnabled(App);
    const projectName = _getProjectName(App);
    const filename = projectName ? `${projectName}.png` : 'wardrobe-snapshot.png';

    const createSnapshotCanvas = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const hasValidLogo = !!deps.getExportLogoImage(App, includeLogo);
      const hasText = !!projectName;
      const actualTitleHeight = hasValidLogo || hasText ? maxTitleHeight : 0;

      const canvas = _createDomCanvas(App, width, height + actualTitleHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      fillExportCanvasBackground(ctx, canvas);
      if (actualTitleHeight > 0) {
        drawExportHeader(App, deps, ctx, canvas.width, {
          includeLogo,
          source: 'export.snapshot',
          logoYOffset: hasValidLogo ? (actualTitleHeight - 90) / 2 : 0,
          titleCenterY: actualTitleHeight / 2,
        });
      }

      syncCameraControlsForExportFrame({ camera, controls });
      _renderSceneForExport(App, renderer, scene, camera);
      const rendererSource = _getRendererCanvasSource(renderer);
      const notesSourceRect = readCanvasImageSourceRect(rendererSource);
      ctx.drawImage(rendererSource, 0, actualTitleHeight);

      if (notesEnabled) {
        await _renderAllNotesToCanvas(
          App,
          ctx,
          width,
          height,
          actualTitleHeight,
          attachNotesSourceRect(
            {
              sx: 1,
              sy: 1,
              dx: 0,
              dy: 0,
            },
            notesSourceRect
          )
        );
      }

      return canvas;
    };

    const triggerDownload = (canvasToDownload: HTMLCanvasElement): void => {
      try {
        const ok = triggerCanvasDownloadViaBrowser(App, canvasToDownload, filename);
        if (!ok) throw new Error('browser snapshot download unavailable');
      } catch (err) {
        _reportExportError(App, 'takeSnapshot.triggerDownload', err, { filename });
        if (deps.shouldFailFast(App)) throw err;
      }
    };

    try {
      const finalCanvas = await createSnapshotCanvas(true);
      finalCanvas.toDataURL();
      triggerDownload(finalCanvas);
      _toast(App, 'התמונה נשמרה בהצלחה', 'success');
    } catch (err) {
      _reportExportError(App, 'takeSnapshot.logoPass', err);
      console.warn('Snapshot tainted by logo. Retrying without logo...', err);
      if (deps.shouldFailFast(App)) throw err;
      try {
        const finalCanvasWithoutLogo = await createSnapshotCanvas(false);
        triggerDownload(finalCanvasWithoutLogo);
        _toast(App, 'התמונה נשמרה בהצלחה', 'success');
      } catch (retryErr) {
        _reportExportError(App, 'takeSnapshot.retryWithoutLogo', retryErr, { fatal: true });
        console.error('Critical error saving snapshot:', retryErr);
        _toast(App, 'שגיאה בשמירת התמונה', 'error');
        if (deps.shouldFailFast(App)) throw retryErr;
      }
    } finally {
      restoreExportWall();
    }
  };
}
