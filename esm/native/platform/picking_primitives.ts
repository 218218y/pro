// Native ESM implementation of picking primitives.
//
// Installs app.picking.{raycaster,mouse} using the canonical THREE dep seam.
// Pure ESM: no global app access.

import type { RaycasterRuntimeLike, ThreeLike, UnknownRecord, Vector2Like } from '../../../types';
import { installStableSurfaceSlot } from '../runtime/stable_surface_slots.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

const PICKING_RAYCASTER_CANONICAL_KEY = '__wpCanonicalRaycaster';
const PICKING_MOUSE_CANONICAL_KEY = '__wpCanonicalMouse';

type PickingSurface = UnknownRecord & {
  raycaster?: RaycasterRuntimeLike;
  mouse?: Vector2Like;
  __wpPickingLoaded?: boolean;
  __wpMissingTHREE?: boolean;
  [PICKING_RAYCASTER_CANONICAL_KEY]?: RaycasterRuntimeLike;
  [PICKING_MOUSE_CANONICAL_KEY]?: Vector2Like;
};

type PickingAppLike = UnknownRecord & {
  picking?: PickingSurface;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPickingSurface(value: unknown): value is PickingSurface {
  return isRecord(value);
}

function isRaycasterLike(value: unknown): value is RaycasterRuntimeLike {
  return (
    isRecord(value) &&
    typeof value.setFromCamera === 'function' &&
    typeof value.intersectObjects === 'function'
  );
}

function isVector2Like(value: unknown): value is Vector2Like {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function assertApp(app: unknown): asserts app is PickingAppLike {
  if (!isRecord(app)) {
    throw new Error('[WardrobePro][ESM] installPickingPrimitives(app) requires an app object');
  }
}

export function installPickingPrimitives(app: PickingAppLike): PickingSurface {
  assertApp(app);

  const root = app;
  const picking = isPickingSurface(root.picking) ? root.picking : (root.picking = {});
  const THREE: ThreeLike = assertThreeViaDeps(root, 'platform/picking_primitives.THREE');

  installStableSurfaceSlot<RaycasterRuntimeLike>(
    picking,
    'raycaster',
    PICKING_RAYCASTER_CANONICAL_KEY,
    isRaycasterLike,
    () => new THREE.Raycaster()
  );
  installStableSurfaceSlot<Vector2Like>(
    picking,
    'mouse',
    PICKING_MOUSE_CANONICAL_KEY,
    isVector2Like,
    () => new THREE.Vector2()
  );

  picking.__wpPickingLoaded = true;
  picking.__wpMissingTHREE = false;

  return picking;
}
