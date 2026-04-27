import type { AppContainer } from '../../../types/index.js';

import {
  __buildRoomFloorSignature,
  __ensureRoomDesignService,
  __forEachMaterial,
  _asObject,
  type MaterialLike,
  type RoomAppliedState,
  type RoomDesignServiceState,
  type RoomNodeLike,
  type TextureLike,
} from './room_internal_shared.js';

export const ROOM_VISUAL_RESET_WALL_COLOR = '#ffffff';
export const ROOM_VISUAL_RESET_WALL_HEX = 0xffffff;
export const ROOM_VISUAL_RESET_FLOOR_SIGNATURE = __buildRoomFloorSignature('none', {
  color: ROOM_VISUAL_RESET_WALL_COLOR,
});

type RoomDesignAppliedStateCarrier = RoomDesignServiceState & {
  __wpAppliedFloorSignature?: unknown;
  __wpAppliedWallColor?: unknown;
};

type RoomMaterialAppliedStateCarrier = MaterialLike & {
  __wpRoomAppliedFloorSignature?: unknown;
  __wpRoomAppliedWallColor?: unknown;
};

function __readAppliedRoomVisualStateCarrier(A: AppContainer): RoomDesignAppliedStateCarrier {
  return __ensureRoomDesignService(A) as RoomDesignAppliedStateCarrier;
}

function __asRoomMaterialAppliedStateCarrier(
  material: MaterialLike | null | undefined
): RoomMaterialAppliedStateCarrier | null {
  return _asObject<RoomMaterialAppliedStateCarrier>(material);
}

export function readAppliedRoomVisualState(A: AppContainer): RoomAppliedState {
  const roomDesign = __readAppliedRoomVisualStateCarrier(A);
  const floorSignature =
    typeof roomDesign.__wpAppliedFloorSignature === 'string' && roomDesign.__wpAppliedFloorSignature
      ? roomDesign.__wpAppliedFloorSignature
      : null;
  const wallColor =
    typeof roomDesign.__wpAppliedWallColor === 'string' && roomDesign.__wpAppliedWallColor
      ? roomDesign.__wpAppliedWallColor
      : null;
  return { floorSignature, wallColor };
}

export function readAppliedRoomFloorSignature(A: AppContainer): string | null {
  return readAppliedRoomVisualState(A).floorSignature;
}

export function markAppliedRoomFloorSignature(A: AppContainer, signature: string | null): void {
  const roomDesign = __readAppliedRoomVisualStateCarrier(A);
  roomDesign.__wpAppliedFloorSignature = signature || null;
}

export function readAppliedRoomWallColor(A: AppContainer): string | null {
  return readAppliedRoomVisualState(A).wallColor;
}

export function markAppliedRoomWallColor(A: AppContainer, color: string | null): void {
  const roomDesign = __readAppliedRoomVisualStateCarrier(A);
  roomDesign.__wpAppliedWallColor = color || null;
}

export function markAppliedRoomVisualState(A: AppContainer, next: Partial<RoomAppliedState>): void {
  const current = readAppliedRoomVisualState(A);
  const floorSignature = Object.prototype.hasOwnProperty.call(next, 'floorSignature')
    ? (next.floorSignature ?? null)
    : (current.floorSignature ?? null);
  const wallColor = Object.prototype.hasOwnProperty.call(next, 'wallColor')
    ? (next.wallColor ?? null)
    : (current.wallColor ?? null);
  markAppliedRoomFloorSignature(A, floorSignature);
  markAppliedRoomWallColor(A, wallColor);
}

export function markAppliedRoomVisualDefaults(A: AppContainer): void {
  markAppliedRoomVisualState(A, {
    floorSignature: ROOM_VISUAL_RESET_FLOOR_SIGNATURE,
    wallColor: ROOM_VISUAL_RESET_WALL_COLOR,
  });
}

export function clearAppliedRoomVisualState(A: AppContainer): void {
  markAppliedRoomVisualState(A, {
    floorSignature: null,
    wallColor: null,
  });
}

export function isAppliedRoomVisualDefaultState(A: AppContainer): boolean {
  const applied = readAppliedRoomVisualState(A);
  return (
    applied.floorSignature === ROOM_VISUAL_RESET_FLOOR_SIGNATURE &&
    applied.wallColor === ROOM_VISUAL_RESET_WALL_COLOR
  );
}

export function disposeRoomTexture(texture: unknown): void {
  const tex = _asObject<TextureLike>(texture);
  if (!tex || typeof tex.dispose !== 'function') return;
  try {
    tex.dispose();
  } catch {
    // ignore dispose failures while replacing room textures
  }
}

export function setRoomMaterialTexture(
  material: MaterialLike | null | undefined,
  nextTexture: unknown
): void {
  if (!material) return;
  const prevTexture = material.map;
  material.map = nextTexture || null;
  if (prevTexture && prevTexture !== material.map) disposeRoomTexture(prevTexture);
}

export function syncRoomNodeVisibility(
  node: { visible?: boolean } | null | undefined,
  visible: boolean
): boolean {
  if (!node) return false;
  if (node.visible === visible) return false;
  node.visible = visible;
  return true;
}

export function readRoomMaterialFloorSignature(material: MaterialLike | null | undefined): string | null {
  const carrier = __asRoomMaterialAppliedStateCarrier(material);
  return typeof carrier?.__wpRoomAppliedFloorSignature === 'string' && carrier.__wpRoomAppliedFloorSignature
    ? carrier.__wpRoomAppliedFloorSignature
    : null;
}

export function markRoomMaterialFloorSignature(
  material: MaterialLike | null | undefined,
  signature: string | null
): void {
  const carrier = __asRoomMaterialAppliedStateCarrier(material);
  if (!carrier) return;
  carrier.__wpRoomAppliedFloorSignature = signature || null;
}

export function readRoomMaterialWallColor(material: MaterialLike | null | undefined): string | null {
  const carrier = __asRoomMaterialAppliedStateCarrier(material);
  return typeof carrier?.__wpRoomAppliedWallColor === 'string' && carrier.__wpRoomAppliedWallColor
    ? carrier.__wpRoomAppliedWallColor
    : null;
}

export function markRoomMaterialWallColor(
  material: MaterialLike | null | undefined,
  color: string | null
): void {
  const carrier = __asRoomMaterialAppliedStateCarrier(material);
  if (!carrier) return;
  carrier.__wpRoomAppliedWallColor = color || null;
}

export function areRoomNodeMaterialsTaggedWithWallColor(
  node: RoomNodeLike | null | undefined,
  color: string
): boolean {
  let sawMaterial = false;
  let matches = true;
  __forEachMaterial(node, material => {
    sawMaterial = true;
    if (readRoomMaterialWallColor(material) !== color) matches = false;
  });
  return sawMaterial && matches;
}

export function syncRoomNodeMaterialsWallColor(
  node: RoomNodeLike | null | undefined,
  color: string
): boolean {
  let changed = false;
  __forEachMaterial(node, material => {
    if (readRoomMaterialWallColor(material) === color) return;
    material.color?.set?.(color);
    material.needsUpdate = true;
    markRoomMaterialWallColor(material, color);
    changed = true;
  });
  return changed;
}

export function resetRoomFloorMaterialToDefault(material: MaterialLike | null | undefined): void {
  if (!material) return;
  setRoomMaterialTexture(material, null);
  material.color?.setHex?.(ROOM_VISUAL_RESET_WALL_HEX);
  material.needsUpdate = true;
  markRoomMaterialFloorSignature(material, ROOM_VISUAL_RESET_FLOOR_SIGNATURE);
}
