import { resolveConfiguredHandleColor } from './handle_finish_runtime.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { BuilderRenderDoorDeps } from './render_door_ops_shared.js';
import {
  isFunction,
  isRecord,
  readCurtainType,
  readDoorConfig,
  readDoorVisualFactory,
  readGetHandleType,
  readGetPartMaterial,
  readHandleMeshFactory,
  readHingedDoorOp,
  readObject3D,
  readThreeLike,
  resolveHandleType,
  resolveMirrorLayout,
  resolveDoorVisualStyle,
} from './render_door_ops_shared.js';

export function createApplyHingedDoorsOps(deps: BuilderRenderDoorDeps) {
  const {
    __app,
    __ops,
    __wardrobeGroup,
    __reg,
    __doors,
    __markSplitHoverPickablesDirty,
    __tagAndTrackMirrorSurfaces,
    getMirrorMaterial,
  } = deps;

  return function applyHingedDoorsOps(argsIn: unknown): boolean {
    const App = __app(argsIn);
    __ops(App);
    const args = isRecord(argsIn) ? argsIn : null;
    const THREE = readThreeLike(args?.THREE);
    const ops = args && Array.isArray(args.ops) ? args.ops : null;

    if (!THREE || !ops) return false;
    const hingedDims = DOOR_SYSTEM_DIMENSIONS.hinged;
    const wardrobeGroup = readObject3D(__wardrobeGroup(App));
    if (!wardrobeGroup) return false;

    const createDoorVisual = readDoorVisualFactory(args?.createDoorVisual);
    const createHandleMesh = readHandleMeshFactory(args?.createHandleMesh);
    const getPartMaterial = readGetPartMaterial(args?.getPartMaterial);
    const getHandleType = readGetHandleType(args?.getHandleType);
    const cfg = readDoorConfig(args?.cfg);
    const handlesMap = isRecord(cfg?.handlesMap) ? cfg.handlesMap : null;
    const doorStyle = args?.doorStyle;
    const globalFrontMat = args?.globalFrontMat;
    const removeDoorsEnabled = args?.removeDoorsEnabled === true;
    const isRemoveDoorMode = args?.isRemoveDoorMode === true;
    const isDoorRemoved = isFunction(args?.isDoorRemoved) ? args.isDoorRemoved : null;
    const wpStackArg = typeof args?.__wpStack === 'string' ? String(args.__wpStack) : undefined;

    for (let i = 0; i < ops.length; i++) {
      const doorOp = readHingedDoorOp(ops[i]);
      if (!doorOp) continue;

      const partId = doorOp.partId;

      let doorIdNum: number | null = null;
      const match = /^d(\d+)/.exec(String(partId));
      if (match?.[1]) {
        const parsedDoorId = Number(match[1]);
        if (Number.isFinite(parsedDoorId) && parsedDoorId > 0) doorIdNum = parsedDoorId;
      }

      const group = new THREE.Group();
      group.userData = {
        partId,
        moduleIndex: doorOp.moduleIndex,
        __wpStack: wpStackArg,
        __doorWidth: doorOp.width,
        __doorHeight: doorOp.height,
        __hingeLeft: doorOp.isLeftHinge,
        __doorMeshOffsetX: doorOp.meshOffsetX || 0,
        __wpDoorId: doorIdNum,
      };
      __reg(App, partId, group, 'hingedDoor');
      group.position.set(doorOp.pivotX || 0, doorOp.y || 0, doorOp.z || 0);

      let removed = doorOp.isRemoved;
      if (!removed && removeDoorsEnabled && isDoorRemoved) {
        removed = !!isDoorRemoved(partId);
      }
      group.userData.__wpDoorRemoved = !!(removeDoorsEnabled && removed);

      if (removeDoorsEnabled && removed) {
        if (isRemoveDoorMode) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(
              (doorOp.width || 0) - hingedDims.visualWidthClearanceM,
              (doorOp.height || 0) - hingedDims.visualHeightClearanceM,
              hingedDims.visualThicknessM
            ),
            new THREE.MeshBasicMaterial({
              color: 0xff0000,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
            })
          );
          box.position.set(doorOp.meshOffsetX || 0, 0, 0);
          group.add(box);
        }
        wardrobeGroup.add(group);
        const removedDoorsArray = __doors(App);
        if (Array.isArray(removedDoorsArray)) {
          removedDoorsArray.push({
            group,
            hingeSide: doorOp.isLeftHinge ? 'left' : 'right',
            type: 'hinged',
          });
          __markSplitHoverPickablesDirty(App);
        }
        continue;
      }

      let woodMat = getPartMaterial ? getPartMaterial(partId) : null;
      const isMirrorDoor = doorOp.isMirror;
      let mirrorMat = null;
      if (isMirrorDoor) {
        mirrorMat = getMirrorMaterial({ App, THREE });
        if (!mirrorMat) mirrorMat = woodMat;
        if (woodMat === mirrorMat) woodMat = globalFrontMat || woodMat;
      }

      let visual;
      if (createDoorVisual) {
        const effectiveDoorStyle = resolveDoorVisualStyle(doorOp.style, doorStyle, cfg.doorStyleMap, partId);
        const glassFrameStyleRaw =
          doorOp.style === 'glass' ? resolveDoorVisualStyle(null, doorStyle, cfg.doorStyleMap, partId) : null;
        const glassFrameStyle = glassFrameStyleRaw === 'glass' ? null : glassFrameStyleRaw;
        visual = createDoorVisual(
          (doorOp.width || 0) - hingedDims.visualWidthClearanceM,
          (doorOp.height || 0) - hingedDims.visualHeightClearanceM,
          hingedDims.visualThicknessM,
          isMirrorDoor ? mirrorMat : woodMat,
          effectiveDoorStyle,
          doorOp.hasGroove,
          isMirrorDoor,
          readCurtainType(doorOp.curtain),
          isMirrorDoor ? woodMat : globalFrontMat,
          1,
          false,
          resolveMirrorLayout(cfg, partId),
          partId,
          glassFrameStyle ? { glassFrameStyle } : null
        );
      } else {
        visual = new THREE.Mesh(
          new THREE.BoxGeometry(
            (doorOp.width || 0) - hingedDims.visualWidthClearanceM,
            (doorOp.height || 0) - hingedDims.visualHeightClearanceM,
            hingedDims.visualThicknessM
          ),
          isMirrorDoor ? mirrorMat : woodMat
        );
      }

      visual.position.set(doorOp.meshOffsetX || 0, 0, 0);
      group.add(visual);
      appendDoorTrimVisuals({
        App,
        THREE,
        group,
        partId,
        trims: cfg.doorTrimMap ? cfg.doorTrimMap[partId] : undefined,
        doorWidth: doorOp.width,
        doorHeight: doorOp.height,
        doorMeshOffsetX: doorOp.meshOffsetX || 0,
        frontZ: hingedDims.frontTrimZOffsetM,
        faceSign: 1,
      });
      if (isMirrorDoor) __tagAndTrackMirrorSurfaces(App, visual, mirrorMat);

      const absY = typeof doorOp.handleAbsY === 'number' ? doorOp.handleAbsY : null;
      group.userData.__handleAbsY = absY;

      const allowHandle = doorOp.allowHandle !== false;
      if (allowHandle && absY !== null && createHandleMesh) {
        const handleType = resolveHandleType(getHandleType, partId);
        const handleMesh = createHandleMesh(handleType, doorOp.width, doorOp.height, doorOp.isLeftHinge, {
          handleColor: resolveConfiguredHandleColor(handlesMap, partId),
        });
        if (handleMesh) {
          handleMesh.position.y = absY - group.position.y;
          group.add(handleMesh);
        }
      }

      wardrobeGroup.add(group);
      const doorsArray = __doors(App);
      if (Array.isArray(doorsArray)) {
        doorsArray.push({
          group,
          hingeSide: doorOp.isLeftHinge ? 'left' : 'right',
          type: 'hinged',
        });
        __markSplitHoverPickablesDirty(App);
      }
    }

    return true;
  };
}
