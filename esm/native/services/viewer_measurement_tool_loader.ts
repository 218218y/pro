type ViewerMeasurementTool = typeof import('./viewer_measurement_tool.js');

export const VIEWER_MEASUREMENT_MODE_ID = 'measure';

let loadedTool: ViewerMeasurementTool | null = null;
let toolLoad: Promise<ViewerMeasurementTool> | null = null;

export function getViewerMeasurementTool(): ViewerMeasurementTool | null {
  return loadedTool;
}

export function requireViewerMeasurementTool(): ViewerMeasurementTool {
  if (loadedTool) return loadedTool;
  throw new Error('[WardrobePro] Viewer measurement mode was activated before its tool was loaded.');
}

export function loadViewerMeasurementTool(): Promise<ViewerMeasurementTool> {
  toolLoad ??= import('./viewer_measurement_tool.js').then(
    tool => {
      loadedTool = tool;
      return tool;
    },
    error => {
      toolLoad = null;
      throw error;
    }
  );
  return toolLoad;
}
