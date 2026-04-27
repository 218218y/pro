import type { AppContainer } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorMeshLike,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import { asMesh, asValueRecord, readObject, toFiniteNumber } from './render_interior_sketch_shared.js';

export function applySketchModulePickMeta(
  mesh: InteriorMeshLike | null,
  partId: string,
  moduleKey: string,
  extraUserData?: InteriorValueRecord,
  opts?: { door?: boolean }
): void {
  if (!mesh) return;
  const userData = readObject<InteriorValueRecord>(mesh.userData) || {};
  userData.partId = partId;
  userData.__wpSketchModuleKey = moduleKey;
  if (moduleKey) userData.moduleIndex = moduleKey;
  if (opts?.door === true) userData.__wpSketchBoxDoor = true;
  if (extraUserData) {
    for (const [key, value] of Object.entries(extraUserData)) userData[key] = value;
  }
  mesh.userData = userData;
}

export function applySketchModulePickMetaDeep(
  root: unknown,
  partId: string,
  moduleKey: string,
  extraUserData?: InteriorValueRecord,
  opts?: { door?: boolean }
): void {
  const applyMeta = (node: unknown) => {
    const rec = readObject<InteriorGroupLike>(node) || asMesh(node);
    if (!rec) return;
    const userData = readObject<InteriorValueRecord>(rec.userData) || {};
    userData.partId = partId;
    userData.__wpSketchModuleKey = moduleKey;
    if (moduleKey) userData.moduleIndex = moduleKey;
    if (opts?.door === true) userData.__wpSketchBoxDoor = true;
    if (extraUserData) {
      for (const [key, value] of Object.entries(extraUserData)) userData[key] = value;
    }
    rec.userData = userData;
  };

  const rootRec = readObject<InteriorGroupLike>(root) || asMesh(root);
  if (!rootRec) return;
  applyMeta(rootRec);
  rootRec.traverse?.((node: unknown) => {
    if (node !== rootRec) applyMeta(node);
  });
}

export function applySketchBoxPickMeta(
  mesh: InteriorMeshLike | null,
  partId: string,
  moduleKey: string,
  boxId: string,
  opts?: { door?: boolean }
): void {
  if (!mesh) return;
  const userData = readObject<InteriorValueRecord>(mesh.userData) || {};
  userData.partId = partId;
  userData.__wpSketchBoxId = boxId;
  userData.__wpSketchModuleKey = moduleKey;
  if (moduleKey) userData.moduleIndex = moduleKey;
  if (opts?.door === true) userData.__wpSketchBoxDoor = true;
  mesh.userData = userData;
}

export function applySketchBoxPickMetaDeep(
  root: unknown,
  partId: string,
  moduleKey: string,
  boxId: string,
  extraUserData?: InteriorValueRecord,
  opts?: { door?: boolean }
): void {
  const applyMeta = (node: unknown) => {
    const rec = readObject<InteriorGroupLike>(node) || asMesh(node);
    if (!rec) return;
    const userData = readObject<InteriorValueRecord>(rec.userData) || {};
    userData.partId = partId;
    userData.__wpSketchBoxId = boxId;
    userData.__wpSketchModuleKey = moduleKey;
    if (moduleKey) userData.moduleIndex = moduleKey;
    if (opts?.door === true) userData.__wpSketchBoxDoor = true;
    if (extraUserData) {
      for (const [key, value] of Object.entries(extraUserData)) userData[key] = value;
    }
    rec.userData = userData;
  };

  const rootRec = readObject<InteriorGroupLike>(root) || asMesh(root);
  if (!rootRec) return;
  applyMeta(rootRec);
  rootRec.traverse?.((node: unknown) => {
    if (node !== rootRec) applyMeta(node);
  });
}

export const __SKETCH_BOX_DOOR_MOTION_SEED_KEY = '__wpSketchBoxDoorMotionSeed';

export function getSketchBoxDoorMotionSeedKey(
  moduleKey: string | null | undefined,
  boxId: string,
  doorId?: string | null
): string {
  const scope = moduleKey == null || moduleKey === '' ? '__free__' : String(moduleKey);
  const suffix = doorId != null && doorId !== '' ? `::${String(doorId)}` : '';
  return `${scope}::${String(boxId)}${suffix}`;
}

export function consumeSketchBoxDoorMotionSeed(
  App: AppContainer,
  moduleKey: string,
  boxId: string,
  doorId?: string | null
): { rotationY: number; nextOpen: boolean } | null {
  const appRec = asValueRecord(App);
  const store = asValueRecord(appRec ? appRec[__SKETCH_BOX_DOOR_MOTION_SEED_KEY] : null);
  if (!store) return null;
  const key = getSketchBoxDoorMotionSeedKey(moduleKey, boxId, doorId);
  const rec = asValueRecord(store[key]);
  if (!rec) return null;
  delete store[key];
  const rotationY = toFiniteNumber(rec.rotationY);
  if (rotationY == null) return null;
  return {
    rotationY,
    nextOpen: rec.nextOpen === true,
  };
}
