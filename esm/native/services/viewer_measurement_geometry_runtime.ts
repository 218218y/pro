import type { AppContainer, UnknownRecord } from '../../../types';

import { getInternalGridMap } from '../runtime/cache_access.js';
import { getCamera } from '../runtime/render_access.js';
import { __wp_measureObjectLocalBox, __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers.js';

type ViewerMeasurementRuntimeLocalPoint = { x: number; y: number; z: number };

type ViewerMeasurementRuntimeLocalBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type ViewerMeasurementGeometryRuntime = {
  getCamera: () => unknown;
  getInternalGridMap: (isBottomStack?: boolean) => UnknownRecord;
  measureObjectLocalBox: (
    target: unknown,
    parentOverride?: unknown
  ) => ViewerMeasurementRuntimeLocalBox | null;
  projectWorldPointToLocal: (point: unknown, parent: unknown) => ViewerMeasurementRuntimeLocalPoint | null;
};

export function createViewerMeasurementGeometryRuntime(App: AppContainer): ViewerMeasurementGeometryRuntime {
  return {
    getCamera: () => getCamera(App),
    getInternalGridMap: (isBottomStack?: boolean) => getInternalGridMap(App, isBottomStack),
    measureObjectLocalBox: (target: unknown, parentOverride?: unknown) =>
      __wp_measureObjectLocalBox(App, target, parentOverride),
    projectWorldPointToLocal: (point: unknown, parent: unknown) =>
      __wp_projectWorldPointToLocal(App, point, parent),
  };
}
