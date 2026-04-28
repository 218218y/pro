import type { UnknownRecord } from '../../../types';
import { __wp_isDoorLikePartId, __wp_isDrawerLikePartId } from './canvas_picking_door_part_helpers.js';

export type CanvasPickingHitTargetKind = 'door' | 'drawer' | 'module' | 'sketch' | 'unknown';
export type CanvasPickingHitFaceSide = 'inside' | 'outside' | 'unknown';
export type CanvasPickingHitSource = 'raycast' | 'preferred-face' | 'click' | 'manual' | 'unknown';
export type CanvasPickingHitModuleIndex = number | 'corner' | `corner:${number}`;
export type CanvasPickingHitStack = 'top' | 'bottom' | null;

export type CanvasPickingHitIdentity = {
  readonly targetKind: CanvasPickingHitTargetKind;
  readonly partId: string | null;
  readonly doorId: string | null;
  readonly drawerId: string | null;
  readonly moduleIndex: CanvasPickingHitModuleIndex | null;
  readonly moduleStack: CanvasPickingHitStack;
  readonly surfaceId: string | null;
  readonly faceSign: number | null;
  readonly faceSide: CanvasPickingHitFaceSide;
  readonly splitPart: string | null;
  readonly source: CanvasPickingHitSource;
};

type IdentityInput = {
  readonly partId?: string | null;
  readonly doorId?: string | null;
  readonly drawerId?: string | null;
  readonly moduleIndex?: CanvasPickingHitModuleIndex | null;
  readonly moduleStack?: CanvasPickingHitStack;
  readonly surfaceId?: string | null;
  readonly faceSign?: number | null;
  readonly faceSide?: CanvasPickingHitFaceSide | string | null;
  readonly splitPart?: string | null;
  readonly source?: CanvasPickingHitSource | null;
  readonly userData?: unknown;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanDoorId(value: unknown): string | null {
  const text = cleanString(value);
  if (text) return text;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return `d${value}`;
  return null;
}

function cleanNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function cleanModuleIndex(value: unknown): CanvasPickingHitModuleIndex | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (value === 'corner') return 'corner';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    if (/^corner:\d+$/.test(trimmed)) return trimmed as `corner:${number}`;
  }
  return null;
}

export function normalizeCanvasPickingModuleStack(value: unknown): CanvasPickingHitStack {
  const raw = cleanString(value)?.toLowerCase();
  if (raw === 'top' || raw === 'upper') return 'top';
  if (raw === 'bottom' || raw === 'lower') return 'bottom';
  return null;
}

export function inferCanvasPickingTargetKind(
  partId: string | null,
  drawerId: string | null,
  doorId: string | null = null
): CanvasPickingHitTargetKind {
  if (drawerId || __wp_isDrawerLikePartId(partId)) return 'drawer';
  if (doorId || __wp_isDoorLikePartId(partId)) return 'door';
  if (partId && /(?:shelf|rod|box|sketch|manual)/i.test(partId)) return 'sketch';
  return partId ? 'module' : 'unknown';
}

export function inferCanvasPickingDoorId(
  partId: string | null,
  explicitDoorId?: string | null
): string | null {
  const part = cleanString(partId);
  const explicit = cleanDoorId(explicitDoorId);
  if (explicit && explicit !== part) return explicit;
  if (!part) return explicit || null;

  const regularDoor = /^((?:lower_)?d\d+)(?:_|$)/.exec(part);
  if (regularDoor?.[1]) return regularDoor[1];

  const cornerDoor = /^((?:lower_)?corner(?:_pent)?_door_\d+)(?:_|$)/.exec(part);
  if (cornerDoor?.[1]) return cornerDoor[1];

  const sketchBoxDoor =
    /^sketch_box(?:_free)?_.*_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      part
    );
  if (sketchBoxDoor?.[1]) return sketchBoxDoor[1];

  if (__wp_isDoorLikePartId(part)) return part;
  return explicit || null;
}

export function normalizeCanvasPickingFaceSide(value: unknown): CanvasPickingHitFaceSide {
  const raw = cleanString(value)?.toLowerCase();
  if (raw === 'inside' || raw === 'inner' || raw === 'interior') return 'inside';
  if (raw === 'outside' || raw === 'outer' || raw === 'exterior') return 'outside';
  return 'unknown';
}

function inferCanvasPickingFaceSideFromSign(faceSign: number | null): CanvasPickingHitFaceSide {
  if (faceSign === -1) return 'inside';
  if (faceSign === 1) return 'outside';
  return 'unknown';
}

function inferCanvasPickingSplitPart(partId: string | null, explicitSplitPart: unknown): string | null {
  const explicit = cleanString(explicitSplitPart);
  if (explicit) return explicit;
  const part = cleanString(partId);
  if (!part) return null;
  if (/_(?:top|upper)$/i.test(part)) return 'top';
  if (/_(?:bot|bottom|lower)$/i.test(part)) return 'bottom';
  if (/_mid$/i.test(part)) return 'mid';
  if (/_full$/i.test(part)) return 'full';
  return null;
}

export function readCanvasPickingHitIdentityUserData(value: unknown): Partial<CanvasPickingHitIdentity> {
  const rec = asRecord(value);
  if (!rec) return {};
  const partId = cleanString(rec.partId) || cleanString(rec.pid) || null;
  const drawerId = cleanString(rec.drawerId) || null;
  const doorId = inferCanvasPickingDoorId(
    partId,
    cleanDoorId(rec.doorId) || cleanDoorId(rec.__wpSketchBoxDoorId) || cleanDoorId(rec.__wpDoorId)
  );
  const faceSign = cleanNumber(rec.faceSign) ?? cleanNumber(rec.normalSign) ?? null;
  const faceSide = normalizeCanvasPickingFaceSide(rec.faceSide ?? rec.side ?? rec.doorFaceSide);
  const splitPart = inferCanvasPickingSplitPart(
    partId,
    cleanString(rec.splitPart) || cleanString(rec.segment) || cleanString(rec.doorSegment)
  );
  return {
    partId,
    doorId,
    drawerId,
    moduleIndex: cleanModuleIndex(
      rec.moduleIndex ?? rec.mi ?? rec.__wpModuleIndex ?? rec.__wpSketchModuleKey
    ),
    moduleStack: normalizeCanvasPickingModuleStack(rec.moduleStack ?? rec.__wpStack ?? rec.stack),
    surfaceId: cleanString(rec.surfaceId) || cleanString(rec.surfaceKey) || null,
    faceSign,
    faceSide,
    splitPart,
  };
}

export function mergeCanvasPickingHitIdentityUserData(
  hitUserData: unknown,
  resolvedUserData: unknown
): UnknownRecord | null {
  const hit = asRecord(hitUserData);
  const resolved = asRecord(resolvedUserData);
  if (!hit && !resolved) return null;

  const merged: UnknownRecord = {
    ...(resolved || {}),
    ...(hit || {}),
  };

  const resolvedPartId = cleanString(resolved?.partId);
  const resolvedPid = cleanString(resolved?.pid);
  const resolvedDoorId = cleanString(resolved?.doorId);
  const resolvedDrawerId = cleanString(resolved?.drawerId);
  if (resolvedPartId) merged.partId = resolvedPartId;
  if (resolvedPid) merged.pid = resolvedPid;
  if (resolvedDoorId) merged.doorId = resolvedDoorId;
  if (resolvedDrawerId) merged.drawerId = resolvedDrawerId;

  return merged;
}

export function createCanvasPickingHitIdentity(input: IdentityInput): CanvasPickingHitIdentity {
  const fromUserData = readCanvasPickingHitIdentityUserData(input.userData);
  const partId = cleanString(input.partId) || fromUserData.partId || null;
  const drawerId = cleanString(input.drawerId) || fromUserData.drawerId || null;
  const doorId = inferCanvasPickingDoorId(partId, cleanDoorId(input.doorId) || fromUserData.doorId || null);
  const faceSign = cleanNumber(input.faceSign) ?? fromUserData.faceSign ?? null;
  const explicitFaceSide = normalizeCanvasPickingFaceSide(input.faceSide || fromUserData.faceSide);
  const faceSide =
    explicitFaceSide !== 'unknown' ? explicitFaceSide : inferCanvasPickingFaceSideFromSign(faceSign);
  return {
    targetKind: inferCanvasPickingTargetKind(partId, drawerId, doorId),
    partId,
    doorId,
    drawerId,
    moduleIndex: input.moduleIndex ?? fromUserData.moduleIndex ?? null,
    moduleStack: input.moduleStack ?? fromUserData.moduleStack ?? null,
    surfaceId: cleanString(input.surfaceId) || fromUserData.surfaceId || null,
    faceSign,
    faceSide,
    splitPart: inferCanvasPickingSplitPart(partId, cleanString(input.splitPart) || fromUserData.splitPart),
    source: input.source || 'unknown',
  };
}

export function createCanvasPickingDoorHoverHitIdentity(args: {
  readonly partId: string;
  readonly hitObjectUserData?: unknown;
  readonly source: Extract<CanvasPickingHitSource, 'raycast' | 'preferred-face'>;
}): CanvasPickingHitIdentity {
  return createCanvasPickingHitIdentity({
    partId: args.partId,
    userData: args.hitObjectUserData,
    source: args.source,
  });
}

export function createCanvasPickingClickHitIdentity(args: {
  readonly partId: string | null;
  readonly doorId: string | null;
  readonly drawerId: string | null;
  readonly moduleIndex: CanvasPickingHitModuleIndex | null;
  readonly moduleStack: CanvasPickingHitStack;
  readonly hitObjectUserData?: unknown;
}): CanvasPickingHitIdentity {
  return createCanvasPickingHitIdentity({
    partId: args.partId,
    doorId: args.doorId,
    drawerId: args.drawerId,
    moduleIndex: args.moduleIndex,
    moduleStack: args.moduleStack,
    userData: args.hitObjectUserData,
    source: 'click',
  });
}

export function areCanvasPickingHitIdentitiesEquivalent(
  a: CanvasPickingHitIdentity | null | undefined,
  b: CanvasPickingHitIdentity | null | undefined
): boolean {
  if (!a || !b) return false;
  return (
    a.targetKind === b.targetKind &&
    a.partId === b.partId &&
    a.doorId === b.doorId &&
    a.drawerId === b.drawerId &&
    a.moduleIndex === b.moduleIndex &&
    a.moduleStack === b.moduleStack &&
    a.surfaceId === b.surfaceId &&
    a.faceSign === b.faceSign &&
    a.faceSide === b.faceSide &&
    a.splitPart === b.splitPart
  );
}
