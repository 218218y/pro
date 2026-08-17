import type {
  RoomArchitectureConfigLike,
  RoomOpeningKind,
  RoomWallId,
  RoomWallOpeningLike,
} from '../../../types';

export const MIN_ROOM_OPENING_SIZE_CM = 20;
export const ROOM_OPENING_COLLISION_REASON = 'המיקום חופף לחלון או דלת קיימים';

const OPENING_COLLISION_EPSILON_M = 0.001;
const WALL_OCCLUSION_EPSILON_M = 0.002;
const PREVIEW_WALL_DEPTH_M = 0.205;

type UnknownOpeningInput = {
  kind: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
};

export type RoomOpeningPlacementInput = {
  kind: RoomOpeningKind;
  widthCm?: number | null;
  heightCm?: number | null;
};

export type RoomOpeningPlacementDraft = Readonly<{
  kind: RoomOpeningKind;
  widthCm: number;
  heightCm: number;
}>;

export type RoomOpeningPlacementSurface = Readonly<{
  wall: RoomWallId;
  axis: 'x' | 'z';
  startCoord: number;
  usableLength: number;
  wallHeight: number;
  interiorFaceCoord: number;
  inwardNormalX: -1 | 0 | 1;
  inwardNormalZ: -1 | 0 | 1;
}>;

export type RoomOpeningPlacementPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type RoomOpeningPlacementClearancesCm = Readonly<{
  start: number;
  end: number;
  top: number;
  bottom: number;
}>;

export type RoomOpeningPlacementPreview = Readonly<{
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}>;

export type RoomOpeningPlacementPlan = Readonly<{
  opening: RoomWallOpeningLike;
  blockedReason: string | null;
  clearancesCm: RoomOpeningPlacementClearancesCm;
  preview: RoomOpeningPlacementPreview;
}>;

export type RoomOpeningWardrobeObstacle = Readonly<{
  distance: number | null;
}>;

export type RoomOpeningArchitectureMutationPlan = Readonly<{
  nextArchitecture: RoomArchitectureConfigLike;
}>;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function finiteCoercedNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundCm(value: number): number {
  return Math.round(value * 10) / 10;
}

function isRoomOpeningKind(value: unknown): value is RoomOpeningKind {
  return value === 'window' || value === 'door';
}

function isValidSurface(surface: RoomOpeningPlacementSurface): boolean {
  return (
    (surface.wall === 'back' || surface.wall === 'left' || surface.wall === 'right') &&
    (surface.axis === 'x' || surface.axis === 'z') &&
    finiteNumber(surface.startCoord) != null &&
    finiteNumber(surface.usableLength) != null &&
    surface.usableLength > 0 &&
    finiteNumber(surface.wallHeight) != null &&
    surface.wallHeight > 0 &&
    finiteNumber(surface.interiorFaceCoord) != null &&
    (surface.inwardNormalX === -1 || surface.inwardNormalX === 0 || surface.inwardNormalX === 1) &&
    (surface.inwardNormalZ === -1 || surface.inwardNormalZ === 0 || surface.inwardNormalZ === 1)
  );
}

function readExistingOpeningRect(
  item: unknown,
  surface: RoomOpeningPlacementSurface
): { a0: number; a1: number; y0: number; y1: number } | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const opening = item as Partial<RoomWallOpeningLike>;
  if (opening.wall !== surface.wall) return null;

  const widthCm = finiteCoercedNumber(opening.widthCm) ?? 0;
  const heightCm = finiteCoercedNumber(opening.heightCm) ?? 0;
  const widthM = Math.min(Math.max(MIN_ROOM_OPENING_SIZE_CM, widthCm) / 100, surface.usableLength);
  const heightM = Math.min(Math.max(MIN_ROOM_OPENING_SIZE_CM, heightCm) / 100, surface.wallHeight);
  const maxOffset = Math.max(0, surface.usableLength - widthM);
  const maxBottom = Math.max(0, surface.wallHeight - heightM);
  const offsetAlongCm = finiteCoercedNumber(opening.offsetAlongCm) ?? 0;
  const bottomOffsetCm = finiteCoercedNumber(opening.bottomOffsetCm) ?? 0;
  const a0 = clamp(offsetAlongCm / 100, 0, maxOffset);
  const y0 = opening.kind === 'door' ? 0 : clamp(bottomOffsetCm / 100, 0, maxBottom);

  return { a0, a1: a0 + widthM, y0, y1: y0 + heightM };
}

function openingsOverlap(
  candidate: { a0: number; a1: number; y0: number; y1: number },
  existing: { a0: number; a1: number; y0: number; y1: number }
): boolean {
  return (
    candidate.a0 < existing.a1 - OPENING_COLLISION_EPSILON_M &&
    candidate.a1 > existing.a0 + OPENING_COLLISION_EPSILON_M &&
    candidate.y0 < existing.y1 - OPENING_COLLISION_EPSILON_M &&
    candidate.y1 > existing.y0 + OPENING_COLLISION_EPSILON_M
  );
}

export function createRoomOpeningPlacementDraft(
  input: UnknownOpeningInput
): RoomOpeningPlacementDraft | null {
  if (!isRoomOpeningKind(input.kind)) return null;
  const defaultWidth = input.kind === 'door' ? 90 : 120;
  const defaultHeight = input.kind === 'door' ? 210 : 100;
  const widthCm = Math.max(MIN_ROOM_OPENING_SIZE_CM, finiteNumber(input.widthCm) ?? defaultWidth);
  const heightCm = Math.max(MIN_ROOM_OPENING_SIZE_CM, finiteNumber(input.heightCm) ?? defaultHeight);
  return { kind: input.kind, widthCm: roundCm(widthCm), heightCm: roundCm(heightCm) };
}

export function resolveRoomOpeningPlacementPlan(args: {
  draft: RoomOpeningPlacementDraft;
  surface: RoomOpeningPlacementSurface;
  point: RoomOpeningPlacementPoint;
  existing: readonly RoomWallOpeningLike[];
}): RoomOpeningPlacementPlan | null {
  const { draft, surface, point } = args;
  if (!isRoomOpeningKind(draft.kind) || !isValidSurface(surface)) return null;
  if (finiteNumber(point.x) == null || finiteNumber(point.y) == null || finiteNumber(point.z) == null) {
    return null;
  }
  const draftWidthCm = finiteNumber(draft.widthCm);
  const draftHeightCm = finiteNumber(draft.heightCm);
  if (
    draftWidthCm == null ||
    draftHeightCm == null ||
    draftWidthCm < MIN_ROOM_OPENING_SIZE_CM ||
    draftHeightCm < MIN_ROOM_OPENING_SIZE_CM
  ) {
    return null;
  }

  const widthM = Math.min(draftWidthCm / 100, surface.usableLength);
  const heightM = Math.min(draftHeightCm / 100, surface.wallHeight);
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

  const candidateRect = {
    a0: offsetAlongM,
    a1: offsetAlongM + widthM,
    y0: bottomM,
    y1: bottomM + heightM,
  };
  const blocked = args.existing.some(item => {
    const existingRect = readExistingOpeningRect(item, surface);
    return existingRect != null && openingsOverlap(candidateRect, existingRect);
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
    blockedReason: blocked ? ROOM_OPENING_COLLISION_REASON : null,
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

export function isRoomOpeningTargetOccludedByWardrobe(
  targetDistance: number | null,
  wardrobeObstacle: RoomOpeningWardrobeObstacle | null
): boolean {
  if (!wardrobeObstacle) return false;
  if (targetDistance == null || wardrobeObstacle.distance == null) return true;
  return wardrobeObstacle.distance + WALL_OCCLUSION_EPSILON_M < targetDistance;
}

export function planRoomOpeningAddition(args: {
  current: RoomArchitectureConfigLike;
  placement: RoomOpeningPlacementPlan;
  openingId: string;
}): RoomOpeningArchitectureMutationPlan | null {
  const openingId = args.openingId.trim();
  if (!openingId || args.placement.blockedReason) return null;
  const openings = Array.isArray(args.current.openings) ? args.current.openings : [];
  const opening: RoomWallOpeningLike = { ...args.placement.opening, id: openingId };
  return {
    nextArchitecture: {
      ...args.current,
      openings: [...openings, opening],
    },
  };
}

export function planRoomOpeningRemoval(args: {
  current: RoomArchitectureConfigLike;
  openingId: string;
}): RoomOpeningArchitectureMutationPlan | null {
  const openingId = args.openingId.trim();
  if (!openingId) return null;
  const openings = Array.isArray(args.current.openings) ? args.current.openings : [];
  const nextOpenings = openings.filter(opening => opening.id !== openingId);
  if (nextOpenings.length === openings.length) return null;
  return {
    nextArchitecture: {
      ...args.current,
      openings: nextOpenings,
    },
  };
}
