import type {
  AppContainer,
  RoomArchitectureConfigLike,
  RoomOpeningKind,
  UnknownRecord,
} from '../../../types';

import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import { raycastAtNdc } from './canvas_picking_engine.js';
import { applyRoomArchitectureConfigSnapshot } from './canvas_picking_config_actions.js';
import { __wp_cfg, __wp_primaryMode } from './canvas_picking_core_helpers.js';
import { __wp_asRecord } from './canvas_picking_core_support.js';
import { __getSketchPlacementPreviewFns } from './canvas_picking_hover_preview_modes_shared.js';
import { buildRectClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';
import {
  getViewportCamera,
  getViewportRoomGroup,
  getViewportThree,
  getViewportWardrobeGroup,
} from './render_surface_runtime.js';
import { reportServiceNonFatal } from './service_error_observability.js';
import { isIgnoredRoomWardrobeObstacleObject } from './room_wardrobe_obstacle_policy.js';
import { findRoomOpeningTargetHit } from './room_architecture_picking.js';
import { findRoomWallSurfaceHit } from './room_wall_picking.js';
import { resetAllEditModes, subscribeEditStateChanges } from './edit_state.js';
import type { RoomOpeningPlacementPlan, RoomOpeningPlacementSurface } from './room_opening_placement_plan.js';
import type {
  RoomOpeningPlacementPointerContext,
  RoomOpeningPlacementRuntimeCapabilities,
} from './room_opening_placement_runtime.js';

const ROOM_OPENING_MODE_FALLBACK_ID = 'room_opening';
const MEASUREMENT_WALL_FACE_OFFSET_M = 0.012;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reportRoomOpeningPlacementNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(
    App,
    error,
    { where: 'native/services/room_opening_placement', op },
    { consoleOutput: false }
  );
}

function readCurrentArchitecture(App: AppContainer): RoomArchitectureConfigLike | null {
  const current = __wp_cfg(App).roomArchitecture;
  if (!current || typeof current !== 'object') return null;
  return {
    ...current,
    openings: Array.isArray(current.openings) ? current.openings : [],
  };
}

function refreshRoomArchitecture(App: AppContainer): void {
  try {
    App.services.roomDesign?.updateRoomArchitecture?.();
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'refreshRoomArchitecture', error);
  }
}

function commitArchitecture(App: AppContainer, next: RoomArchitectureConfigLike, source: string): boolean {
  if (
    !applyRoomArchitectureConfigSnapshot(App, next, {
      source,
      immediate: false,
      noBuild: true,
    })
  ) {
    return false;
  }
  refreshRoomArchitecture(App);
  return true;
}

function hidePlacementPreview(App: AppContainer): void {
  try {
    const hide = __getSketchPlacementPreviewFns(App).hidePreview;
    if (typeof hide === 'function') hide({ App, __reason: 'roomOpeningPlacement.hide' });
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'hidePlacementPreview', error);
  }
}

function roomOpeningEditMessage(kind: RoomOpeningKind): string {
  const label = kind === 'door' ? 'דלת' : 'חלון';
  return `מצב עריכה: מיקום ${label} — העבר את העכבר על קיר ולחץ למיקום; לחץ באזור ריק כדי לסיים`;
}

function getRoomOpeningModesController(App: AppContainer): UnknownRecord | null {
  const runtime = __wp_asRecord(App.services.uiModesRuntime);
  return __wp_asRecord(runtime?.controller);
}

function getRoomOpeningFeedback(App: AppContainer): UnknownRecord | null {
  return __wp_asRecord(App.services.uiFeedback);
}

function roomOpeningModeId(): string {
  return ROOM_OPENING_MODE_FALLBACK_ID;
}

function isRoomOpeningPrimaryMode(App: AppContainer): boolean {
  return __wp_primaryMode(App) === roomOpeningModeId();
}

function updateRoomOpeningEditToast(App: AppContainer, kind: RoomOpeningKind): void {
  try {
    const feedback = getRoomOpeningFeedback(App);
    const updateToast = feedback?.updateEditStateToast;
    if (typeof updateToast === 'function') {
      Reflect.apply(updateToast, feedback, [roomOpeningEditMessage(kind), true]);
    }
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'updateEditToast', error);
  }
}

function enterRoomOpeningEditMode(App: AppContainer, kind: RoomOpeningKind): boolean {
  const modeId = roomOpeningModeId();
  if (isRoomOpeningPrimaryMode(App)) {
    updateRoomOpeningEditToast(App, kind);
    return true;
  }

  try {
    resetAllEditModes(App);
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'enterEditMode.reset', error);
  }
  if (__wp_primaryMode(App) !== 'none') return false;

  const opts = {
    source: 'settings:roomOpening:enter',
    closeDoors: true,
    cursor: 'crosshair',
    toast: roomOpeningEditMessage(kind),
  };

  try {
    const controller = getRoomOpeningModesController(App);
    const enterPrimaryMode = controller?.enterPrimaryMode;
    if (typeof enterPrimaryMode !== 'function') return false;
    Reflect.apply(enterPrimaryMode, controller, [modeId, opts]);
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'enterEditMode', error);
    return false;
  }
  return isRoomOpeningPrimaryMode(App);
}

function exitRoomOpeningEditMode(App: AppContainer, source: string): void {
  if (!isRoomOpeningPrimaryMode(App)) return;
  const modeId = roomOpeningModeId();
  try {
    const controller = getRoomOpeningModesController(App);
    const exitPrimaryMode = controller?.exitPrimaryMode;
    if (typeof exitPrimaryMode === 'function') {
      Reflect.apply(exitPrimaryMode, controller, [modeId, { source }]);
      return;
    }
    resetAllEditModes(App);
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'exitEditMode', error);
  }
}

function normalizeModeDisposer(App: AppContainer, handle: unknown): (() => void) | null {
  if (typeof handle === 'function') {
    return () => {
      try {
        handle();
      } catch (error) {
        reportRoomOpeningPlacementNonFatal(App, 'disposeModeWatcher', error);
      }
    };
  }
  const record = __wp_asRecord(handle);
  const unsubscribe = record?.unsubscribe;
  if (typeof unsubscribe !== 'function') return null;
  return () => {
    try {
      Reflect.apply(unsubscribe, record, []);
    } catch (error) {
      reportRoomOpeningPlacementNonFatal(App, 'disposeModeWatcher', error);
    }
  };
}

function subscribeRoomOpeningModeChanges(App: AppContainer, listener: () => void): (() => void) | null {
  try {
    return normalizeModeDisposer(App, subscribeEditStateChanges(App, listener));
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'ensureModeWatcher', error);
    return null;
  }
}

function asPointerRuntimeArgs(pointer: RoomOpeningPlacementPointerContext): {
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
} {
  return {
    ndcX: pointer.ndcX,
    ndcY: pointer.ndcY,
    raycaster: pointer.raycaster as RaycasterLike,
    mouse: pointer.mouse as MouseVectorLike,
  };
}

function readNearestWardrobeObstacle(
  App: AppContainer,
  pointer: RoomOpeningPlacementPointerContext
): { distance: number | null } | null {
  const camera = getViewportCamera(App);
  const wardrobeGroup = getViewportWardrobeGroup(App);
  if (!camera || !wardrobeGroup) return null;
  const args = asPointerRuntimeArgs(pointer);
  const hits = raycastAtNdc({
    raycaster: args.raycaster,
    mouse: args.mouse,
    camera,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    objects: [wardrobeGroup],
    recursive: true,
  });
  for (const hit of hits) {
    if (isIgnoredRoomWardrobeObstacleObject(hit.object)) continue;
    return { distance: finiteNumber((hit as RaycastHitLike & { distance?: unknown }).distance) };
  }
  return null;
}

function buildWallClearanceMeasurements(
  plan: RoomOpeningPlacementPlan,
  surface: RoomOpeningPlacementSurface
) {
  const openingWidthM = Math.max(0.0001, Number(plan.opening.widthCm) / 100);
  const openingHeightM = Math.max(0.0001, Number(plan.opening.heightCm) / 100);
  const openingOffsetM = Math.max(0, Number(plan.opening.offsetAlongCm) / 100);
  const openingBottomM =
    plan.opening.kind === 'door' ? 0 : Math.max(0, Number(plan.opening.bottomOffsetCm) / 100);
  const targetCenterAlong = surface.startCoord + openingOffsetM + openingWidthM / 2;
  const targetCenterY = openingBottomM + openingHeightM / 2;
  const isBackWall = surface.axis === 'x';
  const faceSign = isBackWall ? surface.inwardNormalZ : surface.inwardNormalX;
  const wallFaceCoord = surface.interiorFaceCoord + faceSign * MEASUREMENT_WALL_FACE_OFFSET_M;

  return buildRectClearanceMeasurementEntries({
    containerMinX: surface.startCoord,
    containerMaxX: surface.startCoord + surface.usableLength,
    containerMinY: 0,
    containerMaxY: surface.wallHeight,
    targetCenterX: targetCenterAlong,
    targetCenterY,
    targetWidth: openingWidthM,
    targetHeight: openingHeightM,
    z: wallFaceCoord,
    showTop: true,
    showBottom: plan.opening.kind === 'window',
    showLeft: true,
    showRight: true,
    minVerticalCm: 0.5,
    minHorizontalCm: 0.5,
    styleKey: 'cell',
    textScale: 0.95,
    faceSign,
    viewFaceSign: faceSign,
    labelFaceSign: faceSign,
    surfacePlane: isBackWall ? 'xy' : 'yz',
  });
}

function readOpeningIdFromTarget(target: unknown): string | null {
  const userData = __wp_asRecord(__wp_asRecord(target)?.userData);
  const rawId = userData?.roomOpeningId;
  return typeof rawId === 'string' && rawId.trim() ? rawId.trim() : null;
}

export function createRoomOpeningPlacementAppCapabilities(
  App: AppContainer
): RoomOpeningPlacementRuntimeCapabilities {
  let previewMesh: UnknownRecord | null = null;

  return {
    enterEditMode: kind => enterRoomOpeningEditMode(App, kind),
    exitEditMode: source => exitRoomOpeningEditMode(App, source),
    isEditModeActive: () => isRoomOpeningPrimaryMode(App),
    subscribeEditModeChanges: listener => subscribeRoomOpeningModeChanges(App, listener),
    hidePreview: () => hidePlacementPreview(App),

    showPlacementPreview(plan, surface): void {
      try {
        const THREE = __wp_asRecord(getViewportThree(App));
        const BoxGeometryCtor = THREE?.BoxGeometry as
          (new (w?: number, h?: number, d?: number) => UnknownRecord) | undefined;
        const MeshCtor = THREE?.Mesh as
          (new (geometry: unknown, material?: unknown) => UnknownRecord) | undefined;
        const roomGroup = __wp_asRecord(getViewportRoomGroup(App));
        const setPreview = __getSketchPlacementPreviewFns(App).setPreview;
        if (!BoxGeometryCtor || !MeshCtor || !roomGroup || typeof setPreview !== 'function') return;

        if (!previewMesh) previewMesh = new MeshCtor(new BoxGeometryCtor(1, 1, 1));
        const position = __wp_asRecord(previewMesh.position);
        const scale = __wp_asRecord(previewMesh.scale);
        if (typeof position?.set === 'function') {
          position.set(plan.preview.x, plan.preview.y, plan.preview.z);
        }
        if (typeof scale?.set === 'function') {
          scale.set(plan.preview.w, plan.preview.h, plan.preview.d);
        }
        previewMesh.parent = roomGroup;
        if (typeof previewMesh.updateMatrixWorld === 'function') previewMesh.updateMatrixWorld(true);

        setPreview({
          App,
          THREE,
          anchorParent: roomGroup,
          kind: 'object_boxes',
          previewObjects: [previewMesh],
          overlayThroughScene: true,
          op: plan.blockedReason ? 'blocked' : 'add',
          woodThick: 0.018,
          clearanceMeasurements: buildWallClearanceMeasurements(plan, surface),
        });
      } catch (error) {
        reportRoomOpeningPlacementNonFatal(App, 'setPlacementPreview', error);
      }
    },

    showRemovalPreview(target): void {
      try {
        const targetRecord = __wp_asRecord(target);
        if (!targetRecord) return;
        const THREE = __wp_asRecord(getViewportThree(App));
        const setPreview = __getSketchPlacementPreviewFns(App).setPreview;
        const anchorParent = __wp_asRecord(targetRecord.parent) || __wp_asRecord(getViewportRoomGroup(App));
        if (!THREE || !anchorParent || typeof setPreview !== 'function') return;
        setPreview({
          App,
          THREE,
          anchor: targetRecord,
          anchorParent,
          kind: 'object_boxes',
          previewObjects: [targetRecord],
          overlayThroughScene: true,
          op: 'remove',
          woodThick: 0.018,
        });
      } catch (error) {
        reportRoomOpeningPlacementNonFatal(App, 'setOpeningRemovalPreview', error);
      }
    },

    readArchitecture: () => readCurrentArchitecture(App),
    commitArchitecture: (next, source) => commitArchitecture(App, next, source),

    findOpeningTargetHit(pointer, kind) {
      const args = asPointerRuntimeArgs(pointer);
      const hit = findRoomOpeningTargetHit({ App, ...args, kind });
      return hit ? { target: hit.target, distance: hit.distance } : null;
    },

    findWallSurfaceHit(pointer) {
      const args = asPointerRuntimeArgs(pointer);
      const hit = findRoomWallSurfaceHit({ App, ...args });
      return hit
        ? {
            surface: hit.surface,
            point: hit.point,
            distance: hit.distance,
          }
        : null;
    },

    findWardrobeObstacle: pointer => readNearestWardrobeObstacle(App, pointer),
    readOpeningId: readOpeningIdFromTarget,
    createOpeningId: () =>
      `room-opening-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  };
}
