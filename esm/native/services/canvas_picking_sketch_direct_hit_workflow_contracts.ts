import type { AppContainer, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';

export type ModuleKey = number | 'corner' | `corner:${number}` | null;

export type ManualLayoutSketchDirectHitContext = {
  App: AppContainer;
  __mt: string;
  __activeModuleKey: ModuleKey;
  topY: number;
  bottomY: number;
  mapKey: ModuleKey;
  __gridMap: UnknownRecord | null;
  totalHeight: number;
  hitY0: number;
  pad: number;
  intersects: RaycastHitLike[];
  __patchConfigForKey: (mk: ModuleKey, patchFn: (cfg: UnknownRecord) => void, meta: UnknownRecord) => unknown;
  __wp_isViewportRoot: (App: AppContainer, obj: unknown) => boolean;
  __hoverOk: boolean;
  __hoverKind: string;
  __hoverOp: string;
  __hoverRec: UnknownRecord | null;
};

export type SketchExtrasLike = UnknownRecord & {
  drawers?: UnknownRecord[];
  extDrawers?: UnknownRecord[];
  shelves?: UnknownRecord[];
};

export type CustomDataLike = UnknownRecord & {
  shelves?: boolean[];
  rods?: boolean[];
  storage?: boolean;
  shelfVariants?: string[];
};

export type SketchConfigLike = UnknownRecord & {
  sketchExtras?: SketchExtrasLike;
  intDrawersList?: unknown[];
  intDrawersSlot?: unknown;
  layout?: unknown;
  customData?: CustomDataLike;
  braceShelves?: unknown[];
  isCustom?: unknown;
  gridDivisions?: unknown;
  savedDims?: unknown;
};

export type MinimalVec3 = { x: number; y: number; z: number };
export type Vec3Ctor = new (x?: number, y?: number, z?: number) => MinimalVec3;

export type DirectHitObject = {
  parent?: unknown;
  children?: unknown[];
  position?: { y?: unknown } | null;
  getWorldPosition?: (target: MinimalVec3) => unknown;
  userData?: UnknownRecord;
};

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isSketchConfigLike(value: unknown): value is SketchConfigLike {
  return isRecord(value);
}

export function asConfig(value: unknown): SketchConfigLike {
  return isSketchConfigLike(value) ? value : {};
}
