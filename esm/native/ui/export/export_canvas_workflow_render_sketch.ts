import type { AppContainer } from '../../../../types';

import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';
import {
  captureFrontNotesTransform,
  drawExportHeader,
  fillExportCanvasBackground,
  readSketchModeForWorkflow,
} from './export_canvas_workflow_shared.js';

export function createExportRenderAndSketchWorkflow(
  deps: ExportCanvasWorkflowDeps
): (App: AppContainer) => Promise<void> {
  const {
    _requireApp,
    hasDom,
    _getRenderCore,
    _getRendererSize,
    getCameraControlsOrNull,
    _applyExportWallColorOverride,
    _isNotesEnabled,
    _renderAllNotesToCanvas,
    _renderSceneForExport,
    _getRendererCanvasSource,
    _reportExportError,
    _createDomCanvas,
    _handleCanvasExport,
    restoreViewportCameraPose,
    applyViewportSketchMode,
  } = deps;

  return async function exportRenderAndSketch(App: AppContainer): Promise<void> {
    App = _requireApp(App);
    if (!hasDom(App)) return;

    const renderCore = _getRenderCore(App);
    if (!renderCore) return;
    const { renderer, scene } = renderCore;

    const { width, height } = _getRendererSize(renderer);
    const cameraControls = getCameraControlsOrNull(App);
    if (!cameraControls) return;
    const { camera, controls } = cameraControls;

    const restoreExportWall = _applyExportWallColorOverride(App);
    const originalCamPos = camera.position.clone();
    const originalTarget = controls.target.clone();
    const originalSketchMode = readSketchModeForWorkflow(deps, App);
    const notesEnabled = _isNotesEnabled(App);
    const titleHeight = 120;
    const gap = 20;

    const restoreExportState = () => {
      const desiredSketchMode = !!originalSketchMode;
      const currentSketchMode = readSketchModeForWorkflow(deps, App);
      if (currentSketchMode !== desiredSketchMode) {
        applyViewportSketchMode(App, desiredSketchMode, {
          source: 'export',
          rebuild: true,
          updateShadows: false,
          reason: 'export:restoreRenderAndSketch',
        });
      }

      restoreViewportCameraPose(App, {
        position: { x: originalCamPos.x, y: originalCamPos.y, z: originalCamPos.z },
        target: { x: originalTarget.x, y: originalTarget.y, z: originalTarget.z },
      });
      _renderSceneForExport(App, renderer, scene, camera);
    };

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
        try {
          console.warn('[WardrobePro][export] notes transform missing (render/sketch export)', {
            preRef,
            postRef,
          });
        } catch (err) {
          deps._exportReportThrottled(App, 'copyToClipboard.notesTransform.warn', err, {
            throttleMs: 1000,
          });
        }
      }

      return notesTransform;
    };

    const setSketchModeForExport = (next: boolean, reason: string) => {
      if (readSketchModeForWorkflow(deps, App) === next) return;
      applyViewportSketchMode(App, next, {
        source: 'export',
        rebuild: true,
        updateShadows: false,
        reason,
      });
    };

    const runExport = async () => {
      const createComposite = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
        const compositeCanvas = _createDomCanvas(App, width, height * 2 + gap + titleHeight);
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

        fillExportCanvasBackground(ctx, compositeCanvas);
        drawExportHeader(App, deps, ctx, compositeCanvas.width, {
          includeLogo,
          source: 'export.renderAndSketch',
        });

        const restoreOriginalCameraForPanel = () => {
          restoreViewportCameraPose(App, {
            position: { x: originalCamPos.x, y: originalCamPos.y, z: originalCamPos.z },
            target: { x: originalTarget.x, y: originalTarget.y, z: originalTarget.z },
          });
        };

        const renderPanel = async (sketchMode: boolean, imageY: number, reason: string) => {
          setSketchModeForExport(sketchMode, reason);
          restoreOriginalCameraForPanel();
          const notesTransform = captureNotesTransformForCurrentFrame();
          _renderSceneForExport(App, renderer, scene, camera);
          ctx.drawImage(_getRendererCanvasSource(renderer), 0, imageY);

          if (notesEnabled) {
            await _renderAllNotesToCanvas(App, ctx, width, height, imageY, notesTransform);
          }
        };

        await renderPanel(false, titleHeight, 'export:renderMode');
        await renderPanel(true, titleHeight + height + gap, 'export:sketchMode');

        return compositeCanvas;
      };

      try {
        const finalCanvas = await createComposite(true);
        finalCanvas.toDataURL();
        _handleCanvasExport(App, finalCanvas, 'wardrobe-render-sketch.png', {
          mode: 'clipboard',
          clipboardFailureMode: 'none',
          toastClipboardSuccess: 'ייצוא סקיצה/הדמיה הועתק ללוח בהצלחה!',
        });
      } catch (err) {
        _reportExportError(App, 'exportRenderAndSketch.logoPass', err);
        console.warn('Export tainted by logo, retrying without logo...', err);
        if (deps.shouldFailFast(App)) throw err;
        const finalCanvasWithoutLogo = await createComposite(false);
        _handleCanvasExport(App, finalCanvasWithoutLogo, 'wardrobe-render-sketch.png', {
          mode: 'clipboard',
          clipboardFailureMode: 'none',
          toastClipboardSuccess: 'ייצוא סקיצה/הדמיה הועתק ללוח בהצלחה!',
        });
      }
    };

    try {
      await runExport();
    } finally {
      restoreExportState();
      restoreExportWall();
    }
  };
}
