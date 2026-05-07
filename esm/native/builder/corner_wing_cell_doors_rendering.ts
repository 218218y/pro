// Corner wing door rendering/visual helpers.
//
// Keep mirror/trim/material lookup and door render bookkeeping in one place so
// split/full emitters can focus on segment sizing only.

import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readMirrorLayoutListForPart } from '../features/mirror_layout.js';
import { readDoorTrimListForPart } from '../features/door_trim.js';
import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
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
    partId: scopedPartId,
    __wpSourcePartId: partId,
    moduleIndex: state.cellKey,
    __wpStack: ctx.stackKey,
    __doorWidth: state.doorW,
    __doorHeight: doorHeight,
    __hingeLeft: state.isLeftHinge,
    __doorMeshOffsetX: state.meshOffset,
    __handleAbsY: handleAbsY,
    __wpFrontThickness: CORNER_WING_DIMENSIONS.connector.frontThicknessM,
    __wpDoorRemoved: isRemovedDoor,
  };
  return group;
}

export function processCornerDoorVisual(
  ctx: CornerWingDoorContext,
  id: string,
  args: CornerWingDoorSegmentArgs
): boolean {
  if (ctx.removeDoorsEnabled && ctx.isDoorRemoved(id)) {
    const removeDoorMode = ctx.MODES.REMOVE_DOOR || 'remove_door';
    if (removeDoorMode && ctx.isPrimaryMode(ctx.App, removeDoorMode)) {
      const box = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(args.width, args.height, CORNER_WING_DIMENSIONS.connector.hitboxThicknessM),
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
    ctx.getCfg(ctx.App).isMultiColorMode && ctx.getCurtain
      ? readScopedReaderAny(ctx, ctx.getCurtain, id)
      : null;
  const special = ctx.resolveSpecial(id, curtain);
  const isMirror = special === 'mirror';
  const hasGroove = ctx.groovesEnabled && !isMirror && !!readScopedReaderAny(ctx, ctx.getGroove, id);
  const style = special === 'glass' ? 'glass' : null;
  const mirrorLayout = args.mirrorLayout ?? readMirrorLayout(ctx, id);
  const rawVisualPartId = args.groovePartId ?? id;
  const groovePartId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(rawVisualPartId) : rawVisualPartId;
  const frontSign = Number.isFinite(args.frontSign) ? Number(args.frontSign) : 1;

  const cfgRecord = ctx.asRecord(ctx.getCfg(ctx.App));
  const doorStyleMap = isValueRecord(cfgRecord.doorStyleMap) ? cfgRecord.doorStyleMap : undefined;
  const effectiveFrameStyle = resolveEffectiveDoorStyle(ctx.doorStyle, doorStyleMap, id);

  const vis = ctx.createDoorVisual(
    args.width,
    args.height,
    CORNER_WING_DIMENSIONS.connector.frontThicknessM,
    isMirror ? ctx.getMirrorMat() : woodMat,
    style || effectiveFrameStyle,
    hasGroove && !isMirror,
    isMirror,
    readCurtainType(curtain),
    isMirror ? woodMat : ctx.frontMat,
    frontSign,
    false,
    mirrorLayout,
    groovePartId,
    special === 'glass' ? { glassFrameStyle: effectiveFrameStyle } : null
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
    frontZ: CORNER_WING_DIMENSIONS.connector.frontTrimZOffsetM,
    faceSign: frontSign,
  });
  return true;
}

export function readMirrorLayout(ctx: CornerWingDoorContext, partId: string): MirrorLayoutList | null {
  const map = ctx.readMapOrEmpty(ctx.App, 'mirrorLayoutMap');
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
