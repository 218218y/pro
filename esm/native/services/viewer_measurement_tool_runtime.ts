import type { AppContainer, BuilderDimensionLineFn, Object3DLike, UnknownRecord } from '../../../types';

import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getDocumentMaybe } from '../runtime/dom_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { getWardrobeGroup, readRenderCacheValue, writeRenderCacheValue } from '../runtime/render_access.js';
import { getUiFeedbackServiceMaybe } from '../runtime/service_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import { reportServiceNonFatal } from './service_error_observability.js';
import {
  createViewerMeasurementGeometryRuntime,
  type ViewerMeasurementGeometryRuntime,
} from './viewer_measurement_geometry_runtime.js';
import type {
  MeasurementOverlayState,
  OverlayThree,
  ViewerMeasurementToolMode,
} from './viewer_measurement_tool_contracts.js';

const VIEWER_MEASUREMENT_CACHE_KEY = '__wpViewerMeasurementOverlay';
const VIEWER_MEASUREMENT_HOVER_CACHE_KEY = '__wpViewerMeasurementHoverOverlay';
const VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY = '__wpViewerMeasurementToolMode';

export type ViewerMeasurementOverlaySlot = 'committed' | 'hover';

export type ViewerMeasurementStateRuntime = {
  readOverlay: (slot: ViewerMeasurementOverlaySlot) => MeasurementOverlayState | null;
  writeOverlay: (slot: ViewerMeasurementOverlaySlot, state: MeasurementOverlayState | null) => void;
  readToolMode: () => ViewerMeasurementToolMode;
  writeToolMode: (mode: ViewerMeasurementToolMode) => void;
};

export type ViewerMeasurementRenderRuntime = {
  readThree: () => OverlayThree | null;
  readWardrobeGroup: () => Object3DLike | null;
  readAddDimensionLine: () => BuilderDimensionLineFn | null;
  touch: () => void;
};

export type ViewerMeasurementUiRuntime = {
  writeCursor: (cursor: string) => void;
  clearModeChrome: () => void;
  showPointDraftHint: () => void;
  exitPrimaryMode: () => void;
};

export type ViewerMeasurementDiagnosticsRuntime = {
  reportNonFatal: (op: string, error: unknown) => void;
  reportPickingIssue: (error: unknown, op: string, throttleMs?: number) => void;
};

export type ViewerMeasurementFeatureRuntime = {
  geometry: ViewerMeasurementGeometryRuntime;
  state: ViewerMeasurementStateRuntime;
  render: ViewerMeasurementRenderRuntime;
  ui: ViewerMeasurementUiRuntime;
  diagnostics: ViewerMeasurementDiagnosticsRuntime;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function reportViewerMeasurementNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(App, error, { where: 'viewerMeasurement', op }, { consoleOutput: false });
}

function readOverlayThree(App: AppContainer): OverlayThree | null {
  const THREE = getThreeMaybe(App);
  if (
    !THREE ||
    typeof THREE.BufferGeometry !== 'function' ||
    typeof THREE.LineBasicMaterial !== 'function' ||
    typeof THREE.Line !== 'function' ||
    typeof THREE.Vector3 !== 'function'
  ) {
    return null;
  }
  return THREE as OverlayThree;
}

function readAddDimensionLine(App: AppContainer): BuilderDimensionLineFn | null {
  try {
    const renderOps = getBuilderRenderOps(App) as UnknownRecord | null;
    const fn = renderOps && renderOps.addDimensionLine;
    return typeof fn === 'function' ? (fn as BuilderDimensionLineFn) : null;
  } catch (error) {
    reportViewerMeasurementNonFatal(App, 'readDimensionLineBuilder', error);
    return null;
  }
}

function writeMeasurementCursor(App: AppContainer, cursor: string): void {
  try {
    const doc = getDocumentMaybe(App) as (Document & { querySelectorAll?: unknown }) | null;
    if (doc?.body?.style) doc.body.style.cursor = cursor === 'default' ? 'default' : cursor;
    const querySelectorAll = isRecord(doc) ? doc.querySelectorAll : null;
    if (typeof querySelectorAll !== 'function') return;
    const canvases = Reflect.apply(querySelectorAll, doc, ['canvas']);
    const listLike = canvases && typeof canvases === 'object' ? (canvases as { length?: unknown }) : null;
    const length = typeof listLike?.length === 'number' ? listLike.length : 0;
    for (let i = 0; i < length; i += 1) {
      const canvas = (canvases as { [index: number]: unknown })[i];
      if (isRecord(canvas) && isRecord(canvas.style)) {
        canvas.style.cursor = cursor === 'default' ? '' : cursor;
      }
    }
  } catch {
    // Cursor is only a precision aid; measurement geometry still works without DOM access.
  }
}

function clearMeasurementModeChrome(App: AppContainer): void {
  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(null, false);
  } catch {
    // UI feedback cleanup is optional; cursor cleanup still runs below.
  }
  writeMeasurementCursor(App, 'default');
}

function showPointDraftHint(App: AppContainer): void {
  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(
      'מצב מדידה מדוייק: לחץ נקודה שנייה; קרוב לאופקי/אנכי יינעל בירוק',
      true
    );
  } catch {
    // The visual overlay is sufficient in partial hosts without feedback UI.
  }
}

function exitViewerMeasurementPrimaryMode(App: AppContainer): void {
  try {
    setModePrimary(
      App,
      'none',
      {},
      {
        source: 'viewerMeasurement:emptyClick',
        noBuild: true,
        noHistory: true,
        noAutosave: true,
        noPersist: true,
        noCapture: true,
        immediate: true,
      }
    );
  } catch (error) {
    reportViewerMeasurementNonFatal(App, 'exitPrimaryMode', error);
  }
}

function touchRender(App: AppContainer): void {
  try {
    runPlatformActivityRenderTouch(App, {
      updateShadows: false,
      ensureRenderLoopAfterTrigger: true,
    });
  } catch (error) {
    reportViewerMeasurementNonFatal(App, 'renderWakeup', error);
  }
}

function readOverlayState(
  App: AppContainer,
  slot: ViewerMeasurementOverlaySlot
): MeasurementOverlayState | null {
  const key = slot === 'hover' ? VIEWER_MEASUREMENT_HOVER_CACHE_KEY : VIEWER_MEASUREMENT_CACHE_KEY;
  const state = readRenderCacheValue<MeasurementOverlayState>(App, key);
  return state && Array.isArray(state.objects) ? state : null;
}

function writeOverlayState(
  App: AppContainer,
  slot: ViewerMeasurementOverlaySlot,
  state: MeasurementOverlayState | null
): void {
  const key = slot === 'hover' ? VIEWER_MEASUREMENT_HOVER_CACHE_KEY : VIEWER_MEASUREMENT_CACHE_KEY;
  writeRenderCacheValue(App, key, state);
}

export function createViewerMeasurementFeatureRuntime(App: AppContainer): ViewerMeasurementFeatureRuntime {
  return {
    geometry: createViewerMeasurementGeometryRuntime(App),
    state: {
      readOverlay: slot => readOverlayState(App, slot),
      writeOverlay: (slot, state) => writeOverlayState(App, slot, state),
      readToolMode: () => {
        const raw = readRenderCacheValue<unknown>(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY);
        return raw === 'points' ? 'points' : 'part';
      },
      writeToolMode: mode => {
        writeRenderCacheValue(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY, mode);
      },
    },
    render: {
      readThree: () => readOverlayThree(App),
      readWardrobeGroup: () => getWardrobeGroup(App),
      readAddDimensionLine: () => readAddDimensionLine(App),
      touch: () => touchRender(App),
    },
    ui: {
      writeCursor: cursor => writeMeasurementCursor(App, cursor),
      clearModeChrome: () => clearMeasurementModeChrome(App),
      showPointDraftHint: () => showPointDraftHint(App),
      exitPrimaryMode: () => exitViewerMeasurementPrimaryMode(App),
    },
    diagnostics: {
      reportNonFatal: (op, error) => reportViewerMeasurementNonFatal(App, op, error),
      reportPickingIssue: (error, op, throttleMs = 1000) =>
        __wp_reportPickingIssue(App, error, {
          where: 'viewerMeasurement',
          op,
          throttleMs,
        }),
    },
  };
}
