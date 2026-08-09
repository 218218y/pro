import type { UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import {
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
} from '../../shared/dimensions/drawer_sketch_policy.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import {
  classifyCrossDrawerPart,
  readCrossDrawerCanonicalPartId,
  resolveExternalCrossDrawerStackPreview,
  resolveInternalCrossDrawerStackPreview,
} from './canvas_picking_drawer_cross_family.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { ManualLayoutSketchHoverPreviewArgs } from './canvas_picking_manual_layout_sketch_hover_tools_shared.js';

type SetSketchPreviewFn = ((previewArgs: Record<string, unknown>) => unknown) | null;

type SketchStandardDrawerHoverArgs = ManualLayoutSketchHoverPreviewArgs & {
  tool: string;
  setPreview: SetSketchPreviewFn;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readString(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value));
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const n = readNumber(value);
  return n != null && n > 0 ? n : null;
}

function isStandardExternalShoeDrawer(partId: string, userData: UnknownRecord | null): boolean {
  return userData?.__wpShoeDrawer === true || /^d\d+_draw_shoe$/u.test(partId);
}

function resolveStandardShoeFrontPreview(args: {
  drawer: UnknownRecord;
  group: UnknownRecord;
  userData: UnknownRecord | null;
  parent: UnknownRecord;
  box: { centerX: number; centerY: number; centerZ: number; width: number; height: number; depth: number };
}) {
  const closed = asRecord(args.drawer.closed);
  const position = asRecord(args.group.position);
  const faceOffsetX = readNumber(args.userData?.__wpFaceOffsetX) ?? 0;
  const centerX = readNumber(closed?.x) ?? readNumber(position?.x) ?? args.box.centerX;
  const centerY = readNumber(closed?.y) ?? readNumber(position?.y) ?? args.box.centerY;
  const centerZ = readNumber(closed?.z) ?? readNumber(position?.z) ?? args.box.centerZ;
  const width = readPositiveNumber(args.userData?.__doorWidth) ?? args.box.width;
  const height = readPositiveNumber(args.userData?.__doorHeight) ?? args.box.height;
  const visualT = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
  return {
    anchor: args.group,
    anchorParent: args.parent,
    x: centerX + faceOffsetX,
    y: centerY - height / 2,
    z: centerZ + visualT + DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
    w: Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM, width),
    d: Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM, visualT),
    stackH: height,
    drawerH: height,
    drawerCount: 1,
    drawers: [
      {
        y: centerY,
        h: Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM, height),
      },
    ],
  };
}

function isCrossDrawerFamilyForSketchTool(tool: string, family: string): boolean {
  if (tool.startsWith('sketch_ext_drawers:')) {
    return family === 'standard_external' || family === 'sketch_internal';
  }
  return isSketchInternalDrawersTool(tool) && family === 'sketch_external';
}

function stripSketchInternalDrawerSlotSuffix(partId: string): string {
  return partId.replace(/_(?:lower|upper)$/u, '');
}

function readSketchInternalDrawerId(partId: string, moduleKey: unknown): string {
  const normalizedPartId = stripSketchInternalDrawerSlotSuffix(partId);
  const prefix = `div_int_sketch_${String(moduleKey)}_`;
  if (normalizedPartId.startsWith(prefix)) return normalizedPartId.slice(prefix.length);
  const shortPrefix = 'div_int_sketch_';
  if (!normalizedPartId.startsWith(shortPrefix)) return '';
  const suffix = normalizedPartId.slice(shortPrefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt >= 0 ? suffix.slice(splitAt + 1) : suffix;
}

export function tryHandleSketchHoverOverStandardDrawer(args: SketchStandardDrawerHoverArgs): boolean {
  const {
    App,
    tool,
    ndcX,
    ndcY,
    __wpRaycaster,
    __wpMouse,
    __wp_toModuleKey,
    __wp_writeSketchHover,
    __wp_resolveDrawerHoverPreviewTarget,
    setPreview,
  } = args;

  const target = __wp_resolveDrawerHoverPreviewTarget(App, __wpRaycaster, __wpMouse, ndcX, ndcY);
  const drawer = asRecord(target?.drawer);
  const group = asRecord(drawer?.group);
  const userData = asRecord(group?.userData);
  const parent = target ? asRecord(target.parent) : null;
  const box = target?.box || null;
  const partId = readCrossDrawerCanonicalPartId(userData?.partId ?? drawer?.id, userData);
  const family = classifyCrossDrawerPart(partId, userData);
  if (!target || !drawer || !group || !parent || !box || !isCrossDrawerFamilyForSketchTool(tool, family)) {
    return false;
  }
  if (!(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return false;

  const moduleKey = __wp_toModuleKey(
    userData?.moduleIndex ?? userData?.__wpSketchModuleKey ?? drawer?.moduleIndex
  );
  if (moduleKey == null) return false;
  const isBottom = userData?.__wpStack === 'bottom' || drawer?.__wpStack === 'bottom';
  const baseY = box.centerY - box.height / 2;
  const host = { tool, moduleKey, isBottom };

  if (family === 'standard_external') {
    const visualT = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
    const standardShoeFront = isStandardExternalShoeDrawer(partId, userData)
      ? resolveStandardShoeFrontPreview({ drawer, group, userData, parent, box })
      : null;
    const stackPreview =
      standardShoeFront ||
      resolveExternalCrossDrawerStackPreview({
        App,
        target,
        measureObjectLocalBox: __wp_measureObjectLocalBox,
        family: 'standard_external',
        minWidth: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
        minHeight: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
        minDepth: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM,
        visualThickness: visualT,
        frontZOffset: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
      });
    const previewBaseY = stackPreview?.y ?? baseY;
    const previewStackH = stackPreview?.stackH ?? box.height;
    const previewDrawerH = stackPreview?.drawerH ?? box.height;
    const previewDrawerCount =
      stackPreview?.drawerCount ??
      (isStandardExternalShoeDrawer(partId, userData) ? 1 : (readNumber(drawer?.drawerCount) ?? 1));
    __wp_writeSketchHover(
      App,
      createManualLayoutSketchStackHoverRecord({
        host,
        kind: 'ext_drawers',
        op: 'remove',
        yCenter: previewBaseY + previewStackH / 2,
        baseY: previewBaseY,
        removeKind: 'std',
        removePid: partId,
        drawerCount: previewDrawerCount,
        drawerH: previewDrawerH,
        drawerHeightM: previewDrawerH,
        stackH: previewStackH,
      })
    );
    if (setPreview) {
      setPreview({
        App,
        THREE: getThreeMaybe(App),
        anchor: stackPreview?.anchor || group,
        anchorParent: stackPreview?.anchorParent || parent,
        kind: 'ext_drawers',
        x: stackPreview?.x ?? box.centerX,
        y: previewBaseY,
        z:
          stackPreview?.z ??
          box.centerZ +
            box.depth / 2 +
            visualT / 2 +
            DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
        w:
          stackPreview?.w ??
          Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM, box.width),
        d:
          stackPreview?.d ??
          Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM, visualT),
        woodThick: visualT,
        drawers: stackPreview?.drawers ?? [
          {
            y: box.centerY,
            h: Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM, box.height),
          },
        ],
        op: 'remove',
      });
    }
    return true;
  }

  if (family === 'sketch_external') {
    const drawerId = readString(userData?.__wpSketchExtDrawerId);
    if (!drawerId) return false;
    const visualT = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
    const stackPreview = resolveExternalCrossDrawerStackPreview({
      App,
      target,
      measureObjectLocalBox: __wp_measureObjectLocalBox,
      family: 'sketch_external',
      minWidth: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
      minHeight: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
      minDepth: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM,
      visualThickness: visualT,
      frontZOffset: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
    });
    const previewBaseY = stackPreview?.y ?? baseY;
    const previewStackH = stackPreview?.stackH ?? box.height;
    const previewDrawerH = stackPreview?.drawerH ?? box.height;
    const previewDrawerCount = stackPreview?.drawerCount ?? readNumber(drawer?.drawerCount) ?? 1;
    __wp_writeSketchHover(
      App,
      createManualLayoutSketchStackHoverRecord({
        host,
        kind: 'ext_drawers',
        op: 'remove',
        yCenter: previewBaseY + previewStackH / 2,
        baseY: previewBaseY,
        removeKind: 'sketch',
        removeId: drawerId,
        drawerCount: previewDrawerCount,
        drawerH: previewDrawerH,
        drawerHeightM: previewDrawerH,
        stackH: previewStackH,
      })
    );
    if (setPreview) {
      setPreview({
        App,
        THREE: getThreeMaybe(App),
        anchor: stackPreview?.anchor || group,
        anchorParent: stackPreview?.anchorParent || parent,
        kind: 'ext_drawers',
        x: stackPreview?.x ?? box.centerX,
        y: previewBaseY,
        z:
          stackPreview?.z ??
          box.centerZ +
            box.depth / 2 +
            visualT / 2 +
            DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
        w:
          stackPreview?.w ??
          Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM, box.width),
        d:
          stackPreview?.d ??
          Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM, visualT),
        woodThick: visualT,
        drawers: stackPreview?.drawers ?? [
          {
            y: box.centerY,
            h: Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM, box.height),
          },
        ],
        op: 'remove',
      });
    }
    return true;
  }

  if (family === 'sketch_internal') {
    const removeId = readSketchInternalDrawerId(partId, moduleKey);
    if (!removeId) return false;
    const stackPreview = resolveInternalCrossDrawerStackPreview({
      App,
      targetGroup: group,
      targetParent: parent,
      targetBox: box,
      targetPartId: partId,
      targetModuleKey: String(moduleKey),
      measureObjectLocalBox: __wp_measureObjectLocalBox,
    });
    const previewBaseY = stackPreview?.y ?? baseY;
    const previewStackH = stackPreview?.stackH ?? box.height;
    const previewDrawerH = stackPreview?.drawerH ?? box.height;
    const previewDrawerGap = stackPreview?.drawerGap ?? DRAWER_SKETCH_SIZING_POLICY.internalGapM;
    __wp_writeSketchHover(
      App,
      createManualLayoutSketchStackHoverRecord({
        host,
        kind: 'drawers',
        op: 'remove',
        yCenter: previewBaseY + previewStackH / 2,
        baseY: previewBaseY,
        removeKind: 'sketch',
        removeId,
        drawerH: previewDrawerH,
        drawerGap: previewDrawerGap,
        drawerHeightM: previewDrawerH,
        stackH: previewStackH,
      })
    );
    if (setPreview) {
      setPreview({
        App,
        THREE: getThreeMaybe(App),
        anchor: stackPreview?.anchor || group,
        anchorParent: stackPreview?.anchorParent || parent,
        kind: 'drawers',
        x: stackPreview?.x ?? box.centerX,
        y: previewBaseY,
        z: stackPreview?.z ?? box.centerZ,
        w: stackPreview?.w ?? Math.max(DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthMinM, box.width),
        d: stackPreview?.d ?? Math.max(DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalDepthMinM, box.depth),
        drawerH: previewDrawerH,
        drawerGap: previewDrawerGap,
        woodThick: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
        op: 'remove',
      });
    }
    return true;
  }

  return false;
}
