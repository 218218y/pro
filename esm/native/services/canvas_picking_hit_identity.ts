import type { UnknownRecord } from '../../../types';

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

function cleanNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function inferCanvasPickingTargetKind(partId: string | null, drawerId: string | null): CanvasPickingHitTargetKind {
  if (drawerId || (partId && /(?:^|_)drawer_|^drawer_|^lower_|^upper_/.test(partId))) return 'drawer';
  if (partId && /^d\d+(?:_|$)/.test(partId)) return 'door';
  if (partId && /(?:shelf|rod|box|sketch|manual)/i.test(partId)) return 'sketch';
  return partId ? 'module' : 'unknown';
}

export function inferCanvasPickingDoorId(partId: string | null, explicitDoorId?: string | null): string | null {
  const explicit = cleanString(explicitDoorId);
  if (explicit) return explicit;
  const match = partId ? /^((?:corner:)?d\d+)(?:_|$)/.exec(partId) : null;
  return match ? match[1] : null;
}

export function normalizeCanvasPickingFaceSide(value: unknown): CanvasPickingHitFaceSide {
  const raw = cleanString(value)?.toLowerCase();
  if (raw === 'inside' || raw === 'inner' || raw === 'interior') return 'inside';
  if (raw === 'outside' || raw === 'outer' || raw === 'exterior') return 'outside';
  return 'unknown';
}

export function readCanvasPickingHitIdentityUserData(value: unknown): Partial<CanvasPickingHitIdentity> {
  const rec = asRecord(value);
  if (!rec) return {};
  const partId = cleanString(rec.partId) || cleanString(rec.pid) || null;
  const drawerId = cleanString(rec.drawerId) || null;
  const doorId = inferCanvasPickingDoorId(partId, cleanString(rec.doorId));
  const faceSign = cleanNumber(rec.faceSign) ?? cleanNumber(rec.normalSign) ?? null;
  const faceSide = normalizeCanvasPickingFaceSide(rec.faceSide ?? rec.side ?? rec.doorFaceSide);
  return {
    partId,
    doorId,
    drawerId,
    surfaceId: cleanString(rec.surfaceId) || cleanString(rec.surfaceKey) || null,
    faceSign,
    faceSide,
    splitPart: cleanString(rec.splitPart) || cleanString(rec.segment) || null,
  };
}

export function createCanvasPickingHitIdentity(input: IdentityInput): CanvasPickingHitIdentity {
  const fromUserData = readCanvasPickingHitIdentityUserData(input.userData);
  const partId = cleanString(input.partId) || fromUserData.partId || null;
  const drawerId = cleanString(input.drawerId) || fromUserData.drawerId || null;
  const doorId = inferCanvasPickingDoorId(partId, cleanString(input.doorId) || fromUserData.doorId || null);
  const faceSide = normalizeCanvasPickingFaceSide(input.faceSide || fromUserData.faceSide);
  return {
    targetKind: inferCanvasPickingTargetKind(partId, drawerId),
    partId,
    doorId,
    drawerId,
    moduleIndex: input.moduleIndex ?? null,
    moduleStack: input.moduleStack ?? null,
    surfaceId: cleanString(input.surfaceId) || fromUserData.surfaceId || null,
    faceSign: cleanNumber(input.faceSign) ?? fromUserData.faceSign ?? null,
    faceSide,
    splitPart: cleanString(input.splitPart) || fromUserData.splitPart || null,
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
