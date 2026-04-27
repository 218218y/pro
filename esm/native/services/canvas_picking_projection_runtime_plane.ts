import type { AppContainer } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import {
  __getThreeBoxSupport,
  __getWorldToLocalFn,
  __readFiniteVec3,
} from './canvas_picking_projection_runtime_shared.js';

function readObjectProp(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? Reflect.get(value, key) : undefined;
}

export function __wp_projectWorldPointToLocal(
  App: AppContainer,
  point: unknown,
  parentObj: unknown
): { x: number; y: number; z: number } | null {
  try {
    const p = __readFiniteVec3(point);
    const worldToLocal = __getWorldToLocalFn(parentObj);
    const three = __getThreeBoxSupport(App);
    if (!p || !worldToLocal || !three) return null;
    const v = new three.Vector3(p.x, p.y, p.z);
    worldToLocal(v);
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) return null;
    return { x: Number(v.x), y: Number(v.y), z: Number(v.z) };
  } catch {
    return null;
  }
}

export function __wp_intersectScreenWithLocalZPlane(args: {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  localParent: unknown;
  planeZ: number;
}): { x: number; y: number; z: number } | null {
  const { App, raycaster, mouse, camera, ndcX, ndcY, localParent, planeZ } = args;
  try {
    const worldToLocal = __getWorldToLocalFn(localParent);
    const three = __getThreeBoxSupport(App);
    if (!worldToLocal || !three) return null;
    mouse.x = ndcX;
    mouse.y = ndcY;
    raycaster.setFromCamera(mouse, camera);

    const ray = readObjectProp(raycaster, 'ray');
    const originRaw = __readFiniteVec3(readObjectProp(ray, 'origin'));
    const dirRaw = __readFiniteVec3(readObjectProp(ray, 'direction'));
    if (!originRaw || !dirRaw) return null;

    const originWorld = new three.Vector3(originRaw.x, originRaw.y, originRaw.z);
    const targetWorld = new three.Vector3(
      originRaw.x + dirRaw.x,
      originRaw.y + dirRaw.y,
      originRaw.z + dirRaw.z
    );

    const originLocal = originWorld.clone();
    const targetLocal = targetWorld.clone();
    worldToLocal(originLocal);
    worldToLocal(targetLocal);
    const dirLocal = targetLocal.clone().sub(originLocal);
    if (!Number.isFinite(dirLocal.z) || Math.abs(Number(dirLocal.z)) < 1e-6) return null;

    const t = (Number(planeZ) - Number(originLocal.z)) / Number(dirLocal.z);
    if (!Number.isFinite(t) || t < 0) return null;
    const hitLocal = originLocal.add(dirLocal.multiplyScalar(t));
    if (!Number.isFinite(hitLocal.x) || !Number.isFinite(hitLocal.y) || !Number.isFinite(hitLocal.z))
      return null;
    return { x: Number(hitLocal.x), y: Number(hitLocal.y), z: Number(hitLocal.z) };
  } catch {
    return null;
  }
}
