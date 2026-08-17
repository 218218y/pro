import type {
  AppContainer,
  RoomArchitectureConfigLike,
  RoomOpeningKind,
  RoomWallOpeningLike,
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
import {
  findRoomWallSurfaceHit,
  type RoomWallSurfaceHit,
  type RoomWallSurfacePickMeta,
} from './room_wall_picking.js';
import { resetAllEditModes, subscribeEditStateChanges } from './edit_state.js';

const CACHE_DRAFT_KEY = '__wpRoomOpeningPlacementDraft';
const CACHE_HOVER_KEY = '__wpRoomOpeningPlacementHover';
const CACHE_MODE_UNSUB_KEY = '__wpRoomOpeningPlacementModeUnsub';
const ROOM_OPENING_HOVER_KIND = 'room-opening-placement';
const CANVAS_HOVER_CURSOR_PRESERVE = '__wp_canvas_hover_cursor_preserve';
const MIN_OPENING_SIZE_CM = 20;
const PREVIEW_WALL_DEPTH_M = 0.205;
const ROOM_OPENING_MODE_FALLBACK_ID = 'room_opening';
const MEASUREMENT_WALL_FACE_OFFSET_M = 0.012;
const WALL_OCCLUSION_EPSILON_M = 0.002;

function getRoomOpeningPlacementCache(App: AppContainer): UnknownRecord {
  const current = __wp_asRecord(App.services.runtimeCache);
  if (current) return current;
  const next: UnknownRecord = Object.create(null) as UnknownRecord;
  App.services.runtimeCache = next;
  return next;
}

type RoomOpeningPlacementDraft = {
  kind: RoomOpeningKind;
  widthCm: number;
  heightCm: number;
};

type RoomOpeningHoverState = {
  opening: RoomWallOpeningLike;
  blockedReason: string | null;
  clearancesCm: { start: number; end: number; top: number; bottom: number };
  preview: { x: number; y: number; z: number; w: number; h: number; d: number };
};

export type RoomOpeningPlacementHoverFeedback = {
  kind: typeof ROOM_OPENING_HOVER_KIND;
  cursor: typeof CANVAS_HOVER_CURSOR_PRESERVE;
  partLabel: string | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundCm(value: number): number {
  return Math.round(value * 10) / 10;
}

function readDraft(App: AppContainer): RoomOpeningPlacementDraft | null {
  const raw = __wp_asRecord(getRoomOpeningPlacementCache(App)[CACHE_DRAFT_KEY]);
  if (!raw || (raw.kind !== 'window' && raw.kind !== 'door')) return null;
  const widthCm = finiteNumber(raw.widthCm);
  const heightCm = finiteNumber(raw.heightCm);
  if (
    widthCm == null ||
    heightCm == null ||
    widthCm < MIN_OPENING_SIZE_CM ||
    heightCm < MIN_OPENING_SIZE_CM
  ) {
    return null;
  }
  return { kind: raw.kind, widthCm, heightCm };
}

function writeDraft(App: AppContainer, draft: RoomOpeningPlacementDraft | null): void {
  const cache = getRoomOpeningPlacementCache(App);
  cache[CACHE_DRAFT_KEY] = draft;
  if (!draft) cache[CACHE_HOVER_KEY] = null;
}

function readCurrentArchitecture(App: AppContainer): RoomArchitectureConfigLike | null {
  const current = __wp_cfg(App).roomArchitecture;
  if (!current || typeof current !== 'object') return null;
  return {
    ...current,
    openings: Array.isArray(current.openings) ? current.openings : [],
  };
}

function withRoomOpenings(
  current: RoomArchitectureConfigLike,
  openings: RoomWallOpeningLike[]
): RoomArchitectureConfigLike {
  return { ...current, openings };
}

function reportRoomOpeningPlacementNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(
    App,
    error,
    { where: 'native/services/room_opening_placement', op },
    { consoleOutput: false }
  );
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

function roomOpeningModeId(): string {
  return ROOM_OPENING_MODE_FALLBACK_ID;
}

function getRoomOpeningModesController(App: AppContainer): UnknownRecord | null {
  const runtime = __wp_asRecord(App.services.uiModesRuntime);
  return __wp_asRecord(runtime?.controller);
}

function getRoomOpeningFeedback(App: AppContainer): UnknownRecord | null {
  return __wp_asRecord(App.services.uiFeedback);
}

function roomOpeningEditMessage(kind: RoomOpeningKind): string {
  const label = kind === 'door' ? 'דלת' : 'חלון';
  return `מצב עריכה: מיקום ${label} — העבר את העכבר על קיר ולחץ למיקום; לחץ באזור ריק כדי לסיים`;
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
function disposeRoomOpeningModeWatcher(App: AppContainer): void {
  const cache = getRoomOpeningPlacementCache(App);
  const handle = cache[CACHE_MODE_UNSUB_KEY];
  cache[CACHE_MODE_UNSUB_KEY] = null;
  try {
    if (typeof handle === 'function') {
      handle();
      return;
    }
    const record = __wp_asRecord(handle);
    if (typeof record?.unsubscribe === 'function') Reflect.apply(record.unsubscribe, record, []);
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'disposeModeWatcher', error);
  }
}

function ensureRoomOpeningModeWatcher(App: AppContainer): void {
  const cache = getRoomOpeningPlacementCache(App);
  if (cache[CACHE_MODE_UNSUB_KEY]) return;
  try {
    cache[CACHE_MODE_UNSUB_KEY] = subscribeEditStateChanges(App, () => {
      if (isRoomOpeningPrimaryMode(App)) return;
      const currentCache = getRoomOpeningPlacementCache(App);
      if (currentCache[CACHE_DRAFT_KEY] == null) {
        disposeRoomOpeningModeWatcher(App);
        return;
      }
      writeDraft(App, null);
      hidePlacementPreview(App);
      disposeRoomOpeningModeWatcher(App);
    });
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'ensureModeWatcher', error);
  }
}

function readActiveDraft(App: AppContainer): RoomOpeningPlacementDraft | null {
  const draft = readDraft(App);
  if (!draft) return null;
  if (isRoomOpeningPrimaryMode(App)) return draft;
  writeDraft(App, null);
  hidePlacementPreview(App);
  disposeRoomOpeningModeWatcher(App);
  return null;
}

function finishRoomOpeningPlacement(App: AppContainer, source: string): void {
  writeDraft(App, null);
  hidePlacementPreview(App);
  disposeRoomOpeningModeWatcher(App);
  exitRoomOpeningEditMode(App, source);
}

export function beginRoomOpeningPlacement(
  App: AppContainer,
  input: { kind: RoomOpeningKind; widthCm?: number | null; heightCm?: number | null }
): boolean {
  if (input.kind !== 'window' && input.kind !== 'door') return false;
  const defaultWidth = input.kind === 'door' ? 90 : 120;
  const defaultHeight = input.kind === 'door' ? 210 : 100;
  const widthCm = Math.max(MIN_OPENING_SIZE_CM, finiteNumber(input.widthCm) ?? defaultWidth);
  const heightCm = Math.max(MIN_OPENING_SIZE_CM, finiteNumber(input.heightCm) ?? defaultHeight);
  if (!enterRoomOpeningEditMode(App, input.kind)) return false;
  writeDraft(App, { kind: input.kind, widthCm: roundCm(widthCm), heightCm: roundCm(heightCm) });
  ensureRoomOpeningModeWatcher(App);
  hidePlacementPreview(App);
  return true;
}

export function cancelRoomOpeningPlacement(App: AppContainer): void {
  finishRoomOpeningPlacement(App, 'settings:roomOpening:cancel');
}

export function isRoomOpeningPlacementActive(App: AppContainer): boolean {
  return readActiveDraft(App) != null;
}

function resolveOpeningAtPoint(args: {
  draft: RoomOpeningPlacementDraft;
  surface: RoomWallSurfacePickMeta;
  point: { x: number; y: number; z: number };
  existing: RoomWallOpeningLike[];
}): RoomOpeningHoverState | null {
  const { draft, surface, point, existing } = args;
  const widthM = Math.min(draft.widthCm / 100, surface.usableLength);
  const heightM = Math.min(draft.heightCm / 100, surface.wallHeight);
  if (!(widthM > 0) || !(heightM > 0)) return null;

  const hitAlong = surface.axis === 'x' ? point.x : point.z;
  const maxOffset = Math.max(0, surface.usableLength - widthM);
  const offsetAlongM = clamp(hitAlong - surface.startCoord - widthM / 2, 0, maxOffset);
  const maxBottom = Math.max(0, surface.wallHeight - heightM);
  const bottomM = draft.kind === 'door' ? 0 : clamp(point.y - heightM / 2, 0, maxBottom);

  const opening: RoomWallOpeningLike = {
    id: '__room-opening-preview__',
    kind: draft.kind,
    wall: surface.wall,
    widthCm: roundCm(widthM * 100),
    heightCm: roundCm(heightM * 100),
    offsetAlongCm: roundCm(offsetAlongM * 100),
    bottomOffsetCm: draft.kind === 'door' ? 0 : roundCm(bottomM * 100),
  };

  const a0 = offsetAlongM;
  const a1 = offsetAlongM + widthM;
  const y0 = bottomM;
  const y1 = bottomM + heightM;
  const blocked = existing.some(item => {
    if (item.wall !== surface.wall) return false;
    const iw = Math.min(Math.max(MIN_OPENING_SIZE_CM, Number(item.widthCm) || 0) / 100, surface.usableLength);
    const ih = Math.min(Math.max(MIN_OPENING_SIZE_CM, Number(item.heightCm) || 0) / 100, surface.wallHeight);
    const ia0 = clamp((Number(item.offsetAlongCm) || 0) / 100, 0, Math.max(0, surface.usableLength - iw));
    const ibottom =
      item.kind === 'door'
        ? 0
        : clamp((Number(item.bottomOffsetCm) || 0) / 100, 0, Math.max(0, surface.wallHeight - ih));
    const ia1 = ia0 + iw;
    const iy1 = ibottom + ih;
    return a0 < ia1 - 0.001 && a1 > ia0 + 0.001 && y0 < iy1 - 0.001 && y1 > ibottom + 0.001;
  });

  const alongCenter = surface.startCoord + offsetAlongM + widthM / 2;
  const inwardPreviewOffset = PREVIEW_WALL_DEPTH_M / 2;
  const x =
    surface.axis === 'x'
      ? alongCenter
      : surface.interiorFaceCoord + surface.inwardNormalX * inwardPreviewOffset;
  const z =
    surface.axis === 'z'
      ? alongCenter
      : surface.interiorFaceCoord + surface.inwardNormalZ * inwardPreviewOffset;

  return {
    opening,
    blockedReason: blocked ? 'המיקום חופף לחלון או דלת קיימים' : null,
    clearancesCm: {
      start: roundCm(offsetAlongM * 100),
      end: roundCm(Math.max(0, surface.usableLength - offsetAlongM - widthM) * 100),
      top: roundCm(Math.max(0, surface.wallHeight - bottomM - heightM) * 100),
      bottom: roundCm(bottomM * 100),
    },
    preview: {
      x,
      y: bottomM + heightM / 2,
      z,
      w: surface.axis === 'x' ? widthM : PREVIEW_WALL_DEPTH_M,
      h: heightM,
      d: surface.axis === 'z' ? widthM : PREVIEW_WALL_DEPTH_M,
    },
  };
}

function isIgnoredWardrobeRaycastObject(value: unknown): boolean {
  let node = __wp_asRecord(value);
  for (let depth = 0; node && depth < 12; depth += 1) {
    const type = typeof node.type === 'string' ? node.type : '';
    if (type === 'Line' || type === 'LineSegments' || type === 'Sprite') return true;

    const userData = __wp_asRecord(node.userData);
    if (
      userData?.__ignoreRaycast === true ||
      userData?.__wpExcludeWardrobeBounds === true ||
      userData?.__wpViewerMeasurementOverlay === true ||
      userData?.isModuleSelector === true
    ) {
      return true;
    }

    if (depth === 0) {
      const material = __wp_asRecord(node.material);
      if (material?.visible === false || material?.opacity === 0) return true;
      if (Array.isArray(node.material)) {
        const materials = node.material
          .map(item => __wp_asRecord(item))
          .filter((item): item is UnknownRecord => item != null);
        if (materials.length && materials.every(item => item.visible === false || item.opacity === 0)) {
          return true;
        }
      }
    }

    node = __wp_asRecord(node.parent);
  }
  return false;
}

type WardrobeSurfaceHit = {
  hit: RaycastHitLike;
  distance: number | null;
};

function readNearestWardrobeHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): WardrobeSurfaceHit | null {
  const camera = getViewportCamera(args.App);
  const wardrobeGroup = getViewportWardrobeGroup(args.App);
  if (!camera || !wardrobeGroup) return null;
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
    if (isIgnoredWardrobeRaycastObject(hit.object)) continue;
    const distance = finiteNumber((hit as RaycastHitLike & { distance?: unknown }).distance);
    return { hit, distance };
  }
  return null;
}

function isWallHitOccludedByWardrobe(
  wallHit: RoomWallSurfaceHit,
  wardrobeHit: WardrobeSurfaceHit | null
): boolean {
  if (!wardrobeHit) return false;
  if (wallHit.distance == null || wardrobeHit.distance == null) return true;
  return wardrobeHit.distance + WALL_OCCLUSION_EPSILON_M < wallHit.distance;
}

function buildWallClearanceMeasurements(hover: RoomOpeningHoverState, surface: RoomWallSurfacePickMeta) {
  const openingWidthM = Math.max(0.0001, Number(hover.opening.widthCm) / 100);
  const openingHeightM = Math.max(0.0001, Number(hover.opening.heightCm) / 100);
  const openingOffsetM = Math.max(0, Number(hover.opening.offsetAlongCm) / 100);
  const openingBottomM =
    hover.opening.kind === 'door' ? 0 : Math.max(0, Number(hover.opening.bottomOffsetCm) / 100);
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
    showBottom: hover.opening.kind === 'window',
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

function setPlacementPreview(
  App: AppContainer,
  hover: RoomOpeningHoverState,
  surface: RoomWallSurfacePickMeta
): void {
  try {
    const THREE = __wp_asRecord(getViewportThree(App));
    const BoxGeometryCtor = THREE?.BoxGeometry as
      (new (w?: number, h?: number, d?: number) => UnknownRecord) | undefined;
    const MeshCtor = THREE?.Mesh as
      (new (geometry: unknown, material?: unknown) => UnknownRecord) | undefined;
    const roomGroup = __wp_asRecord(getViewportRoomGroup(App));
    const setPreview = __getSketchPlacementPreviewFns(App).setPreview;
    if (!BoxGeometryCtor || !MeshCtor || !roomGroup || typeof setPreview !== 'function') return;

    const cache = getRoomOpeningPlacementCache(App);
    let mesh = __wp_asRecord(cache.__wpRoomOpeningPreviewMesh);
    if (!mesh) {
      mesh = new MeshCtor(new BoxGeometryCtor(1, 1, 1));
      cache.__wpRoomOpeningPreviewMesh = mesh;
    }
    const position = __wp_asRecord(mesh.position);
    const scale = __wp_asRecord(mesh.scale);
    if (typeof position?.set === 'function') position.set(hover.preview.x, hover.preview.y, hover.preview.z);
    if (typeof scale?.set === 'function') scale.set(hover.preview.w, hover.preview.h, hover.preview.d);
    // Object-box preview reads matrixWorld. Assigning the logical parent without inserting
    // the helper into roomGroup.children keeps transforms correct without rendering the helper.
    mesh.parent = roomGroup;
    if (typeof mesh.updateMatrixWorld === 'function') mesh.updateMatrixWorld(true);

    setPreview({
      App,
      THREE,
      anchorParent: roomGroup,
      kind: 'object_boxes',
      previewObjects: [mesh],
      overlayThroughScene: true,
      op: hover.blockedReason ? 'blocked' : 'add',
      woodThick: 0.018,
      clearanceMeasurements: buildWallClearanceMeasurements(hover, surface),
    });
  } catch (error) {
    reportRoomOpeningPlacementNonFatal(App, 'setPlacementPreview', error);
  }
}

export function tryHandleRoomOpeningPlacementHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): RoomOpeningPlacementHoverFeedback | null {
  const draft = readActiveDraft(args.App);
  if (!draft) return null;
  const wallHit = findRoomWallSurfaceHit(args);
  if (!wallHit) {
    getRoomOpeningPlacementCache(args.App)[CACHE_HOVER_KEY] = null;
    hidePlacementPreview(args.App);
    return {
      kind: ROOM_OPENING_HOVER_KIND,
      cursor: CANVAS_HOVER_CURSOR_PRESERVE,
      partLabel: null,
    };
  }

  const wardrobeHit = readNearestWardrobeHit(args);
  if (isWallHitOccludedByWardrobe(wallHit, wardrobeHit)) {
    getRoomOpeningPlacementCache(args.App)[CACHE_HOVER_KEY] = null;
    hidePlacementPreview(args.App);
    return {
      kind: ROOM_OPENING_HOVER_KIND,
      cursor: CANVAS_HOVER_CURSOR_PRESERVE,
      partLabel: null,
    };
  }

  const current = readCurrentArchitecture(args.App);
  if (!current) return null;
  const hover = resolveOpeningAtPoint({
    draft,
    surface: wallHit.surface,
    point: wallHit.point,
    existing: current.openings,
  });
  if (!hover) return null;
  getRoomOpeningPlacementCache(args.App)[CACHE_HOVER_KEY] = hover as unknown as UnknownRecord;
  setPlacementPreview(args.App, hover, wallHit.surface);
  return {
    kind: ROOM_OPENING_HOVER_KIND,
    cursor: CANVAS_HOVER_CURSOR_PRESERVE,
    partLabel: null,
  };
}

export function tryHandleRoomOpeningPlacementClick(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): boolean {
  const draft = readActiveDraft(args.App);
  if (!draft) return false;
  const wallHit = findRoomWallSurfaceHit(args);
  const wardrobeHit = readNearestWardrobeHit(args);
  if (!wallHit) {
    hidePlacementPreview(args.App);
    if (!wardrobeHit) finishRoomOpeningPlacement(args.App, 'canvas:roomOpening:emptyClick');
    return true;
  }
  if (isWallHitOccludedByWardrobe(wallHit, wardrobeHit)) {
    hidePlacementPreview(args.App);
    return true;
  }
  const current = readCurrentArchitecture(args.App);
  if (!current) return true;
  const hover = resolveOpeningAtPoint({
    draft,
    surface: wallHit.surface,
    point: wallHit.point,
    existing: current.openings,
  });
  if (!hover) return true;
  if (hover.blockedReason) return true;

  const opening: RoomWallOpeningLike = {
    ...hover.opening,
    id: `room-opening-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  };
  const next = withRoomOpenings(current, [...current.openings, opening]);
  if (commitArchitecture(args.App, next, 'canvas:roomOpening:add')) {
    finishRoomOpeningPlacement(args.App, 'canvas:roomOpening:placed');
  }
  return true;
}

export function removeRoomOpening(App: AppContainer, openingId: string): boolean {
  const id = String(openingId || '').trim();
  if (!id) return false;
  const current = readCurrentArchitecture(App);
  if (!current) return false;
  const openings = current.openings.filter(opening => opening.id !== id);
  if (openings.length === current.openings.length) return false;
  const next = withRoomOpenings(current, openings);
  return commitArchitecture(App, next, 'settings:roomOpening:remove');
}
