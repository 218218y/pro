import {
  normalizeHinge,
  normalizeOp,
  readRecordNumber,
  readRecordString,
  readRecordValue,
  type ManualLayoutSketchBoxContentHoverIntent,
  type ManualLayoutSketchBoxHoverIntent,
  type ManualLayoutSketchRodHoverIntent,
  type ManualLayoutSketchShelfHoverIntent,
  type ManualLayoutSketchStackHoverIntent,
  type ManualLayoutSketchStorageHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent_shared.js';

export function readManualLayoutSketchBoxHoverIntent(
  record: unknown
): ManualLayoutSketchBoxHoverIntent | null {
  if (readRecordString(record, 'kind') !== 'box') return null;
  return {
    kind: 'box',
    op: normalizeOp(readRecordValue(record, 'op')),
    xCenter: readRecordNumber(record, 'xCenter'),
    yCenter: readRecordNumber(record, 'yCenter'),
    xNorm: readRecordNumber(record, 'xNorm'),
    removeId: readRecordString(record, 'removeId'),
    blockedReason: readRecordString(record, '__wpBlockedReason'),
  };
}

export function readManualLayoutSketchBoxContentHoverIntent(
  record: unknown
): ManualLayoutSketchBoxContentHoverIntent | null {
  if (readRecordString(record, 'kind') !== 'box_content') return null;
  const dividerYNorm = readRecordNumber(record, 'dividerYNorm');
  const dividerAxis = readRecordString(record, 'dividerAxis');
  const hasShoeDrawerValue = readRecordValue(record, 'hasShoeDrawer');
  const hasShoeDrawerPatch =
    hasShoeDrawerValue === true
      ? { hasShoeDrawer: true }
      : hasShoeDrawerValue === false
        ? { hasShoeDrawer: false }
        : {};
  return {
    kind: 'box_content',
    op: normalizeOp(readRecordValue(record, 'op')),
    contentKind: readRecordString(record, 'contentKind') || '',
    boxId: readRecordString(record, 'boxId') || '',
    freePlacement: readRecordValue(record, 'freePlacement') === true,
    boxYNorm: readRecordNumber(record, 'boxYNorm'),
    boxBaseYNorm: readRecordNumber(record, 'boxBaseYNorm'),
    contentXNorm: readRecordNumber(record, 'contentXNorm'),
    dividerXNorm: readRecordNumber(record, 'dividerXNorm'),
    ...(dividerYNorm != null ? { dividerYNorm } : {}),
    ...(dividerAxis ? { dividerAxis } : {}),
    dividerId: readRecordString(record, 'dividerId'),
    dividerFrontZ: readRecordNumber(record, 'dividerFrontZ'),
    variant: readRecordString(record, 'variant'),
    depthM: readRecordNumber(record, 'depthM'),
    heightM: readRecordNumber(record, 'heightM'),
    removeId: readRecordString(record, 'removeId'),
    removeIdx: readRecordNumber(record, 'removeIdx'),
    yCenter: readRecordNumber(record, 'yCenter'),
    baseY: readRecordNumber(record, 'baseY'),
    stackH: readRecordNumber(record, 'stackH'),
    drawerH: readRecordNumber(record, 'drawerH'),
    drawerGap: readRecordNumber(record, 'drawerGap'),
    drawerHeightM: readRecordNumber(record, 'drawerHeightM'),
    drawerCount: readRecordNumber(record, 'drawerCount'),
    ...hasShoeDrawerPatch,
    hinge: normalizeHinge(readRecordValue(record, 'hinge')),
    doorId: readRecordString(record, 'doorId'),
    doorLeftId: readRecordString(record, 'doorLeftId'),
    doorRightId: readRecordString(record, 'doorRightId'),
    baseType: readRecordString(record, 'baseType'),
    baseLegStyle: readRecordString(record, 'baseLegStyle'),
    baseLegColor: readRecordString(record, 'baseLegColor'),
    baseLegPlatformMode: readRecordString(record, 'baseLegPlatformMode'),
    baseLegPlatformSideMode: readRecordString(record, 'baseLegPlatformSideMode'),
    baseLegPlatformSideOverhangCm: readRecordNumber(record, 'baseLegPlatformSideOverhangCm'),
    baseLegPlatformFrontOverhangCm: readRecordNumber(record, 'baseLegPlatformFrontOverhangCm'),
    baseLegHeightCm: readRecordNumber(record, 'baseLegHeightCm'),
    baseLegWidthCm: readRecordNumber(record, 'baseLegWidthCm'),
    basePlinthHeightCm: readRecordNumber(record, 'basePlinthHeightCm'),
    corniceType: readRecordString(record, 'corniceType'),
    blockedReason: readRecordString(record, '__wpBlockedReason'),
  };
}

export function readManualLayoutSketchStackHoverIntent(
  record: unknown
): ManualLayoutSketchStackHoverIntent | null {
  const kind = readRecordString(record, 'kind');
  if (kind !== 'drawers' && kind !== 'ext_drawers') return null;
  const removeKindRaw = readRecordString(record, 'removeKind') || '';
  return {
    kind,
    op: normalizeOp(readRecordValue(record, 'op')),
    yCenter: readRecordNumber(record, 'yCenter'),
    baseY: readRecordNumber(record, 'baseY'),
    removeId: readRecordString(record, 'removeId'),
    removeKind: removeKindRaw === 'std' ? 'std' : removeKindRaw === 'sketch' ? 'sketch' : '',
    removePid: readRecordString(record, 'removePid'),
    removeSlot: readRecordNumber(record, 'removeSlot'),
    drawerH: readRecordNumber(record, 'drawerH'),
    drawerGap: readRecordNumber(record, 'drawerGap'),
    stackH: readRecordNumber(record, 'stackH'),
    drawerHeightM: readRecordNumber(record, 'drawerHeightM'),
    drawerCount: readRecordNumber(record, 'drawerCount'),
    blockedReason: readRecordString(record, '__wpBlockedReason'),
  };
}

export function readManualLayoutSketchShelfHoverIntent(
  record: unknown
): ManualLayoutSketchShelfHoverIntent | null {
  if (readRecordString(record, 'kind') !== 'shelf') return null;
  return {
    kind: 'shelf',
    op: normalizeOp(readRecordValue(record, 'op')),
    removeKind: readRecordString(record, 'removeKind') || '',
    removeIdx: readRecordNumber(record, 'removeIdx'),
    shelfIndex: readRecordNumber(record, 'shelfIndex'),
    yNorm: readRecordNumber(record, 'yNorm'),
    variant: readRecordString(record, 'variant'),
    depthM: readRecordNumber(record, 'depthM'),
    blockedReason: readRecordString(record, '__wpBlockedReason'),
  };
}

export function readManualLayoutSketchStorageHoverIntent(
  record: unknown
): ManualLayoutSketchStorageHoverIntent | null {
  if (readRecordString(record, 'kind') !== 'storage') return null;
  const removeKindRaw = readRecordString(record, 'removeKind') || '';
  return {
    kind: 'storage',
    op: normalizeOp(readRecordValue(record, 'op')),
    removeKind: removeKindRaw === 'base' ? 'base' : removeKindRaw === 'sketch' ? 'sketch' : '',
    removeIdx: readRecordNumber(record, 'removeIdx'),
  };
}

export function readManualLayoutSketchRodHoverIntent(
  record: unknown
): ManualLayoutSketchRodHoverIntent | null {
  if (readRecordString(record, 'kind') !== 'rod') return null;
  const removeKindRaw = readRecordString(record, 'removeKind') || '';
  return {
    kind: 'rod',
    op: normalizeOp(readRecordValue(record, 'op')),
    removeKind: removeKindRaw === 'base' ? 'base' : removeKindRaw === 'sketch' ? 'sketch' : '',
    removeIdx: readRecordNumber(record, 'removeIdx'),
    rodIndex: readRecordNumber(record, 'rodIndex'),
  };
}
