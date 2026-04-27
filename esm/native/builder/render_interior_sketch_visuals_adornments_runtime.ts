import type {
  InteriorGroupLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import { asValueRecord, readObject } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';
import type {
  InteriorTHREESurfaceWithSketchCornice,
  SketchAdornmentPlacementRuntime,
} from './render_interior_sketch_visuals_adornments_contracts.js';

export function prefixSketchBoxAdornmentOpsPartIds(
  ops: unknown,
  boxPid: string
): { baseRec: InteriorValueRecord | null; corniceRec: InteriorValueRecord | null } {
  const opsRec = asValueRecord(ops);
  const prefixPartId = (value: unknown): string => {
    const raw = typeof value === 'string' && value ? value : 'part';
    return `${boxPid}_${raw}`;
  };

  const baseRec = asValueRecord(opsRec?.base);
  if (baseRec && typeof baseRec.partId === 'string') baseRec.partId = prefixPartId(baseRec.partId);
  const corniceRec = asValueRecord(opsRec?.cornice);
  if (corniceRec && typeof corniceRec.partId === 'string') {
    corniceRec.partId = prefixPartId(corniceRec.partId);
  }
  const corniceSegments = Array.isArray(corniceRec?.segments) ? corniceRec.segments : [];
  for (let i = 0; i < corniceSegments.length; i++) {
    const seg = asValueRecord(corniceSegments[i]);
    if (seg && typeof seg.partId === 'string') seg.partId = prefixPartId(seg.partId);
  }

  return { baseRec, corniceRec };
}

export function createSketchAdornmentPlacementRuntime(args: {
  THREE: InteriorTHREESurface;
  holder: InteriorGroupLike;
  bodyMat: unknown;
  moduleKeyStr: string;
  boxId: string;
  getPartMaterial?: InteriorOpsCallable;
  addOutlines?: InteriorOpsCallable;
  isFreePlacement: boolean;
}): SketchAdornmentPlacementRuntime {
  const { THREE, holder, bodyMat, moduleKeyStr, boxId, getPartMaterial, addOutlines, isFreePlacement } = args;
  const outlineFn = typeof addOutlines === 'function' ? addOutlines : null;
  const corniceTHREE = readObject<InteriorTHREESurfaceWithSketchCornice>(THREE);
  const resolveMat = (partId: string) => {
    try {
      if (typeof getPartMaterial === 'function') {
        const resolved = getPartMaterial(partId);
        if (resolved) return resolved;
      }
    } catch {
      // ignore
    }
    return bodyMat;
  };
  const applyAdornmentMeta = (node: unknown, partId: string) => {
    applySketchBoxPickMetaDeep(node, partId, moduleKeyStr, boxId, {
      __wpSketchFreePlacement: isFreePlacement === true,
    });
  };

  const attachNode = (node: unknown, partId: string) => {
    const nodeRec = readObject(node);
    if (!nodeRec) return;
    applyAdornmentMeta(nodeRec, partId);
    if (outlineFn) outlineFn(nodeRec);
    holder.add?.(nodeRec);
  };

  const placeMesh = (
    mesh: unknown,
    partId: string,
    x: number,
    y: number,
    z: number,
    rotY?: number,
    flipX?: boolean
  ) => {
    const meshRec = readObject<{
      position?: { set?: (x: number, y: number, z: number) => unknown };
      rotation?: { y?: number };
      scale?: { x?: number };
    }>(mesh);
    if (!meshRec) return;
    if (meshRec.position?.set) meshRec.position.set(x, y, z);
    if (meshRec.rotation && Number.isFinite(rotY) && rotY) meshRec.rotation.y = rotY;
    if (flipX && meshRec.scale && typeof meshRec.scale.x === 'number') meshRec.scale.x *= -1;
    attachNode(meshRec, partId);
  };

  return {
    corniceTHREE,
    resolveMat,
    attachNode,
    placeMesh,
  };
}

export function createSketchAdornmentHolder(args: {
  THREE: InteriorTHREESurface;
  group: InteriorGroupLike;
  boxGeo: { centerX: number; centerZ: number };
  boxCenterY: number;
  boxHeight: number;
  baseHeight: number;
}): InteriorGroupLike {
  const { THREE, group, boxGeo, boxCenterY, boxHeight, baseHeight } = args;
  const holder = new THREE.Group();
  holder.position?.set?.(boxGeo.centerX, boxCenterY - boxHeight / 2 - baseHeight, boxGeo.centerZ);
  group.add?.(holder);
  return holder;
}
