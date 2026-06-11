// Raycast/runtime refs for canvas picking.
//
// This module owns raycaster/mouse ref coercion, THREE-backed lazy creation,
// runtime scratch storage, and reusable raycast scratch arrays.

import type { AppContainer } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { raycastAtNdc } from './canvas_picking_engine.js';
import type {
  MouseVectorLike,
  HitObjectLike,
  RaycastHitLike,
  RaycasterLike,
} from './canvas_picking_engine.js';
import { __wp_asRecord, __wp_reportPickingIssue } from './canvas_picking_core_support.js';
import { __wp_getCanvasPickingRuntime } from './canvas_picking_core_runtime.js';

function __wp_isRaycaster(v: unknown): v is RaycasterLike {
  const rec = __wp_asRecord(v);
  return !!rec && typeof rec.setFromCamera === 'function' && typeof rec.intersectObjects === 'function';
}

function __wp_asRaycaster(v: unknown): RaycasterLike | null {
  return __wp_isRaycaster(v) ? v : null;
}

function __wp_isMouseVector(v: unknown): v is MouseVectorLike {
  const rec = __wp_asRecord(v);
  return !!rec && typeof rec.x === 'number' && typeof rec.y === 'number';
}

function __wp_asMouseVector(v: unknown): MouseVectorLike | null {
  return __wp_isMouseVector(v) ? v : null;
}

function __wp_isHitObject(v: unknown): v is HitObjectLike {
  return __wp_asRecord(v) !== null;
}

function __wp_asHitObject(v: unknown): HitObjectLike | null {
  return __wp_isHitObject(v) ? v : null;
}

function __wp_ensurePickingRefs(App: AppContainer): {
  raycaster: RaycasterLike | null;
  mouse: MouseVectorLike | null;
} {
  if (!App || typeof App !== 'object') return { raycaster: null, mouse: null };

  const picking = __wp_getCanvasPickingRuntime(App);
  let raycaster = __wp_asRaycaster(picking.raycaster);
  let mouse = __wp_asMouseVector(picking.mouse);

  const THREE = getThreeMaybe(App);
  if ((!raycaster || !mouse) && THREE) {
    try {
      if (!raycaster) raycaster = new THREE.Raycaster();
      if (!mouse) mouse = new THREE.Vector2();
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking.runtime',
        op: 'ensurePickingRefs.createThreeRefs',
        throttleMs: 1000,
      });
    }
  }

  try {
    if (!picking.raycaster && raycaster) picking.raycaster = raycaster;
    if (!picking.mouse && mouse) picking.mouse = mouse;
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.runtime',
      op: 'ensurePickingRefs.persistRefs',
      throttleMs: 1000,
    });
  }

  return { raycaster, mouse };
}

function __wp_raycastReuse(args: {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  objects: unknown;
  recursive?: boolean;
}): RaycastHitLike[] {
  const { App, raycaster, mouse, camera, ndcX, ndcY, objects, recursive = true } = args;

  let scratch: RaycastHitLike[] | null = null;
  try {
    const picking = __wp_getCanvasPickingRuntime(App);
    const prev = picking.__intersectsScratch;
    scratch = Array.isArray(prev) ? prev : [];
    scratch.length = 0;
    picking.__intersectsScratch = scratch;
  } catch {
    scratch = [];
  }

  return raycastAtNdc({
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    objects,
    recursive,
    scratch,
  });
}

export { __wp_asRaycaster, __wp_asMouseVector, __wp_asHitObject, __wp_ensurePickingRefs, __wp_raycastReuse };
