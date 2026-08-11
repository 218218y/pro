// Corner wing door rendering/visual helpers.
//
// Keep mirror/trim/material lookup and door render bookkeeping in one place so
// split/full emitters can focus on segment sizing only.

import { CORNER_CONNECTOR_DOOR_RENDER_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import { createBuilderHingedDoorMotionMetadata } from './hinged_door_motion_metadata.js';
import type { Object3DLike, ThreeLike } from '../../../types';
import {
  hasMirrorSurfaceOnFace,
  readMirrorLayoutListForPart,
  readDoorTrimListForPart,
  resolveAdhesiveGlassKind,
  resolveEffectiveDoorStyle,
  isRemoveDoorModeFromSnapshot,
} from '../features/door_authoring/api.js';
import { readGrooveLayoutListForPart } from './door_visual_lookup_state.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { attachHingedDoorHardware } from './render_hinged_door_hardware.js';
import {
  readCurtainType,
  type GroupLike,
  type MirrorLayoutList,
  type ValueRecord,
} from './corner_wing_cell_shared.js';
import type { CornerWingDoorContext, CornerWingDoorState } from './corner_wing_cell_doors_contracts.js';

export type CornerWingDoorSegmentArgs = {
  partId: string;
  width: number;
  height: number;
  group: GroupLike;
  meshOffset: number;
  frontSign?: number;
  mirrorLayout?: MirrorLayoutList | null;
  groovePartId?: string | null;
};

function isValueRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function appendCornerDoorHingeHardware(args: {
  ctx: CornerWingDoorContext;
  state: CornerWingDoorState;
  group: GroupLike;
  partId: string;
  doorHeight: number;
  centerY: number;
  centerZ: number;
}): void {
  const { ctx, state, group, doorHeight, centerY, centerZ } = args;
  if (!(doorHeight > 0) || !ctx.hingeHardwareState) return;
  const scopedPartId =
    typeof group.userData.partId === 'string' && group.userData.partId
      ? String(group.userData.partId)
      : args.partId;

  attachHingedDoorHardware({
    THREE: ctx.THREE as unknown as ThreeLike,
    wardrobeGroup: ctx.wingGroup as unknown as Object3DLike,
    doorGroup: group as unknown as Object3DLike,
    doorOp: {
      x: 0,
      y: centerY,
      z: centerZ,
      width: state.doorW,
      height: doorHeight,
      partId: scopedPartId,
      isLeftHinge: state.isLeftHinge,
      isRemoved: false,
      isMirror: false,
      hasGroove: false,
      pivotX: state.pivotX,
      carcassMountFaceX: state.carcassMountFaceX,
    },
    state: ctx.hingeHardwareState,
  });
}

export function appendCornerDoorRenderEntry(
  ctx: CornerWingDoorContext,
  group: GroupLike,
  hingeSide: 'left' | 'right'
): void {
  if (!ctx.render) return;
  const arr = ensureArray(ctx.render, 'doorsArray');
  arr.push({
    type: 'hinged',
    group,
    hingeSide,
    isOpen: false,
  });
}

export function createCornerDoorGroup(
  ctx: CornerWingDoorContext,
  state: CornerWingDoorState,
  partId: string,
  doorHeight: number,
  handleAbsY: number,
  isRemovedDoor: boolean
): GroupLike {
  const group = new ctx.THREE.Group();
  const scopedPartId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(partId) : partId;
  group.userData = {
    ...createBuilderHingedDoorMotionMetadata({
      partId: scopedPartId,
      removed: isRemovedDoor,
      widthM: state.doorW,
      heightM: doorHeight,
      meshOffsetXM: state.meshOffset,
    }),
    __wpSourcePartId: partId,
    moduleIndex: state.cellKey,
    __wpStack: ctx.stackKey,
    __hingeLeft: state.isLeftHinge,
    __handleAbsY: handleAbsY,
    __wpFrontThickness: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
  };
  return group;
}

export function processCornerDoorVisual(
  ctx: CornerWingDoorContext,
  id: string,
  args: CornerWingDoorSegmentArgs
): boolean {
  if (ctx.removeDoorsEnabled && ctx.isDoorRemoved(id)) {
    if (isRemoveDoorModeFromSnapshot({ primary: ctx.primaryMode })) {
      const box = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(
          args.width,
          args.height,
          CORNER_CONNECTOR_DOOR_RENDER_POLICY.hitboxThicknessM
        ),
        new ctx.THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0,
          side: ctx.THREE.DoubleSide,
        })
      );
      box.position.set(args.meshOffset, 0, 0);
      args.group.add(box);
    }
    return false;
  }

  const woodMat = ctx.getCornerMat(id, ctx.frontMat);
  const curtain =
    ctx.cfg0.isMultiColorMode && ctx.getCurtain ? readScopedReaderAny(ctx, ctx.getCurtain, id) : null;
  const special = ctx.resolveSpecial(id, curtain);
  const isMirror = special === 'mirror';
  const adhesiveGlassKind = resolveAdhesiveGlassKind(special);
  const hasAdhesiveGlass = !!adhesiveGlassKind;
  const style = special === 'glass' ? 'glass' : null;
  const mirrorLayout = args.mirrorLayout ?? readMirrorLayout(ctx, id);
  const frontSign = args.frontSign === -1 ? -1 : 1;
  const hasOutsideMirrorSurface =
    (isMirror || hasAdhesiveGlass) && hasMirrorSurfaceOnFace(mirrorLayout, frontSign, frontSign);
  const rawVisualPartId = args.groovePartId ?? id;
  const groovePartId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(rawVisualPartId) : rawVisualPartId;
  const grooveLayout =
    readGrooveLayoutListForPart({
      map: ctx.readMap('grooveLayoutMap'),
      partId: id,
      scopedPartId: groovePartId,
      preferScopedOnly: ctx.stackSplitEnabled && ctx.stackKey === 'bottom',
    })?.layouts || null;
  const hasPlacedGrooveLayout = !!grooveLayout?.length;
  const overlayBlocksGrooves = hasOutsideMirrorSurface && (!isMirror || !hasPlacedGrooveLayout);
  const hasGroove =
    ctx.groovesEnabled && !overlayBlocksGrooves && !!readScopedReaderAny(ctx, ctx.getGroove, id);

  const cfgRecord = ctx.cfg0;
  const doorStyleMap = isValueRecord(cfgRecord.doorStyleMap) ? cfgRecord.doorStyleMap : undefined;
  const effectiveFrameStyle = resolveEffectiveDoorStyle(ctx.doorStyle, doorStyleMap, id);

  const vis = ctx.createDoorVisual(
    args.width,
    args.height,
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
    isMirror ? ctx.getMirrorMat() : woodMat,
    style || effectiveFrameStyle,
    hasGroove,
    isMirror,
    special === 'glass' ? readCurtainType(curtain) : null,
    isMirror || hasAdhesiveGlass ? woodMat : ctx.frontMat,
    frontSign,
    false,
    mirrorLayout,
    groovePartId,
    {
      grooveLayout,
      ...(special === 'glass' ? { glassFrameStyle: effectiveFrameStyle } : null),
      ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
    }
  );
  vis.position.set(args.meshOffset, 0, 0);
  args.group.add(vis);
  appendDoorTrimVisuals({
    App: ctx.App,
    THREE: ctx.THREE,
    group: args.group,
    partId: id,
    trims: readDoorTrimListForPart({
      map: ctx.doorTrimMap,
      partId: id,
      scopedPartId: ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(id) : id,
      preferScopedOnly: ctx.stackSplitEnabled && ctx.stackKey === 'bottom',
    }),
    doorWidth: args.width,
    doorHeight: args.height,
    doorMeshOffsetX: args.meshOffset,
    frontZ: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontTrimZOffsetM,
    faceSign: frontSign,
  });
  return true;
}

export function readMirrorLayout(ctx: CornerWingDoorContext, partId: string): MirrorLayoutList | null {
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

export function readScopedReaderAny(ctx: CornerWingDoorContext, reader: unknown, partId: string): unknown {
  return isScopedReader(reader) ? ctx.readScopedReader(reader, partId) : undefined;
}

function isScopedReader(value: unknown): value is (key: string) => unknown {
  return typeof value === 'function';
}

function ensureArray(rec: ValueRecord, key: string): unknown[] {
  const value = rec[key];
  if (Array.isArray(value)) return value;
  const arr: unknown[] = [];
  rec[key] = arr;
  return arr;
}
