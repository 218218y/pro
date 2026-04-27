import type { MaterialLike, UnknownRecord } from '../../../types';
import {
  DEFAULT_DOOR_TRIM_DEPTH_M,
  readDoorTrimList,
  resolveDoorTrimPlacement,
} from '../features/door_trim.js';
import { ensureDoorTrimMaterialCache } from '../runtime/door_trim_visuals_access.js';

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
  switch (color) {
    case 'silver':
      return { hex: 0xcfd5dd, emissiveHex: 0x20252c, metalness: 0.42, roughness: 0.22 };
    case 'gold':
      return { hex: 0xe5c66b, emissiveHex: 0x3b2d09, metalness: 0.5, roughness: 0.2 };
    case 'black':
      return { hex: 0x1c1d20, emissiveHex: 0x000000, metalness: 0.32, roughness: 0.3 };
    case 'nickel':
    default:
      return { hex: 0xe5e9ef, emissiveHex: 0x20242b, metalness: 0.28, roughness: 0.2 };
  }
}

function readRenderOrder(group: unknown): number {
  const rec = isRecord(group) ? group : null;
  const value = rec ? rec.renderOrder : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : 6;
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
    frontZ = 0.011,
    faceSign = 1,
  } = args;
  const three = asMinimalThree(THREE);
  const groupObj = asMinimalGroup(group);
  if (!three || !groupObj) return;
  const trimList = readDoorTrimList(trims);
  if (!trimList.length) return;
  if (!(doorWidth > 0) || !(doorHeight > 0)) return;
  const rect = {
    minX: doorMeshOffsetX - doorWidth / 2,
    maxX: doorMeshOffsetX + doorWidth / 2,
    minY: -doorHeight / 2,
    maxY: doorHeight / 2,
  };
  const face = faceSign < 0 ? -1 : 1;
  const z = (frontZ + DEFAULT_DOOR_TRIM_DEPTH_M * 0.5 + 0.0005) * face;
  const renderOrder = readRenderOrder(groupObj);

  for (let i = 0; i < trimList.length; i += 1) {
    const entry = trimList[i];
    const placement = resolveDoorTrimPlacement({ rect, entry });
    const material = getTrimMaterial({ App, THREE: three, color: placement.color });
    if (!material) continue;
    try {
      const mesh = new three.Mesh(
        new three.BoxGeometry(placement.width, placement.height, DEFAULT_DOOR_TRIM_DEPTH_M),
        material
      );
      mesh.position?.set?.(placement.centerX, placement.centerY, z);
      mesh.renderOrder = renderOrder + 1;
      mesh.userData = {
        ...(isRecord(mesh.userData) ? mesh.userData : {}),
        partId,
        __wpDoorTrim: true,
        __wpDoorTrimId: entry.id,
      };
      groupObj.add(mesh);
    } catch {
      // ignore
    }
  }
}
