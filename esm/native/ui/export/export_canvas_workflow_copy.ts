import type { AppContainer } from '../../../../types';
import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';
import { drawExportHeader, fillExportCanvasBackground } from './export_canvas_workflow_shared.js';

export function createCopyToClipboardWorkflow(
  deps: ExportCanvasWorkflowDeps
): (App: AppContainer) => Promise<void> {
  const {
    _requireApp,
    hasDom,
    getCameraOrNull,
    _getRenderCore,
    _applyExportWallColorOverride,
    _getRendererSize,
    _isNotesEnabled,
    _renderAllNotesToCanvas,
    _renderSceneForExport,
    _getRendererCanvasSource,
    _reportExportError,
    _handleCanvasExport,
    _createDomCanvas,
  } = deps;

  return async function copyToClipboard(App: AppContainer): Promise<void> {
    App = _requireApp(App);
    if (!hasDom(App)) return;

    const renderCore = _getRenderCore(App);
    if (!renderCore) return;
    const { renderer, scene } = renderCore;

    const camera = getCameraOrNull(App);
    if (!camera) return;

    const restoreExportWall = _applyExportWallColorOverride(App);
    const { width, height } = _getRendererSize(renderer);
    const titleHeight = 120;
    const notesEnabled = _isNotesEnabled(App);

    const createSingleCanvas = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const canvas = _createDomCanvas(App, width, height + titleHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      fillExportCanvasBackground(ctx, canvas);
      drawExportHeader(App, deps, ctx, canvas.width, {
        includeLogo,
        source: 'export.single',
      });

      _renderSceneForExport(App, renderer, scene, camera);
      ctx.drawImage(_getRendererCanvasSource(renderer), 0, titleHeight);

      if (notesEnabled) {
        await _renderAllNotesToCanvas(App, ctx, width, height, titleHeight, {
          sx: 1,
          sy: 1,
          dx: 0,
          dy: 0,
        });
      }

      return canvas;
    };

    try {
      const canvasWithLogo = await createSingleCanvas(true);
      canvasWithLogo.toDataURL();
      _handleCanvasExport(App, canvasWithLogo, 'wardrobe-design.png', {
        mode: 'clipboard',
      });
    } catch (err) {
      _reportExportError(App, 'copyToClipboard.logoPass', err);
      console.warn('Security Error with Logo. Retrying without logo...', err);
      if (deps.shouldFailFast(App)) throw err;
      const canvasWithoutLogo = await createSingleCanvas(false);
      _handleCanvasExport(App, canvasWithoutLogo, 'wardrobe-design.png', { mode: 'clipboard' });
    } finally {
      restoreExportWall();
    }
  };
}
