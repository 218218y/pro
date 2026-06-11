import type { MirrorLayoutList } from '../../../types';
import { readMirrorLayoutListForPart } from '../features/mirror_layout.js';
import { readDoorTrimListForPart } from '../features/door_trim.js';
import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';

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
    __wpFrontThickness: 0.018,
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
    ctx.getCfg(ctx.App).isMultiColorMode && ctx.getCurtain
      ? readScopedReaderAny(ctx, ctx.getCurtain, partId)
      : null;
  const special = ctx.resolveSpecial(partId, curtain);
  const isMirror = special === 'mirror';
  const hasGroove = ctx.groovesEnabled && !isMirror && !!readScopedReaderAny(ctx, ctx.getGroove, partId);
  const style = special === 'glass' ? 'glass' : null;
  const effectiveFrameStyle = resolveEffectiveDoorStyle(
    ctx.doorStyle,
    readDoorStyleMap(ctx.getCfg(ctx.App)),
    partId
  );

  const vis = ctx.createDoorVisual(
    Math.max(0.03, ctx.doorW - 0.004),
    Math.max(0.2, segH - 0.004),
    0.018,
    isMirror ? ctx.getMirrorMat() : woodMat,
    style || effectiveFrameStyle,
    hasGroove,
    isMirror,
    readCurtainTypeLocal(curtain),
    isMirror ? woodMat : ctx.frontMat,
    ctx.outwardZSign,
    true,
    readCornerConnectorMirrorLayout(ctx, partId),
    partId,
    special === 'glass' ? { glassFrameStyle: effectiveFrameStyle } : null
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
    frontZ: 0.011,
    faceSign: ctx.outwardZSign,
  });
  ctx.addOutlines(vis);

  const hingeUserData = ctx.asRecord(hinge.userData);
  hingeUserData.__wpDoorOpenDirSign = ctx.outwardZSign;

  ctx.mount.add(hinge);
  appendCornerConnectorRenderEntry(ctx, hinge, state.hingeSide);
}

function maybeAppendRemovedDoorHitbox(
  ctx: CornerConnectorDoorContext,
  hinge: InstanceType<CornerConnectorDoorContext['THREE']['Group']>,
  state: CornerConnectorDoorState,
  segH: number
): void {
  if (!ctx.isPrimaryMode(ctx.App, ctx.MODES.REMOVE_DOOR || 'remove_door')) return;
  const box = new ctx.THREE.Mesh(
    new ctx.THREE.BoxGeometry(ctx.doorW, segH, 0.018),
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
  return String(value);
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
