import type { AppContainer } from '../../../../types';

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

    const captureNotesTransformForCurrentFrame = () => {
      const { preRef, postRef, notesTransform } = captureFrontNotesTransform(App, deps, {
        camera,
        controls,
        renderer,
        scene,
        width,
        height,
      });

      if (notesEnabled && !notesTransform) {
        deps._reportExportRecovery(
          App,
          'exportDualImage.notesTransformMissing',
          new Error('notes export transform unavailable'),
          { preRefMissing: !preRef, postRefMissing: !postRef }
        );
      }

      return notesTransform;
    };

    const createComposite = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const compositeCanvas = _createDomCanvas(App, width, height * 2 + gap + titleHeight);
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      fillExportCanvasBackground(ctx, compositeCanvas);
      drawExportHeader(App, deps, ctx, compositeCanvas.width, {
        includeLogo,
        source: 'export.composite',
      });

      const restoreOriginalCameraForPanel = () => {
        restoreViewportCameraPose(App, {
          position: { x: originalCamPos.x, y: originalCamPos.y, z: originalCamPos.z },
          target: { x: originalTarget.x, y: originalTarget.y, z: originalTarget.z },
        });
      };

      const renderPanel = async (open: boolean, imageY: number) => {
        _setDoorsOpenForExport(App, open);
        _setBodyDoorStatusForNotes(App, open);
        restoreOriginalCameraForPanel();
        const notesTransform = captureNotesTransformForCurrentFrame();
        _renderSceneForExport(App, renderer, scene, camera);
        ctx.drawImage(_getRendererCanvasSource(renderer), 0, imageY);

        if (notesEnabled) {
          await _renderAllNotesToCanvas(App, ctx, width, height, imageY, notesTransform);
        }
      };

      await renderPanel(false, titleHeight);
      await renderPanel(true, titleHeight + height + gap);

      return compositeCanvas;
    };

    try {
      const finalCanvas = await createComposite(true);
      finalCanvas.toDataURL();
      _handleCanvasExport(App, finalCanvas, 'wardrobe-design-open-closed.png', {
        mode: 'clipboard',
        clipboardFailureMode: 'none',
        toastClipboardSuccess: 'ייצוא פתוח/סגור הועתק ללוח בהצלחה!',
      });
    } catch (err) {
      deps._reportExportRecovery(App, 'exportDualImage.retryWithoutLogo', err, { pass: 'logo' });
      if (deps.shouldFailFast(App)) throw err;
      const finalCanvasWithoutLogo = await createComposite(false);
      _handleCanvasExport(App, finalCanvasWithoutLogo, 'wardrobe-design-open-closed.png', {
        mode: 'clipboard',
        clipboardFailureMode: 'none',
        toastClipboardSuccess: 'ייצוא פתוח/סגור הועתק ללוח בהצלחה!',
      });
    } finally {
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
