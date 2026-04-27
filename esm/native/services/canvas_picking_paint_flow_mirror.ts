import type { AppContainer, MirrorLayoutList, UnknownRecord } from '../../../types';

import {
  DEFAULT_FACE_SIGN,
  buildMirrorLayoutFromHit,
  findMirrorLayoutMatchInRect,
} from '../features/mirror_layout.js';
import { __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers.js';
import {
  readMirrorPlacementRectFromUserData,
  resolveMirrorPlacementOwnerByPartId,
} from './canvas_picking_door_shared.js';
import type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
import type { MirrorLayoutClickResult } from './canvas_picking_paint_flow_shared.js';
import { isRecord } from './canvas_picking_paint_flow_shared.js';
import { __wp_ui } from './canvas_picking_core_helpers.js';

function emptyMirrorLayoutClickResult(): MirrorLayoutClickResult {
  return {
    nextLayout: null,
    removeMatch: null,
    canApplyMirror: false,
    hitFaceSign: null,
    isFullDoorMirror: false,
  };
}

function readMirrorDraft(App: AppContainer): { widthCm?: unknown; heightCm?: unknown } {
  const ui = __wp_ui(App);
  return {
    widthCm: ui?.currentMirrorDraftWidthCm,
    heightCm: ui?.currentMirrorDraftHeightCm,
  };
}

function readPositiveDraftCm(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Number(value) : null;
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(',', '.');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasSizedMirrorDraft(draft: { widthCm?: unknown; heightCm?: unknown }): boolean {
  return readPositiveDraftCm(draft.widthCm) != null || readPositiveDraftCm(draft.heightCm) != null;
}

function readDoorLeafRect(
  doorObj: unknown
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const obj = isRecord(doorObj) ? doorObj : null;
  const userData = obj && isRecord(obj.userData) ? obj.userData : null;
  return readMirrorPlacementRectFromUserData(userData);
}

function resolveMirrorFaceSignFromLocalPoint(localPoint: UnknownRecord | null): number {
  const localZ = localPoint && typeof localPoint.z === 'number' ? Number(localPoint.z) : NaN;
  return Number.isFinite(localZ) && localZ < 0 ? -1 : 1;
}

export function resolveMirrorLayoutForPaintClick(
  args: CanvasPaintClickArgs,
  layouts?: MirrorLayoutList | null
): MirrorLayoutClickResult {
  const targetId =
    typeof args.effectiveDoorId === 'string' && args.effectiveDoorId
      ? args.effectiveDoorId
      : args.foundPartId;
  const hitObj = args.doorHitObject ?? args.primaryHitObject;
  const hitPoint = args.doorHitPoint ?? args.primaryHitPoint;
  const owner = resolveMirrorPlacementOwnerByPartId(isRecord(hitObj) ? hitObj : null, targetId || null);
  const rect = readDoorLeafRect(owner);
  if (!owner || !rect || !hitPoint) return emptyMirrorLayoutClickResult();
  const localPoint = __wp_projectWorldPointToLocal(args.App, hitPoint, owner);
  if (!localPoint) return emptyMirrorLayoutClickResult();
  const faceSign = resolveMirrorFaceSignFromLocalPoint(localPoint);
  const draft = readMirrorDraft(args.App);
  const hasSizedDraft = hasSizedMirrorDraft(draft);
  const nextLayout = hasSizedDraft
    ? buildMirrorLayoutFromHit({
        rect,
        hitX: localPoint.x,
        hitY: localPoint.y,
        draft,
        faceSign,
      })
    : null;
  return {
    nextLayout,
    removeMatch: findMirrorLayoutMatchInRect({
      rect,
      layouts,
      hitX: localPoint.x,
      hitY: localPoint.y,
      faceSign,
    }),
    canApplyMirror: true,
    hitFaceSign: faceSign === -1 ? -1 : DEFAULT_FACE_SIGN,
    isFullDoorMirror: !hasSizedDraft,
  };
}
