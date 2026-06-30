import { normalizeDoorStyleOverrideValue } from '../features/door_authoring/api.js';
import { readDoorVisualMapValue } from './door_visual_lookup_state.js';
import { readCurtainType } from './render_door_ops_shared_core.js';

import type {
  BuilderCreateDoorVisualFn,
  BuilderDoorVisualFrameStyle,
  Object3DLike,
  UnknownRecord,
} from '../../../types/index.js';

export type HexCellDiagonalGlassState = {
  curtainType: string | null | undefined;
  glassFrameStyle: BuilderDoorVisualFrameStyle;
};

type ScopedMapReader = (mapObj: UnknownRecord | null | undefined, partId: unknown) => unknown;

type MaybeObject3D = Object3DLike & {
  castShadow?: boolean;
  receiveShadow?: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readMapValue(args: {
  map: unknown;
  partId: string;
  readScopedMapVal?: ScopedMapReader | null;
}): unknown {
  const mapRecord = asRecord(args.map);
  if (!mapRecord) return undefined;
  if (typeof args.readScopedMapVal === 'function') {
    const scoped = args.readScopedMapVal(mapRecord, args.partId);
    if (typeof scoped !== 'undefined') return scoped;
  }
  return readDoorVisualMapValue(mapRecord, args.partId);
}

export function resolveHexCellDiagonalGlassState(args: {
  cfg: unknown;
  partId: string;
  globalDoorStyle?: unknown;
  readScopedMapVal?: ScopedMapReader | null;
  doorSpecialMap?: unknown;
}): HexCellDiagonalGlassState | null {
  const cfg = asRecord(args.cfg) || {};
  const specialMap = typeof args.doorSpecialMap !== 'undefined' ? args.doorSpecialMap : cfg.doorSpecialMap;
  const special = readMapValue({
    map: specialMap,
    partId: args.partId,
    readScopedMapVal: args.readScopedMapVal,
  });
  if (special !== 'glass') return null;

  const curtainType = readCurtainType(
    readMapValue({
      map: cfg.curtainMap,
      partId: args.partId,
      readScopedMapVal: args.readScopedMapVal,
    })
  );
  const rawFrameStyle = readMapValue({
    map: cfg.doorStyleMap,
    partId: args.partId,
    readScopedMapVal: args.readScopedMapVal,
  });

  return {
    curtainType,
    glassFrameStyle: normalizeDoorStyleOverrideValue(
      rawFrameStyle,
      normalizeDoorStyleOverrideValue(args.globalDoorStyle, 'profile')
    ),
  };
}

export function buildHexCellDiagonalUserData(args: {
  partId: string;
  width: number;
  height: number;
  moduleIndex?: unknown;
  stackKey?: unknown;
}): UnknownRecord {
  const userData: UnknownRecord = {
    partId: args.partId,
    kind: 'hexCellDiagonal',
    __wpStationaryGlassPanel: true,
    __doorWidth: args.width,
    __doorHeight: args.height,
    __mirrorRectMinX: -args.width / 2,
    __mirrorRectMaxX: args.width / 2,
    __mirrorRectMinY: -args.height / 2,
    __mirrorRectMaxY: args.height / 2,
  };
  if (typeof args.moduleIndex !== 'undefined') userData.moduleIndex = args.moduleIndex;
  if (args.stackKey === 'bottom') userData.__wpStack = 'bottom';
  return userData;
}

export function tagHexCellDiagonalObjectTree(node: unknown, userData: UnknownRecord): void {
  const root = asRecord(node);
  if (!root) return;
  const apply = (target: unknown) => {
    const rec = asRecord(target);
    if (!rec) return;
    rec.userData = { ...(asRecord(rec.userData) || {}), ...userData };
  };
  apply(root);
  const traverse = root.traverse;
  if (typeof traverse === 'function') {
    try {
      traverse.call(root, apply);
    } catch {
      // Tagging is best-effort; the root node is already tagged.
    }
  }
}

export function createHexCellDiagonalGlassVisual(args: {
  createDoorVisual?: BuilderCreateDoorVisualFn | null;
  width: number;
  height: number;
  thickness: number;
  material: unknown;
  baseMaterial: unknown;
  partId: string;
  state: HexCellDiagonalGlassState | null;
  userData: UnknownRecord;
}): MaybeObject3D | null {
  if (!args.state || typeof args.createDoorVisual !== 'function') return null;
  const visual = args.createDoorVisual(
    Math.max(0.01, args.width),
    Math.max(0.01, args.height),
    Math.max(0.001, args.thickness),
    args.material,
    'glass',
    false,
    false,
    args.state.curtainType,
    args.baseMaterial,
    1,
    false,
    null,
    args.partId,
    { glassFrameStyle: args.state.glassFrameStyle }
  ) as MaybeObject3D;
  tagHexCellDiagonalObjectTree(visual, args.userData);
  visual.castShadow = true;
  visual.receiveShadow = true;
  return visual;
}
