import {
  CORNER_CONNECTOR_LAYOUT_POLICY,
  CORNER_CONNECTOR_DOOR_RENDER_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';
import { readDoorTrimMap } from '../features/door_authoring/api.js';
import type { ThreeLike } from '../../../types';
import { createBuilderHingedDoorHardwareRenderState } from './hinged_door_motion_metadata.js';

import type { CornerConnectorDoorContext } from './corner_connector_door_emit_contracts.js';
import type { CornerConnectorDoorFlowParams } from './corner_connector_door_emit_flow_contracts.js';
import {
  isCornerConnectorDoorCtx,
  readCornerConnectorRenderRecord,
} from './corner_connector_door_emit_runtime.js';

type ValueRecord = Record<string, unknown>;

export function createCornerConnectorDoorContextInternal(
  params: CornerConnectorDoorFlowParams
): CornerConnectorDoorContext | null {
  if (!isCornerConnectorDoorCtx(params.ctx)) return null;

  const { ctx, locals, helpers } = params;
  const {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    uiAny,
    splitDoors,
    doorStyle,
    groovesEnabled,
    getGroove,
    getCurtain,
    __readScopedReader,
    __resolveSpecial,
    __getMirrorMat,
    getCornerMat,
    frontMat,
    createDoorVisual,
    addOutlines,
    removeDoorsEnabled,
    __isDoorRemoved,
    config,
    __stackKey,
    __stackSplitEnabled,
    __stackScopePartKey,
  } = ctx;
  const { pts, interiorX, interiorZ, panelThick, showFrontPanel, cornerGroup, addEdgePanel } = locals;
  const {
    cfgSnapshot,
    readMap,
    readSplitPosListFromMap,
    isSplitEnabledInMap,
    isSplitExplicitInMap,
    isSplitBottomEnabledInMap,
    readModulesConfigurationListFromConfigSnapshot,
    getOrCreateCacheRecord,
    primaryMode,
    __isLongEdgeHandleVariantForPart,
    __topSplitHandleInsetForPart,
    __edgeHandleLongLiftAbsYForCornerCells,
    __edgeHandleAlignedBaseAbsYForCornerCells,
    __clampHandleAbsYForPart,
    asRecord,
    reportErrorThrottled,
  } = helpers;

  const a = pts[2];
  const b = pts[3];
  if (!(a && b)) return null;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (!Number.isFinite(len) || len <= CORNER_CONNECTOR_LAYOUT_POLICY.minFrontLengthM) {
    addEdgePanel(a, b, 'corner_pent_front', showFrontPanel);
    return null;
  }

  const ang = Math.atan2(dz, dx);
  const midX = (a.x + b.x) / 2;
  const midZ = (a.z + b.z) / 2;
  const mount = new THREE.Group();
  mount.position.set(midX, 0, midZ);
  mount.rotation.y = -ang;
  mount.userData = {
    partId: 'corner_pent_front_mount',
    moduleIndex: 'corner_pentagon',
    __wpCornerPentFront: true,
  };
  cornerGroup.add(mount);

  const gap = CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontDoorGapM;
  const doorW = Math.max(CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorMinWidthM, (len - gap) / 2);
  const effectiveTopLimit = startY + wingH - woodThick / 2;
  const doorBottomY = startY + woodThick + CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorBottomOffsetM;
  const doorH = Math.max(
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorMinHeightM,
    effectiveTopLimit - doorBottomY - CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorTopClearanceM
  );
  const doorCenterY = doorBottomY + doorH / 2;
  const zOut = panelThick / 2 + CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorOutsetM;

  const plusZ = new THREE.Vector3(0, 0, 1).applyEuler(mount.rotation).normalize();
  const insideV = new THREE.Vector3(interiorX - midX, 0, interiorZ - midZ);
  if (insideV.lengthSq() > 1e-6) insideV.normalize();

  const n1 = new THREE.Vector3(-dz / len, 0, dx / len);
  const n2 = new THREE.Vector3(dz / len, 0, -dx / len);
  const d1 = n1.dot(insideV);
  const d2 = n2.dot(insideV);
  const outwardN = (d1 <= d2 ? n1 : n2).normalize();
  const outwardZSign: 1 | -1 = plusZ.dot(outwardN) >= 0 ? 1 : -1;

  const hingeHardwareState = createBuilderHingedDoorHardwareRenderState(
    THREE as unknown as ThreeLike,
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM
  );

  const render: ValueRecord | null = readCornerConnectorRenderRecord(App, asRecord);
  const cfg0: ValueRecord = cfgSnapshot;
  const doorTrimMap = readDoorTrimMap(cfg0.doorTrimMap);
  const splitMap0 = readMap('splitDoorsMap');
  const splitBottomMap0 = readMap('splitDoorsBottomMap');
  const splitGap = CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGapM;
  const splitLineY =
    startY +
    woodThick +
    (CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGridLineIndex * (effectiveTopLimit - (startY + woodThick))) /
      CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGridDivisions;
  const bottomLineY = computeBottomLineY(
    cfg0,
    uiAny,
    startY,
    woodThick,
    doorBottomY,
    effectiveTopLimit,
    asRecord
  );

  return {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    uiAny,
    splitDoors,
    doorStyle,
    groovesEnabled,
    getGroove,
    getCurtain,
    readScopedReader: __readScopedReader,
    resolveSpecial: __resolveSpecial,
    getMirrorMat: __getMirrorMat,
    getCornerMat,
    frontMat,
    createDoorVisual,
    addOutlines,
    removeDoorsEnabled,
    isDoorRemoved: __isDoorRemoved,
    config,
    stackKey: __stackKey,
    stackSplitEnabled: !!__stackSplitEnabled,
    stackScopePartKey: __stackScopePartKey,
    pts,
    interiorX,
    interiorZ,
    panelThick,
    showFrontPanel,
    cornerGroup,
    addEdgePanel,
    readMap,
    readSplitPosListFromMap,
    isSplitEnabledInMap,
    isSplitExplicitInMap,
    isSplitBottomEnabledInMap,
    getOrCreateCacheRecord,
    primaryMode,
    isLongEdgeHandleVariantForPart: __isLongEdgeHandleVariantForPart,
    topSplitHandleInsetForPart: __topSplitHandleInsetForPart,
    edgeHandleLongLiftAbsYForCornerCells: __edgeHandleLongLiftAbsYForCornerCells,
    edgeHandleAlignedBaseAbsYForCornerCells: __edgeHandleAlignedBaseAbsYForCornerCells,
    clampHandleAbsYForPart: __clampHandleAbsYForPart,
    asRecord,
    readModulesConfigurationListFromConfigSnapshot,
    reportErrorThrottled,
    cfg0,
    doorTrimMap,
    splitMap0,
    splitBottomMap0,
    mount,
    len,
    doorW,
    effectiveTopLimit,
    doorBottomY,
    doorH,
    doorCenterY,
    zOut,
    outwardZSign,
    splitGap,
    splitLineY,
    bottomLineY,
    render,
    hingeHardwareState,
  };
}

export function computeBottomLineY(
  cfg0: ValueRecord,
  uiAny: ValueRecord,
  startY: number,
  woodThick: number,
  doorBottomY: number,
  effectiveTopLimit: number,
  asRecord: (value: unknown) => ValueRecord
): number {
  let h = CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomStorageHeightM;
  const layout = uiAny.layout ?? cfg0.layout;
  if (layout === 'storage' || layout === 'storage_shelf')
    h = CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomStorageHeightM;
  if (asRecord(cfg0.customData).storage) h = CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomStorageHeightM;
  const effectiveBottomY = startY + woodThick;
  let y = effectiveBottomY + h;
  y = Math.max(y, doorBottomY + CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomLineMinGapM);
  y = Math.min(y, effectiveTopLimit - CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomLineTopGapM);
  return y;
}
