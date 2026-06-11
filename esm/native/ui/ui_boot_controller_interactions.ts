import { installCanvasInteractions } from './interactions/canvas_interactions.js';
import { installViewerResize } from './interactions/viewer_resize.js';
import { getUiRuntime } from './runtime/ui_runtime.js';
import { handleCanvasClickNDC, handleCanvasHoverNDC } from '../services/api.js';
import type { AppContainer } from '../../../types';
import type { BootViewportContext, UiBootReporterLike } from './ui_boot_controller_shared.js';
import { createUiBootTriggerRender, installUiDisposerStrict } from './ui_boot_controller_shared.js';

export function installUiBootInteractions(
  App: AppContainer,
  ctx: BootViewportContext,
  reporter: UiBootReporterLike
): void {
  const uiRt = getUiRuntime(App);
  const triggerRender = createUiBootTriggerRender(App);

  try {
    installUiDisposerStrict(
      uiRt,
      'ui:viewerResize',
      () =>
        installViewerResize(App, {
          container: ctx.container,
          win: ctx.windowRef,
          triggerRender,
        }),
      'viewer resize'
    );
  } catch (err) {
    reporter.soft('interactions.viewerResize.install', err);
  }

  installUiDisposerStrict(
    uiRt,
    'ui:canvasInteractions',
    () =>
      installCanvasInteractions(
        App,
        {
          domEl: ctx.renderer.domElement,
          triggerRender,
          handleCanvasClickNDC,
          handleCanvasHoverNDC,
        },
        {
          notesClickFirst: true,
        }
      ),
    'canvas interactions'
  );
}
