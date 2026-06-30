import type { MaterialLike, UnknownRecord } from '../../../types';
import {
  DEFAULT_DOOR_TRIM_DEPTH_M,
  readDoorTrimList,
  resolveDoorTrimPlacement,
} from '../features/door_trim.js';
import { DOOR_TRIM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { ensureDoorTrimMaterialCache } from '../runtime/door_trim_visuals_access.js';
import { resolveMetalFinishPalette } from '../features/finish_palette/api.js';
import type { DoorTrimSurfacePlane } from '../features/door_trim.js';
import {
  readGeometryUserDataNumber,
  readGeometryUserDataPositiveNumber,
  readGeometryUserDataSign,
} from './geometry_user_data_contracts.js';

type DoorTrimColorPalette = {
  hex: number;
  emissiveHex: number;
  metalness: number;
  roughness: number;
};

type MinimalGroupLike = {
  add: (obj: unknown) => void;
  renderOrder?: number;
};

type MinimalMeshLike = UnknownRecord & {
  position?: { set?: (x: number, y: number, z: number) => unknown };
  renderOrder?: number;
  userData?: UnknownRecord | null;
};

type MinimalThreeLike = {
  MeshStandardMaterial: new (params: UnknownRecord) => MaterialLike;
  Mesh: new (geometry: unknown, material: unknown) => MinimalMeshLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
};

type MinimalThreeRecord = UnknownRecord & MinimalThreeLike;
type MinimalGroupRecord = UnknownRecord & MinimalGroupLike;

type DoorTrimVisualArgs = {
  App: unknown;
  THREE: unknown;
  group: unknown;
  partId: string;
  trims: unknown;
  doorWidth: number;
  doorHeight: number;
  doorMeshOffsetX?: number;
  frontZ?: number;
  faceSign?: number;
  surfacePlane?: DoorTrimSurfacePlane;
  surfaceFaceCoord?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isMaterialLike(value: unknown): value is MaterialLike {
  return isRecord(value);
}

function asMaterial(value: unknown): MaterialLike | null {
  return isMaterialLike(value) ? value : null;
}

function resolveDoorTrimPalette(color: string): DoorTrimColorPalette {
  return resolveMetalFinishPalette(color);
}

function readRenderOrder(group: unknown): number {
  const rec = isRecord(group) ? group : null;
  const value = rec ? rec.renderOrder : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : 6;
}

function normalizeSurfacePlane(value: unknown): DoorTrimSurfacePlane {
  return value === 'yz' || value === 'xz' ? value : 'xy';
}

function readFinite(value: unknown, defaultValue: number): number {
  return readGeometryUserDataNumber(value) ?? defaultValue;
}

function resolveSurfaceCenterCoord(args: {
  plane: DoorTrimSurfacePlane;
  frontZ: number;
  faceSign: number;
  surfaceFaceCoord?: number;
}): number {
  const nudge = DEFAULT_DOOR_TRIM_DEPTH_M * 0.5 + DOOR_TRIM_DIMENSIONS.defaults.frontSurfaceNudgeM;
  const sign = args.faceSign < 0 ? -1 : 1;
  if (args.plane === 'xy') return (args.frontZ + nudge) * sign;
  return readFinite(args.surfaceFaceCoord, args.frontZ * sign) + sign * nudge;
}

function isMinimalThreeLike(value: unknown): value is MinimalThreeRecord {
  return (
    isRecord(value) &&
    typeof value.MeshStandardMaterial === 'function' &&
    typeof value.Mesh === 'function' &&
    typeof value.BoxGeometry === 'function'
  );
}

function isMinimalGroupLike(value: unknown): value is MinimalGroupRecord {
  return isRecord(value) && typeof value.add === 'function';
}

function asMinimalThree(value: unknown): MinimalThreeLike | null {
  return isMinimalThreeLike(value) ? value : null;
}

function asMinimalGroup(value: unknown): MinimalGroupLike | null {
  return isMinimalGroupLike(value) ? value : null;
}

function getTrimMaterial(args: {
  App: unknown;
  THREE: MinimalThreeLike;
  color: string;
}): MaterialLike | null {
  const cache = ensureDoorTrimMaterialCache(args.App);
  const key = String(args.color || 'nickel');
  const cached = asMaterial(cache[key]);
  if (cached) return cached;
  const palette = resolveDoorTrimPalette(key);
  try {
    const mat = new args.THREE.MeshStandardMaterial({
      color: palette.hex,
      metalness: palette.metalness,
      roughness: palette.roughness,
      emissive: palette.emissiveHex,
      emissiveIntensity: 0.08,
    });
    try {
      mat.__keepMaterial = true;
    } catch {
      // ignore
    }
    cache[key] = mat;
    return mat;
  } catch {
    // ignore
  }
  return null;
}

export function appendDoorTrimVisuals(args: DoorTrimVisualArgs): void {
  const {
    App,
    THREE,
    group,
    partId,
    trims,
    doorWidth,
    doorHeight,
    doorMeshOffsetX = 0,
    frontZ = DOOR_TRIM_DIMENSIONS.defaults.frontZM,
    faceSign = 1,
    surfacePlane = 'xy',
    surfaceFaceCoord,
  } = args;
  const three = asMinimalThree(THREE);
  const groupObj = asMinimalGroup(group);
  if (!three || !groupObj) return;
  const trimList = readDoorTrimList(trims);
  if (!trimList.length) return;
  const width = readGeometryUserDataPositiveNumber(doorWidth);
  const height = readGeometryUserDataPositiveNumber(doorHeight);
  if (width == null || height == null) return;
  const meshOffsetX = readGeometryUserDataNumber(doorMeshOffsetX) ?? 0;
  const resolvedFrontZ = readGeometryUserDataNumber(frontZ) ?? DOOR_TRIM_DIMENSIONS.defaults.frontZM;
  const rect = {
    minX: meshOffsetX - width / 2,
    maxX: meshOffsetX + width / 2,
    minY: -height / 2,
    maxY: height / 2,
  };
  const plane = normalizeSurfacePlane(surfacePlane);
  const face = readGeometryUserDataSign(faceSign, 1) ?? 1;
  const faceCoord = resolveSurfaceCenterCoord({
    plane,
    frontZ: resolvedFrontZ,
    faceSign: face,
    surfaceFaceCoord,
  });
  const renderOrder = readRenderOrder(groupObj);

  for (let i = 0; i < trimList.length; i += 1) {
    const entry = trimList[i];
    const placement = resolveDoorTrimPlacement({ rect, entry });
    const material = getTrimMaterial({ App, THREE: three, color: placement.color });
    if (!material) continue;
    try {
      let geometry: unknown;
      let px = placement.centerX;
      let py = placement.centerY;
      let pz = faceCoord;
      if (plane === 'yz') {
        geometry = new three.BoxGeometry(DEFAULT_DOOR_TRIM_DEPTH_M, placement.height, placement.width);
        px = faceCoord;
        py = placement.centerY;
        pz = placement.centerX;
      } else if (plane === 'xz') {
        geometry = new three.BoxGeometry(placement.width, DEFAULT_DOOR_TRIM_DEPTH_M, placement.height);
        px = placement.centerX;
        py = faceCoord;
        pz = placement.centerY;
      } else {
        geometry = new three.BoxGeometry(placement.width, placement.height, DEFAULT_DOOR_TRIM_DEPTH_M);
      }
      const mesh = new three.Mesh(geometry, material);
      mesh.position?.set?.(px, py, pz);
      mesh.renderOrder = renderOrder + 1;
      mesh.userData = {
        ...(isRecord(mesh.userData) ? mesh.userData : {}),
        partId,
        __wpDoorTrim: true,
        __wpDoorTrimId: entry.id,
        __wpDoorTrimSurfacePlane: plane,
      };
      groupObj.add(mesh);
    } catch {
      // ignore
    }
  }
}
