import { resolveAdhesiveGlassKind } from '../features/door_authoring/api.js';
import { resolveConfiguredHandleColor } from './handle_finish_runtime.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import {
  createBuilderHingedDoorHardwareRenderState,
  createBuilderHingedDoorMotionMetadata,
  patchBuilderHingedDoorMotionMetadata,
} from './hinged_door_motion_metadata.js';
import { readCanonicalPositiveIntegerText } from './build_flow_readers.js';
import {
  HINGED_DOOR_RENDER_POLICY,
  HINGED_DOOR_SHARED_PIVOT_DIMENSION_POLICY,
} from '../../shared/dimensions/door_system_policy.js';
import { attachHingedDoorHardware } from './render_hinged_door_hardware.js';
import type { BuilderRenderDoorDeps, HingedDoorOpLike } from './render_door_ops_shared.js';
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
  resolveGrooveLayout,
  resolveDoorVisualStyle,
} from './render_door_ops_shared.js';

type PreparedHingedDoorOp = Readonly<{
  doorOp: HingedDoorOpLike;
  removed: boolean;
}>;

function verticallyOverlapsForSharedPivot(a: HingedDoorOpLike, b: HingedDoorOpLike): boolean {
  const aMinY = a.y - a.height / 2;
  const aMaxY = a.y + a.height / 2;
  const bMinY = b.y - b.height / 2;
  const bMaxY = b.y + b.height / 2;
  const overlap = Math.min(aMaxY, bMaxY) - Math.max(aMinY, bMinY);
  return overlap > HINGED_DOOR_SHARED_PIVOT_DIMENSION_POLICY.verticalOverlapToleranceM;
}

function hasOpposingSharedPivotDoor(
  current: HingedDoorOpLike,
  visibleDoorOps: readonly HingedDoorOpLike[]
): boolean {
  const pivotX = current.pivotX;
  if (typeof pivotX !== 'number' || !Number.isFinite(pivotX)) return false;

  for (const other of visibleDoorOps) {
    if (other === current || other.isLeftHinge === current.isLeftHinge) continue;
    const otherPivotX = other.pivotX;
    if (typeof otherPivotX !== 'number' || !Number.isFinite(otherPivotX)) continue;
    if (
      Math.abs(otherPivotX - pivotX) > HINGED_DOOR_SHARED_PIVOT_DIMENSION_POLICY.sharedPivotMatchToleranceM
    ) {
      continue;
    }
    if (!verticallyOverlapsForSharedPivot(current, other)) continue;
    return true;
  }
  return false;
}

function resolveSharedPivotDoorBodyDirection(doorOp: HingedDoorOpLike): 1 | -1 {
  const meshOffsetX = doorOp.meshOffsetX;
  if (typeof meshOffsetX === 'number' && Number.isFinite(meshOffsetX) && Math.abs(meshOffsetX) > 1e-9) {
    return meshOffsetX > 0 ? 1 : -1;
  }
  return doorOp.isLeftHinge ? 1 : -1;
}

function resolveHingedDoorHardwareOpenFrameOffsetX(
  doorOp: HingedDoorOpLike,
  visibleDoorOps: readonly HingedDoorOpLike[],
  openAngleRad: number
): number {
  if (!hasOpposingSharedPivotDoor(doorOp, visibleDoorOps)) return 0;
  const finiteOpenAngle = Number.isFinite(openAngleRad) ? Math.abs(openAngleRad) : 0;
  const openingProgress = Math.sin(Math.min(finiteOpenAngle, Math.PI / 2));
  return (
    resolveSharedPivotDoorBodyDirection(doorOp) *
    HINGED_DOOR_SHARED_PIVOT_DIMENSION_POLICY.lateralThrowPerLeafM *
    openingProgress
  );
}

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
    const hingedDims = HINGED_DOOR_RENDER_POLICY;
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
    const hingeHardwareState = createBuilderHingedDoorHardwareRenderState(THREE, hingedDims.visualThicknessM);
    const preparedDoorOps: PreparedHingedDoorOp[] = [];
    for (let i = 0; i < ops.length; i++) {
      const doorOp = readHingedDoorOp(ops[i]);
      if (!doorOp) continue;
      let removed = doorOp.isRemoved;
      if (!removed && removeDoorsEnabled && isDoorRemoved) removed = !!isDoorRemoved(doorOp.partId);
      preparedDoorOps.push({ doorOp, removed: !!(removeDoorsEnabled && removed) });
    }
    const visibleDoorOps = preparedDoorOps.filter(entry => !entry.removed).map(entry => entry.doorOp);
    const hardwareOpenAngleRad = hingeHardwareState?.policy.carcassConnectorOpenAngleRad ?? 0;

    for (const { doorOp, removed } of preparedDoorOps) {
      const partId = doorOp.partId;

      let doorIdNum: number | null = null;
      const match = /^d(\d+)(?=_|$)/.exec(partId);
      doorIdNum = readCanonicalPositiveIntegerText(match?.[1]);

      const group = new THREE.Group();
      group.userData = {
        ...createBuilderHingedDoorMotionMetadata({
          partId,
          widthM: doorOp.width,
          heightM: doorOp.height,
          meshOffsetXM: doorOp.meshOffsetX || 0,
        }),
        moduleIndex: doorOp.moduleIndex,
        __wpModuleDoors: doorOp.moduleDoors,
        __wpStack: wpStackArg,
        __hingeLeft: doorOp.isLeftHinge,
        __wpDoorId: doorIdNum,
      };
      __reg(App, partId, group, 'hingedDoor');
      group.position.set(doorOp.pivotX || 0, doorOp.y || 0, doorOp.z || 0);

      patchBuilderHingedDoorMotionMetadata(group.userData, { removed });

      if (removed) {
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
      const adhesiveGlassKind = resolveAdhesiveGlassKind(doorOp.adhesiveGlassKind);
      let mirrorMat = null;
      if (isMirrorDoor) {
        mirrorMat = getMirrorMaterial({
          App,
          THREE,
          materialSnapshot: { cfgSnapshot: cfg, sketchMode: args?.sketchMode === true },
        });
        if (!mirrorMat) mirrorMat = woodMat;
        if (woodMat === mirrorMat) woodMat = globalFrontMat || woodMat;
      }

      let visual;
      if (createDoorVisual) {
        const effectiveDoorStyle = resolveDoorVisualStyle(doorOp.style, doorStyle, cfg.doorStyleMap, partId);
        const glassFrameStyleRaw =
          doorOp.style === 'glass' ? resolveDoorVisualStyle(null, doorStyle, cfg.doorStyleMap, partId) : null;
        const glassFrameStyle = glassFrameStyleRaw === 'glass' ? null : glassFrameStyleRaw;
        const doorVisualOptions = {
          grooveLayout: resolveGrooveLayout(cfg, partId),
          ...(glassFrameStyle ? { glassFrameStyle } : null),
          ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
        };
        visual = createDoorVisual(
          (doorOp.width || 0) - hingedDims.visualWidthClearanceM,
          (doorOp.height || 0) - hingedDims.visualHeightClearanceM,
          hingedDims.visualThicknessM,
          isMirrorDoor ? mirrorMat : woodMat,
          effectiveDoorStyle,
          doorOp.hasGroove,
          isMirrorDoor,
          readCurtainType(doorOp.curtain),
          isMirrorDoor || adhesiveGlassKind ? woodMat : globalFrontMat,
          1,
          false,
          resolveMirrorLayout(cfg, partId),
          partId,
          Object.keys(doorVisualOptions).length ? doorVisualOptions : null
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
      attachHingedDoorHardware({
        THREE,
        wardrobeGroup,
        doorGroup: group,
        doorOp,
        state: hingeHardwareState,
        openFrameOffsetX: resolveHingedDoorHardwareOpenFrameOffsetX(
          doorOp,
          visibleDoorOps,
          hardwareOpenAngleRad
        ),
      });
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
