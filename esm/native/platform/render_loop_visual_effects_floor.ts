import type { AppContainer } from '../../../types';

import { assertThreeViaDeps } from '../runtime/three_access.js';

import {
  readCameraWithMotion,
  readFloor,
  readNodeLookup,
  readAnyRecord,
  readVec3Ctor,
  type Vec3Obj,
  type VisualDeps,
} from './render_loop_visual_effects_shared.js';

export function autoHideRenderLoopRoomFloor(
  App: AppContainer,
  deps: Pick<
    VisualDeps,
    | 'asRecord'
    | 'getCamera'
    | 'getRoomGroup'
    | 'getScene'
    | 'getRenderSlot'
    | 'setRenderSlot'
    | 'readAutoHideFloorCache'
    | 'writeAutoHideFloorCache'
    | 'readRuntimeScalarOrDefaultFromApp'
  >
): void {
  const cam = readCameraWithMotion(deps.getCamera(App));
  if (!cam || typeof cam !== 'object' || typeof cam.getWorldPosition !== 'function') return;

  const roomGroup = deps.getRoomGroup(App);
  const scene = deps.getScene(App);
  const floorCache = deps.readAutoHideFloorCache(App);

  const rg = readNodeLookup(roomGroup);
  const scn = readNodeLookup(scene);

  let floor = null;
  const cachedFloor0 = floorCache.floor;
  const cachedRg = floorCache.roomKey;
  const cachedScn = floorCache.sceneKey;
  const canUseCachedFloor =
    cachedFloor0 &&
    typeof cachedFloor0 === 'object' &&
    cachedRg === roomGroup &&
    cachedScn === scene &&
    !!readFloor(cachedFloor0) &&
    typeof readAnyRecord(cachedFloor0)?.visible !== 'undefined';

  if (canUseCachedFloor) {
    floor = readFloor(cachedFloor0);
  } else {
    const floor0 = rg
      ? rg.getObjectByName('smartFloor') || rg.getObjectByName('floor')
      : scn
        ? scn.getObjectByName('smartFloor') || scn.getObjectByName('floor')
        : null;
    floor = readFloor(floor0);
    deps.writeAutoHideFloorCache(App, floor, roomGroup, scene);
  }

  if (!floor || typeof floor.visible === 'undefined') return;

  if (deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) {
    floor.visible = false;
    return;
  }

  const THREE = deps.asRecord(
    assertThreeViaDeps(App, 'platform/render_loop_visual_effects.autoHideFloor'),
    {}
  );
  const Vec3 = THREE['Vector3'];
  if (typeof Vec3 !== 'function') return;

  let vFloor: Vec3Obj | null = null;
  let vCam: Vec3Obj | null = null;
  const vFloor0 = deps.getRenderSlot<Vec3Obj>(App, '__wpAutoHideFloorVecFloor');
  const vCam0 = deps.getRenderSlot<Vec3Obj>(App, '__wpAutoHideFloorVecCam');
  if (vFloor0 && typeof vFloor0 === 'object' && vCam0 && typeof vCam0 === 'object') {
    vFloor = vFloor0;
    vCam = vCam0;
  } else {
    const Vec3Ctor = readVec3Ctor(Vec3);
    if (!Vec3Ctor) return;
    vFloor = new Vec3Ctor();
    vCam = new Vec3Ctor();
    deps.setRenderSlot(App, '__wpAutoHideFloorVecFloor', vFloor);
    deps.setRenderSlot(App, '__wpAutoHideFloorVecCam', vCam);
  }

  const ud = deps.asRecord(floor.userData, {});
  floor.userData = ud;
  if (typeof ud['__wpBaseVisible'] !== 'boolean') ud['__wpBaseVisible'] = !!floor.visible;

  if (typeof floor.updateMatrixWorld === 'function') floor.updateMatrixWorld(true);
  if (typeof cam.updateMatrixWorld === 'function') cam.updateMatrixWorld(true);

  floor.getWorldPosition(vFloor);
  cam.getWorldPosition(vCam);

  const floorY = Number.isFinite(vFloor.y) ? vFloor.y : 0;
  const camY = Number.isFinite(vCam.y) ? vCam.y : 0;
  const hideEps = 0.0002;
  const showEps = 0.001;

  const wasHidden = !!ud['__wpAutoHideHidden'];
  let shouldHide = wasHidden;
  if (wasHidden) {
    if (camY > floorY + showEps) shouldHide = false;
  } else if (camY < floorY - hideEps) {
    shouldHide = true;
  }

  ud['__wpAutoHideHidden'] = shouldHide;
  floor.visible = shouldHide ? false : !!ud['__wpBaseVisible'];
}
