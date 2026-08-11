import { CORNER_CONNECTOR_DOOR_RENDER_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import type { MirrorLayoutList, Object3DLike, ThreeLike } from '../../../types';
import {
  hasMirrorSurfaceOnFace,
  readMirrorLayoutListForPart,
  readDoorTrimListForPart,
  resolveEffectiveDoorStyle,
  isRemoveDoorModeFromSnapshot,
  resolveAdhesiveGlassKind,
} from '../features/door_authoring/api.js';
import { readGrooveLayoutListForPart } from './door_visual_lookup_state.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { attachHingedDoorHardware } from './render_hinged_door_hardware.js';

import type {
  CornerConnectorDoorContext,
  CornerConnectorDoorState,
} from './corner_connector_door_emit_contracts.js';

type ValueRecord = Record<string, unknown>;
type HingeGroupLike = { userData?: unknown };

export function pushCornerConnectorDoorSegmentVisual(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState,
  partId: string,
  segH: number,
  segY: number,
  handleAbsY: number
): void {
  const hinge = new ctx.THREE.Group();
  const scopedPartId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(partId) : partId;
  const isRemovedDoor =
    ctx.removeDoorsEnabled && (ctx.isDoorRemoved(partId) || ctx.isDoorRemoved(state.doorBaseId));

  hinge.position.set(state.pivotX, segY, ctx.zOut * ctx.outwardZSign);
  hinge.userData = {
    partId: scopedPartId,
    __wpSourcePartId: partId,
    moduleIndex: 'corner_pentagon',
    __wpCornerPentDoor: true,
    __wpCornerPentDoorPair: 'corner_pent_pair',
    noGlobalOpen: true,
    __doorWidth: ctx.doorW,
    __doorHeight: segH,
    __doorMeshOffsetX: state.meshOffset,
    __wpFrontThickness: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
    __hingeLeft: state.hingeSide === 'left',
    __handleAbsY: handleAbsY,
    __wpStack: ctx.stackKey,
    __wpDoorRemoved: isRemovedDoor,
    __handleZSign: ctx.outwardZSign,
  };

  if (isRemovedDoor) {
    maybeAppendRemovedDoorHitbox(ctx, hinge, state, segH);
    ctx.mount.add(hinge);
    appendCornerConnectorRenderEntry(ctx, hinge, state.hingeSide);
    return;
  }

  const woodMat = ctx.getCornerMat(partId, ctx.frontMat);
  const curtain =
    ctx.cfg0.isMultiColorMode && ctx.getCurtain ? readScopedReaderAny(ctx, ctx.getCurtain, partId) : null;
  const special = ctx.resolveSpecial(partId, curtain);
  const isMirror = special === 'mirror';
  const adhesiveGlassKind = resolveAdhesiveGlassKind(special);
  const hasAdhesiveGlass = !!adhesiveGlassKind;
  const mirrorLayout = readCornerConnectorMirrorLayout(ctx, partId);
  const hasOutsideMirrorSurface =
    (isMirror || hasAdhesiveGlass) &&
    hasMirrorSurfaceOnFace(mirrorLayout, ctx.outwardZSign, ctx.outwardZSign);
  const grooveLayout =
    readGrooveLayoutListForPart({
      map: ctx.readMap('grooveLayoutMap'),
      partId,
      scopedPartId,
      preferScopedOnly: ctx.stackSplitEnabled && ctx.stackKey === 'bottom',
    })?.layouts || null;
  const hasPlacedGrooveLayout = !!grooveLayout?.length;
  const overlayBlocksGrooves = hasOutsideMirrorSurface && (!isMirror || !hasPlacedGrooveLayout);
  const hasGroove =
    ctx.groovesEnabled && !overlayBlocksGrooves && !!readScopedReaderAny(ctx, ctx.getGroove, partId);
  const style = special === 'glass' ? 'glass' : null;
  const effectiveFrameStyle = resolveEffectiveDoorStyle(ctx.doorStyle, readDoorStyleMap(ctx.cfg0), partId);

  const vis = ctx.createDoorVisual(
    Math.max(
      CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualMinWidthM,
      ctx.doorW - CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualWidthClearanceM
    ),
    Math.max(
      CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualMinHeightM,
      segH - CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualHeightClearanceM
    ),
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
    isMirror ? ctx.getMirrorMat() : woodMat,
    style || effectiveFrameStyle,
    hasGroove,
    isMirror,
    special === 'glass' ? readCurtainTypeLocal(curtain) : null,
    isMirror || hasAdhesiveGlass ? woodMat : ctx.frontMat,
    ctx.outwardZSign,
    true,
    mirrorLayout,
    scopedPartId,
    {
      grooveLayout,
      ...(special === 'glass' ? { glassFrameStyle: effectiveFrameStyle } : null),
      ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
    }
  );
  vis.position.set(state.meshOffset, 0, 0);
  hinge.add(vis);
  appendDoorTrimVisuals({
    App: ctx.App,
    THREE: ctx.THREE,
    group: hinge,
    partId,
    trims: readDoorTrimListForPart({
      map: ctx.doorTrimMap,
      partId,
      scopedPartId: ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(partId) : partId,
      preferScopedOnly: ctx.stackSplitEnabled && ctx.stackKey === 'bottom',
    }),
    doorWidth: ctx.doorW,
    doorHeight: segH,
    doorMeshOffsetX: state.meshOffset,
    frontZ: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontTrimZOffsetM,
    faceSign: ctx.outwardZSign,
  });
  ctx.addOutlines(vis);

  const hingeUserData = ctx.asRecord(hinge.userData);
  hingeUserData.__wpDoorOpenDirSign = ctx.outwardZSign;

  ctx.mount.add(hinge);
  if (ctx.hingeHardwareState) {
    attachHingedDoorHardware({
      THREE: ctx.THREE as unknown as ThreeLike,
      wardrobeGroup: ctx.mount as unknown as Object3DLike,
      doorGroup: hinge as unknown as Object3DLike,
      doorOp: {
        x: 0,
        y: segY,
        z: ctx.zOut * ctx.outwardZSign,
        width: ctx.doorW,
        height: segH,
        partId: scopedPartId,
        isLeftHinge: state.hingeSide === 'left',
        isRemoved: false,
        isMirror: false,
        hasGroove: false,
        pivotX: state.pivotX,
        carcassMountFaceX: 0,
      },
      state: ctx.hingeHardwareState,
      frontSign: ctx.outwardZSign,
    });
  }
  appendCornerConnectorRenderEntry(ctx, hinge, state.hingeSide);
}

function maybeAppendRemovedDoorHitbox(
  ctx: CornerConnectorDoorContext,
  hinge: InstanceType<CornerConnectorDoorContext['THREE']['Group']>,
  state: CornerConnectorDoorState,
  segH: number
): void {
  if (!isRemoveDoorModeFromSnapshot({ primary: ctx.primaryMode })) return;
  const box = new ctx.THREE.Mesh(
    new ctx.THREE.BoxGeometry(ctx.doorW, segH, CORNER_CONNECTOR_DOOR_RENDER_POLICY.hitboxThicknessM),
    new ctx.THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: ctx.THREE.DoubleSide,
    })
  );
  box.position.set(state.meshOffset, 0, 0);
  hinge.add(box);
}

function appendCornerConnectorRenderEntry(
  ctx: CornerConnectorDoorContext,
  hinge: HingeGroupLike,
  hingeSide: 'left' | 'right'
): void {
  if (!ctx.render) return;
  ensureArray(ctx.render, 'doorsArray').push({
    type: 'hinged',
    group: hinge,
    hingeSide,
    isOpen: false,
    noGlobalOpen: true,
    __wpCornerPentDoorPair: 'corner_pent_pair',
  });
}

function readCornerConnectorMirrorLayout(
  ctx: CornerConnectorDoorContext,
  partId: string
): MirrorLayoutList | null {
  const map = ctx.readMap('mirrorLayoutMap');
  const scopedPartId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(partId) : partId;
  const layouts = readMirrorLayoutListForPart({
    map,
    partId,
    scopedPartId,
    preferScopedOnly: ctx.stackSplitEnabled && ctx.stackKey === 'bottom' && scopedPartId !== partId,
  });
  return layouts.length ? layouts : null;
}

function readScopedReaderAny(
  ctx: Pick<CornerConnectorDoorContext, 'readScopedReader'>,
  reader: unknown,
  partId: string
): unknown {
  return isScopedReader(reader) ? ctx.readScopedReader(reader, partId) : undefined;
}

function isScopedReader(reader: unknown): reader is (key: string) => unknown {
  return typeof reader === 'function';
}

function readCurtainTypeLocal(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return undefined;
}

function ensureArray(rec: ValueRecord, key: string): unknown[] {
  const value = rec[key];
  if (Array.isArray(value)) return value;
  const next: unknown[] = [];
  rec[key] = next;
  return next;
}

function readDoorStyleMap(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const doorStyleMap = Reflect.get(value, 'doorStyleMap');
  if (!doorStyleMap || typeof doorStyleMap !== 'object' || Array.isArray(doorStyleMap)) return undefined;
  return Object.fromEntries(Object.entries(doorStyleMap));
}
