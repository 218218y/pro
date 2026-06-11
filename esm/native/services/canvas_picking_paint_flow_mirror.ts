import type { AppContainer, MirrorLayoutList, UnknownRecord } from '../../../types';

import {
  DEFAULT_FACE_SIGN,
  buildMirrorLayoutFromHit,
  findMirrorLayoutMatchInRect,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
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

function normalizeMirrorHitIdentityFaceSign(value: unknown): 1 | -1 | null {
  if (value === -1) return -1;
  if (value === 1) return 1;
  return null;
}

function targetMatchesHitIdentityDoor(args: CanvasPaintClickArgs, targetId: string | null): boolean {
  const identity = args.hitIdentity;
  if (!identity || identity.targetKind !== 'door' || !targetId) return false;
  if (identity.partId === targetId || identity.doorId === targetId) return true;
  return !!(identity.doorId && targetId.startsWith(`${identity.doorId}_`));
}

function readHitIdentityMirrorFaceSign(args: CanvasPaintClickArgs, targetId: string | null): 1 | -1 | null {
  if (!targetMatchesHitIdentityDoor(args, targetId)) return null;
  return normalizeMirrorHitIdentityFaceSign(args.hitIdentity?.faceSign);
}

function isFullDoorMirrorLayoutEntry(layout: unknown): boolean {
  const entry = isRecord(layout) ? layout : null;
  if (!entry) return false;
  return (
    entry.widthCm == null && entry.heightCm == null && entry.centerXNorm == null && entry.centerYNorm == null
  );
}

function findFullDoorMirrorFaceMatch(
  layouts: MirrorLayoutList | null | undefined,
  faceSign: 1 | -1
): { index: number } | null {
  const list = readMirrorLayoutList(layouts);
  for (let i = 0; i < list.length; i += 1) {
    const layout = list[i];
    if (
      isFullDoorMirrorLayoutEntry(layout) &&
      readMirrorLayoutFaceSign(layout, DEFAULT_FACE_SIGN) === faceSign
    ) {
      return { index: i };
    }
  }
  return null;
}

function resolveFullDoorMirrorHitIdentityResult(args: {
  clickArgs: CanvasPaintClickArgs;
  layouts: MirrorLayoutList | null | undefined;
  targetId: string | null;
  hasSizedDraft: boolean;
}): MirrorLayoutClickResult | null {
  if (args.hasSizedDraft) return null;
  const faceSign = readHitIdentityMirrorFaceSign(args.clickArgs, args.targetId);
  if (faceSign == null) return null;
  return {
    nextLayout: null,
    removeMatch: findFullDoorMirrorFaceMatch(args.layouts, faceSign),
    canApplyMirror: true,
    hitFaceSign: faceSign,
    isFullDoorMirror: true,
  };
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
  const draft = readMirrorDraft(args.App);
  const hasSizedDraft = hasSizedMirrorDraft(draft);
  const identityResult = (): MirrorLayoutClickResult | null =>
    resolveFullDoorMirrorHitIdentityResult({
      clickArgs: args,
      layouts,
      targetId: targetId || null,
      hasSizedDraft,
    });

  if (!owner || !rect || !hitPoint) return identityResult() || emptyMirrorLayoutClickResult();
  const localPoint = __wp_projectWorldPointToLocal(args.App, hitPoint, owner);
  if (!localPoint) return identityResult() || emptyMirrorLayoutClickResult();
  const faceSign = resolveMirrorFaceSignFromLocalPoint(localPoint);
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
