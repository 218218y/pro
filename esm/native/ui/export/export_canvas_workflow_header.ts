import type { AppContainer } from '../../../../types';
import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_contracts.js';

export function readSketchModeForWorkflow(
  deps: Pick<ExportCanvasWorkflowDeps, 'readRuntimeScalarOrDefaultFromApp'>,
  App: AppContainer
): boolean {
  return !!deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
}

export function fillExportCanvasBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawExportHeader(
  App: AppContainer,
  deps: Pick<
    ExportCanvasWorkflowDeps,
    'getExportLogoImage' | 'drawExportLogo' | '_getProjectName' | '_reportExportError' | 'shouldFailFast'
  >,
  ctx: CanvasRenderingContext2D,
  width: number,
  opts: {
    includeLogo: boolean;
    source: string;
    logoYOffset?: number;
    titleCenterY?: number;
  }
): string {
  const projectName = deps._getProjectName(App);
  const logoImg = deps.getExportLogoImage(App, opts.includeLogo);

  if (logoImg) {
    try {
      deps.drawExportLogo(App, ctx, width, logoImg, opts.source, opts.logoYOffset);
    } catch (err) {
      deps._reportExportError(App, 'export.logoDraw', err);
      console.warn('Logo draw failed', err);
      if (deps.shouldFailFast(App)) throw err;
    }
  }

  if (projectName) {
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(projectName, width / 2, opts.titleCenterY ?? 60);
  }

  return projectName;
}
