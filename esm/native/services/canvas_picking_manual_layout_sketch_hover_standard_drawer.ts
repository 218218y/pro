import type { UnknownRecord } from '../../../types';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import {
  classifyCrossDrawerPart,
  resolveExternalCrossDrawerStackPreview,
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
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function readNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isStandardDrawerFamilyForSketchTool(tool: string, family: string): boolean {
  if (tool.startsWith('sketch_ext_drawers:')) return family === 'standard_external';
  if (isSketchInternalDrawersTool(tool)) return family === 'standard_internal';
  return false;
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
  const partId = readString(userData?.partId ?? drawer?.id);
  const family = classifyCrossDrawerPart(partId, userData);
  if (!target || !drawer || !group || !parent || !box || !isStandardDrawerFamilyForSketchTool(tool, family)) {
    return false;
  }
  if (!(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return false;

  const moduleKey = __wp_toModuleKey(userData?.moduleIndex ?? drawer?.moduleIndex);
  if (moduleKey == null) return false;
  const isBottom = userData?.__wpStack === 'bottom' || drawer?.__wpStack === 'bottom';
  const baseY = box.centerY - box.height / 2;
  const host = { tool, moduleKey, isBottom };

  if (family === 'standard_external') {
    const visualT = DRAWER_DIMENSIONS.external.visualThicknessM;
    const stackPreview = resolveExternalCrossDrawerStackPreview({
      App,
      target,
      measureObjectLocalBox: __wp_measureObjectLocalBox,
      family: 'standard_external',
      minWidth: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
      minHeight: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
      minDepth: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinDepthM,
      visualThickness: visualT,
      frontZOffset: DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM,
    });
    const previewBaseY = stackPreview?.y ?? baseY;
    const previewStackH = stackPreview?.stackH ?? box.height;
    const previewDrawerH = stackPreview?.drawerH ?? box.height;
    const previewDrawerCount =
      stackPreview?.drawerCount ??
      (/^d\d+_draw_shoe$/.test(partId) ? 1 : (readNumber(drawer?.drawerCount) ?? 1));
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
          box.centerZ + box.depth / 2 + visualT / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM,
        w: stackPreview?.w ?? Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM, box.width),
        d: stackPreview?.d ?? Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinDepthM, visualT),
        woodThick: visualT,
        drawers: stackPreview?.drawers ?? [
          {
            y: box.centerY,
            h: Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM, box.height),
          },
        ],
        op: 'remove',
      });
    }
    return true;
  }

  __wp_writeSketchHover(
    App,
    createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'drawers',
      op: 'remove',
      yCenter: box.centerY,
      baseY,
      removeKind: 'std',
      removePid: partId,
      drawerH: box.height,
      drawerGap: DRAWER_DIMENSIONS.sketch.internalGapM,
      drawerHeightM: box.height,
      stackH: box.height,
    })
  );
  if (setPreview) {
    setPreview({
      App,
      THREE: getThreeMaybe(App),
      anchor: group,
      anchorParent: parent,
      kind: 'drawers',
      x: box.centerX,
      y: baseY,
      z: box.centerZ,
      w: Math.max(DRAWER_DIMENSIONS.sketch.internalPreviewMinWidthM, box.width),
      d: Math.max(DRAWER_DIMENSIONS.sketch.internalPreviewMinDepthM, box.depth),
      drawerH: Math.max(DRAWER_DIMENSIONS.sketch.internalPreviewDefaultSingleHeightM, box.height),
      drawerGap: DRAWER_DIMENSIONS.sketch.internalGapM,
      woodThick: DRAWER_DIMENSIONS.external.visualThicknessM,
      op: 'remove',
    });
  }
  return true;
}
