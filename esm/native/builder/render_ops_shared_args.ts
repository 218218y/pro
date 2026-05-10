import { assertApp } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';

import type {
  AnyMap,
  AppContainer,
  BackPanelSeg,
  BoardArgs,
  DrawerShadowPlaneArgs,
  HandleMeshOpts,
  ModuleHitBoxArgs,
  RenderCommonArgs,
  RenderThreeLike,
} from './render_ops_shared_contracts.js';

export function __asMap(x: unknown): AnyMap | null {
  return asRecord<AnyMap>(x);
}

export function __asObject<T extends object = AnyMap>(x: unknown): T | null {
  return asRecord<T>(x);
}

function __isRenderThreeLike(value: unknown): value is RenderThreeLike {
  const rec = __asMap(value);
  return !!(
    rec &&
    typeof rec.Mesh === 'function' &&
    typeof rec.Group === 'function' &&
    typeof rec.BoxGeometry === 'function' &&
    typeof rec.MeshStandardMaterial === 'function' &&
    typeof rec.MeshBasicMaterial === 'function' &&
    typeof rec.Vector3 === 'function' &&
    typeof rec.Box3 === 'function'
  );
}

export function __three(THREE: unknown): RenderThreeLike | null {
  if (!THREE) return null;
  const t = typeof THREE;
  if (t !== 'object' && t !== 'function') return null;
  return __isRenderThreeLike(THREE) ? THREE : null;
}

export function __commonArgs(x: unknown): RenderCommonArgs {
  const map = __asMap(x);
  const next: RenderCommonArgs = {};
  if (map && 'App' in map) next.App = assertApp(map.App, 'native/builder/render_ops.commonArgs');
  if (map && 'THREE' in map) next.THREE = __three(map.THREE);
  const addOutlines = map?.addOutlines;
  if (typeof addOutlines === 'function') next.addOutlines = (obj: unknown) => addOutlines(obj);
  return next;
}

export function __handleMeshOpts(x: unknown): HandleMeshOpts {
  return __commonArgs(x);
}

export function __boardArgs(x: unknown): BoardArgs {
  const map = __asMap(x);
  const next: BoardArgs = __commonArgs(x);
  if (!map) return next;
  if (typeof map.w === 'number' && Number.isFinite(map.w)) next.w = map.w;
  if (typeof map.h === 'number' && Number.isFinite(map.h)) next.h = map.h;
  if (typeof map.d === 'number' && Number.isFinite(map.d)) next.d = map.d;
  if (typeof map.x === 'number' && Number.isFinite(map.x)) next.x = map.x;
  if (typeof map.y === 'number' && Number.isFinite(map.y)) next.y = map.y;
  if (typeof map.z === 'number' && Number.isFinite(map.z)) next.z = map.z;
  if ('mat' in map) next.mat = map.mat;
  if ('partId' in map) next.partId = map.partId;
  if ('sketchMode' in map) next.sketchMode = !!map.sketchMode;
  return next;
}

export function __moduleHitBoxArgs(x: unknown): ModuleHitBoxArgs {
  const map = __asMap(x);
  const next: ModuleHitBoxArgs = __commonArgs(x);
  if (!map) return next;
  if (typeof map.modWidth === 'number' && Number.isFinite(map.modWidth)) next.modWidth = map.modWidth;
  if (typeof map.cabinetBodyHeight === 'number' && Number.isFinite(map.cabinetBodyHeight)) {
    next.cabinetBodyHeight = map.cabinetBodyHeight;
  }
  if (typeof map.D === 'number' && Number.isFinite(map.D)) next.D = map.D;
  if (typeof map.x === 'number' && Number.isFinite(map.x)) next.x = map.x;
  if (typeof map.y === 'number' && Number.isFinite(map.y)) next.y = map.y;
  if (typeof map.z === 'number' && Number.isFinite(map.z)) next.z = map.z;
  if ('moduleIndex' in map) next.moduleIndex = map.moduleIndex;
  if ('__wpStack' in map) next.__wpStack = map.__wpStack;
  return next;
}

export function __drawerShadowPlaneArgs(x: unknown): DrawerShadowPlaneArgs {
  const map = __asMap(x);
  const next: DrawerShadowPlaneArgs = __commonArgs(x);
  if (!map) return next;
  if (typeof map.externalW === 'number' && Number.isFinite(map.externalW)) next.externalW = map.externalW;
  if (typeof map.shadowH === 'number' && Number.isFinite(map.shadowH)) next.shadowH = map.shadowH;
  if (typeof map.shadowY === 'number' && Number.isFinite(map.shadowY)) next.shadowY = map.shadowY;
  if (typeof map.externalCenterX === 'number' && Number.isFinite(map.externalCenterX)) {
    next.externalCenterX = map.externalCenterX;
  }
  if (typeof map.D === 'number' && Number.isFinite(map.D)) next.D = map.D;
  if (typeof map.frontZ === 'number' && Number.isFinite(map.frontZ)) next.frontZ = map.frontZ;
  if ('shadowMat' in map) next.shadowMat = map.shadowMat;
  return next;
}

export function __number(x: unknown, defaultValue = 0): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : defaultValue;
}

export function __isBackPanelSeg(v: unknown): v is BackPanelSeg {
  const r = __asObject<AnyMap>(v);
  if (!r) return false;
  if (r.kind !== 'back_panel') return false;
  return (
    typeof r.width === 'number' &&
    typeof r.height === 'number' &&
    typeof r.depth === 'number' &&
    typeof r.x === 'number' &&
    typeof r.y === 'number' &&
    typeof r.z === 'number'
  );
}

export function __app(ctx: unknown): AppContainer {
  const ctxMap = __asMap(ctx);
  const appValue = ctxMap ? ctxMap.App : null;
  return assertApp(appValue, 'native/builder/render_ops.app');
}
