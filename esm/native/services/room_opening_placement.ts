import type {
  AppContainer,
  RootStateLike,
  RoomArchitectureConfigLike,
  RoomOpeningKind,
  RoomWallId,
  RoomWallOpeningLike,
  UnknownRecord,
} from '../../../types';

import { patchProjectRoomArchitecture } from '../features/project_config/api.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getCacheBag } from '../runtime/cache_access.js';
import { getConfigActionFn } from '../runtime/actions_access_domains.js';
import { getRoomGroup } from '../runtime/render_access.js';
import { asRecord } from '../runtime/record.js';
import { getRoomDesignServiceMaybe } from '../runtime/room_design_access.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { findRoomWallSurfaceHit, type RoomWallSurfacePickMeta } from './room_wall_picking.js';

const CACHE_DRAFT_KEY = '__wpRoomOpeningPlacementDraft';
const CACHE_HOVER_KEY = '__wpRoomOpeningPlacementHover';
const ROOM_OPENING_HOVER_KIND = 'room-opening-placement';
const CANVAS_HOVER_CURSOR_PRESERVE = '__wp_canvas_hover_cursor_preserve';
const MIN_OPENING_SIZE_CM = 20;
const PREVIEW_WALL_DEPTH_M = 0.205;

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
  const raw = asRecord(getCacheBag(App)[CACHE_DRAFT_KEY]);
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
  const cache = getCacheBag(App);
  cache[CACHE_DRAFT_KEY] = draft;
  if (!draft) cache[CACHE_HOVER_KEY] = null;
}

function readCurrentArchitecture(App: AppContainer): RoomArchitectureConfigLike {
  const state = readStoreStateMaybe<RootStateLike>(App);
  return patchProjectRoomArchitecture(state?.config?.roomArchitecture, {});
}

function refreshRoomArchitecture(App: AppContainer): void {
  try {
    getRoomDesignServiceMaybe(App)?.updateRoomArchitecture?.();
  } catch {
    // The store write remains authoritative; scene refresh can recover on the next room/build refresh.
  }
}

function commitArchitecture(App: AppContainer, next: RoomArchitectureConfigLike, source: string): boolean {
  const setScalar = getConfigActionFn<(key: string, valueOrFn: unknown, meta?: UnknownRecord) => unknown>(
    App,
    'setScalar'
  );
  if (typeof setScalar !== 'function') return false;
  setScalar('roomArchitecture', next, { source, immediate: false, noBuild: true });
  refreshRoomArchitecture(App);
  return true;
}

function hidePlacementPreview(App: AppContainer): void {
  try {
    const hide = getBuilderRenderOps(App)?.hideSketchPlacementPreview;
    if (typeof hide === 'function') hide({ App, __reason: 'roomOpeningPlacement.hide' });
  } catch {
    // Preview teardown is best-effort and must never break the placement state.
  }
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
  writeDraft(App, { kind: input.kind, widthCm: roundCm(widthCm), heightCm: roundCm(heightCm) });
  hidePlacementPreview(App);
  return true;
}

export function cancelRoomOpeningPlacement(App: AppContainer): void {
  writeDraft(App, null);
  hidePlacementPreview(App);
}

export function isRoomOpeningPlacementActive(App: AppContainer): boolean {
  return readDraft(App) != null;
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

function setPlacementPreview(App: AppContainer, hover: RoomOpeningHoverState): void {
  try {
    const THREE = asRecord(getThreeMaybe(App));
    const BoxGeometryCtor = THREE?.BoxGeometry as
      (new (w?: number, h?: number, d?: number) => UnknownRecord) | undefined;
    const MeshCtor = THREE?.Mesh as
      (new (geometry: unknown, material?: unknown) => UnknownRecord) | undefined;
    const roomGroup = asRecord(getRoomGroup(App));
    const setPreview = getBuilderRenderOps(App)?.setSketchPlacementPreview;
    if (!BoxGeometryCtor || !MeshCtor || !roomGroup || typeof setPreview !== 'function') return;

    const cache = getCacheBag(App);
    let mesh = asRecord(cache.__wpRoomOpeningPreviewMesh);
    if (!mesh) {
      mesh = new MeshCtor(new BoxGeometryCtor(1, 1, 1));
      cache.__wpRoomOpeningPreviewMesh = mesh;
    }
    const position = asRecord(mesh.position);
    const scale = asRecord(mesh.scale);
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
    });
  } catch {
    // Placement remains functional even if the visual preview cannot be shown.
  }
}

function wallClearanceLabels(wall: RoomWallId): { start: string; end: string } {
  if (wall === 'back') return { start: 'משמאל', end: 'מימין' };
  return { start: 'מאחור', end: 'מלפנים' };
}

function formatHoverLabel(hover: RoomOpeningHoverState): string {
  const labels = wallClearanceLabels(hover.opening.wall);
  const title = hover.opening.kind === 'door' ? 'דלת' : 'חלון';
  const size = `${roundCm(hover.opening.widthCm)}×${roundCm(hover.opening.heightCm)} ס״מ`;
  const horizontal = `${labels.start}: ${hover.clearancesCm.start} ס״מ   |   ${labels.end}: ${hover.clearancesCm.end} ס״מ`;
  const vertical =
    hover.opening.kind === 'door'
      ? `למעלה: ${hover.clearancesCm.top} ס״מ`
      : `למעלה: ${hover.clearancesCm.top} ס״מ   |   למטה: ${hover.clearancesCm.bottom} ס״מ`;
  return `${hover.blockedReason ? `⚠ ${hover.blockedReason}\n` : ''}${title} ${size}\n${horizontal}\n${vertical}`;
}

export function tryHandleRoomOpeningPlacementHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): RoomOpeningPlacementHoverFeedback | null {
  const draft = readDraft(args.App);
  if (!draft) return null;
  const wallHit = findRoomWallSurfaceHit(args);
  if (!wallHit) {
    getCacheBag(args.App)[CACHE_HOVER_KEY] = null;
    hidePlacementPreview(args.App);
    return {
      kind: ROOM_OPENING_HOVER_KIND,
      cursor: CANVAS_HOVER_CURSOR_PRESERVE,
      partLabel: 'בחר מיקום על אחד הקירות',
    };
  }

  const current = readCurrentArchitecture(args.App);
  const hover = resolveOpeningAtPoint({
    draft,
    surface: wallHit.surface,
    point: wallHit.point,
    existing: current.openings,
  });
  if (!hover) return null;
  getCacheBag(args.App)[CACHE_HOVER_KEY] = hover as unknown as UnknownRecord;
  setPlacementPreview(args.App, hover);
  return {
    kind: ROOM_OPENING_HOVER_KIND,
    cursor: CANVAS_HOVER_CURSOR_PRESERVE,
    partLabel: formatHoverLabel(hover),
  };
}

export function tryHandleRoomOpeningPlacementClick(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): boolean {
  const draft = readDraft(args.App);
  if (!draft) return false;
  const wallHit = findRoomWallSurfaceHit(args);
  if (!wallHit) return true;
  const current = readCurrentArchitecture(args.App);
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
  const next = patchProjectRoomArchitecture(current, { openings: [...current.openings, opening] });
  if (commitArchitecture(args.App, next, 'canvas:roomOpening:add')) cancelRoomOpeningPlacement(args.App);
  return true;
}

export function removeRoomOpening(App: AppContainer, openingId: string): boolean {
  const id = String(openingId || '').trim();
  if (!id) return false;
  const current = readCurrentArchitecture(App);
  const openings = current.openings.filter(opening => opening.id !== id);
  if (openings.length === current.openings.length) return false;
  const next = patchProjectRoomArchitecture(current, { openings });
  return commitArchitecture(App, next, 'settings:roomOpening:remove');
}
