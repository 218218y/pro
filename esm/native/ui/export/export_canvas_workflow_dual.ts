import type { AppContainer } from '../../../../types';

import {
  clearNotesExportTransform,
  getNotesExportTransform,
  setNotesExportTransform,
} from '../../services/api.js';
import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';
import {
  captureFrontNotesTransform,
  drawExportHeader,
  fillExportCanvasBackground,
} from './export_canvas_workflow_shared.js';

export function createExportDualImageWorkflow(
  deps: ExportCanvasWorkflowDeps
): (App: AppContainer) => Promise<void> {
  const {
    _requireApp,
    hasDom,
    getDoorsOpen,
    setDoorsOpen,
    getCameraControlsOrNull,
    _getRenderCore,
    _applyExportWallColorOverride,
    _getRendererSize,
    _isNotesEnabled,
    _renderAllNotesToCanvas,
    _renderSceneForExport,
    _getRendererCanvasSource,
    _reportExportError,
    _createDomCanvas,
    _handleCanvasExport,
    _setDoorsOpenForExport,
    _setBodyDoorStatusForNotes,
    restoreViewportCameraPose,
  } = deps;

  return async function exportDualImage(App: AppContainer): Promise<void> {
    App = _requireApp(App);
    if (!hasDom(App)) return;

    const doorsGetOpen = () => !!getDoorsOpen(App);
    const doorsSetOpen = (open: boolean) => setDoorsOpen(App, open, { source: 'export' });

    const cameraControls = getCameraControlsOrNull(App);
    if (!cameraControls) return;
    const { camera, controls } = cameraControls;

    const originalOpenState = doorsGetOpen();
    const originalCamPos = camera.position.clone();
    const originalTarget = controls.target.clone();

    const renderCore = _getRenderCore(App);
    if (!renderCore) return;
    const { renderer, scene } = renderCore;

    const restoreExportWall = _applyExportWallColorOverride(App);
    const { width, height } = _getRendererSize(renderer);
    const notesEnabled = _isNotesEnabled(App);
    const titleHeight = 120;
    const gap = 20;

    const { preRef, postRef, notesTransform } = captureFrontNotesTransform(App, deps, {
      camera,
      controls,
      renderer,
      scene,
      width,
      height,
    });
    setNotesExportTransform(App, notesTransform);

    if (notesEnabled && !getNotesExportTransform(App)) {
      try {
        console.warn('[WardrobePro][export] notes transform missing (open/closed export)', {
          preRef,
          postRef,
        });
      } catch (err) {
        deps._exportReportThrottled(App, 'export.notesTransformMissing.warn', err, { throttleMs: 5000 });
      }
    }

    const createComposite = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const compositeCanvas = _createDomCanvas(App, width, height * 2 + gap + titleHeight);
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      fillExportCanvasBackground(ctx, compositeCanvas);
      drawExportHeader(App, deps, ctx, compositeCanvas.width, {
        includeLogo,
        source: 'export.composite',
      });

      _setDoorsOpenForExport(App, false);
      _setBodyDoorStatusForNotes(App, false);
      _renderSceneForExport(App, renderer, scene, camera);
      ctx.drawImage(_getRendererCanvasSource(renderer), 0, titleHeight);

      if (notesEnabled) {
        await _renderAllNotesToCanvas(App, ctx, width, height, titleHeight, getNotesExportTransform(App));
      }

      _setDoorsOpenForExport(App, true);
      _setBodyDoorStatusForNotes(App, true);
      _renderSceneForExport(App, renderer, scene, camera);
      const secondImageY = titleHeight + height + gap;
      ctx.drawImage(_getRendererCanvasSource(renderer), 0, secondImageY);

      if (notesEnabled) {
        await _renderAllNotesToCanvas(App, ctx, width, height, secondImageY, getNotesExportTransform(App));
      }

      return compositeCanvas;
    };

    try {
      const finalCanvas = await createComposite(true);
      finalCanvas.toDataURL();
      _handleCanvasExport(App, finalCanvas, 'wardrobe-design-open-closed.png', {
        mode: 'clipboard',
        fallback: 'none',
        toastClipboardSuccess: 'ייצוא פתוח/סגור הועתק ללוח בהצלחה!',
      });
    } catch (err) {
      _reportExportError(App, 'exportDualImage.logoPass', err);
      console.warn('Export tainted by logo, retrying without logo...', err);
      if (deps.shouldFailFast(App)) throw err;
      const finalCanvasWithoutLogo = await createComposite(false);
      _handleCanvasExport(App, finalCanvasWithoutLogo, 'wardrobe-design-open-closed.png', {
        mode: 'clipboard',
        fallback: 'none',
        toastClipboardSuccess: 'ייצוא פתוח/סגור הועתק ללוח בהצלחה!',
      });
    } finally {
      clearNotesExportTransform(App);
      _setBodyDoorStatusForNotes(App, originalOpenState);
      doorsSetOpen(originalOpenState);
      restoreViewportCameraPose(App, {
        position: { x: originalCamPos.x, y: originalCamPos.y, z: originalCamPos.z },
        target: { x: originalTarget.x, y: originalTarget.y, z: originalTarget.z },
      });
      _setDoorsOpenForExport(App, doorsGetOpen());
      restoreExportWall();
    }
  };
}
