import { getThreeMaybe } from '../runtime/three_access.js';
import { shouldBlockDrawerBuildInHexCell } from '../features/hex_cell/index.js';
import { resolveExternalDrawerFitFromBounds } from '../../shared/wardrobe_construction_validation_shared.js';
import {
  classifyCrossDrawerPart,
  readCrossDrawerCanonicalPartId,
  resolveExternalCrossDrawerStackPreview,
  resolveInternalCrossDrawerStackPreview,
} from './canvas_picking_drawer_cross_family.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { tryHandleSketchBoxRegularExternalDrawersHoverPreview } from './canvas_picking_regular_ext_drawers_free_box.js';
import {
  clearExtDrawerModeHover,
  coerceExtDrawerModeHoverModuleKey,
  writeExtDrawerModeHover,
} from './canvas_picking_ext_drawer_mode_hover.js';
import {
  __callMaybe,
  __getSketchPlacementPreviewFns,
  __readNumber,
  __readRecord,
  __readString,
  __withAppThree,
  type ExtDrawersHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';

function readInternalModuleKeyFromPartId(partId: string): string {
  const prefix = 'div_int_sketch_';
  if (!partId.startsWith(prefix)) return '';
  const suffix = partId.slice(prefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt > 0 ? suffix.slice(0, splitAt) : '';
}

function readSketchInternalDrawerIdFromPartId(partId: string, moduleKey: unknown): string {
  const normalizedPartId = partId.replace(/_(?:lower|upper)$/u, '');
  const prefix = `div_int_sketch_${String(moduleKey)}_`;
  if (normalizedPartId.startsWith(prefix)) return normalizedPartId.slice(prefix.length);
  const shortPrefix = 'div_int_sketch_';
  if (!normalizedPartId.startsWith(shortPrefix)) return '';
  const suffix = normalizedPartId.slice(shortPrefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt >= 0 ? suffix.slice(splitAt + 1) : suffix;
}

function readDrawerModeModuleKey(
  userData: Record<string, unknown> | null,
  canonicalPartId: string
): number | 'corner' | `corner:${number}` | null {
  return coerceExtDrawerModeHoverModuleKey(
    __readString(userData, 'moduleIndex', '') ||
      __readString(userData, '__wpSketchModuleKey', '') ||
      readInternalModuleKeyFromPartId(canonicalPartId)
  );
}

function readDrawerModeIsBottom(userData: Record<string, unknown> | null): boolean {
  return userData?.__wpStack === 'bottom' || userData?.stack === 'bottom' || userData?.isBottom === true;
}

function readFiniteFromRecord(rec: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = rec ? rec[key] : null;
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function externalDrawerHoverBlockedByFit(args: {
  target: { bottomY: number; topY: number; woodThick: number; info?: Record<string, unknown> | null };
  drawerType: string;
  hasShoe: boolean;
  currentCount: number;
  drawerCount: number;
  op: string;
}): boolean {
  if (args.op === 'remove') return false;
  const info = args.target.info || null;
  const targetWoodThick = Number(args.target.woodThick);
  const targetBottomY = Number(args.target.bottomY);
  const targetTopY = Number(args.target.topY);
  const woodThick =
    readFiniteFromRecord(info, 'woodThick') ?? (Number.isFinite(targetWoodThick) ? targetWoodThick : 0);
  const startY =
    readFiniteFromRecord(info, 'startY') ??
    (Number.isFinite(targetBottomY) ? targetBottomY - woodThick : NaN);
  const effectiveTopY = readFiniteFromRecord(info, 'effectiveTopY') ?? targetTopY;
  if (!Number.isFinite(startY) || !Number.isFinite(effectiveTopY)) return false;

  const fit = resolveExternalDrawerFitFromBounds({
    startY,
    effectiveTopY,
    woodThick,
    hasShoe: args.drawerType === 'shoe' ? true : args.hasShoe,
    regCount: args.drawerType === 'shoe' ? args.currentCount : args.drawerCount,
  });
  return !fit.fitsRequested;
}

export function tryHandleExtDrawersHoverPreview(args: ExtDrawersHoverPreviewArgs): boolean {
  if (!args.isExtDrawerEditMode) return false;
  try {
    const {
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      resolveInteriorHoverTarget,
      measureObjectLocalBox,
      readInteriorModuleConfigRef,
      readUi,
      resolveDrawerHoverPreviewTarget,
    } = args;
    const THREE = getThreeMaybe(App);
    __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
    const { hidePreview, setPreview } = __getSketchPlacementPreviewFns(App);
    if (!setPreview) {
      __callMaybe(hidePreview, __withAppThree(App, THREE));
      return false;
    }

    const drawerTarget = resolveDrawerHoverPreviewTarget
      ? resolveDrawerHoverPreviewTarget(App, raycaster, mouse, ndcX, ndcY)
      : null;
    const drawerGroup = __readRecord(drawerTarget?.drawer)?.group;
    const drawerUserData = __readRecord(__readRecord(drawerGroup)?.userData);
    const drawerPartId = readCrossDrawerCanonicalPartId(
      __readString(drawerUserData, 'partId', '') ||
        __readString(__readRecord(drawerTarget?.drawer), 'id', ''),
      drawerUserData
    );
    const drawerFamily = classifyCrossDrawerPart(drawerPartId, drawerUserData);
    if (drawerTarget && drawerFamily === 'sketch_external') {
      const visualT = DRAWER_DIMENSIONS.external.visualThicknessM;
      const stackPreview = resolveExternalCrossDrawerStackPreview({
        App,
        target: drawerTarget,
        measureObjectLocalBox,
        family: 'sketch_external',
        minWidth: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
        minHeight: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
        minDepth: DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinDepthM,
        visualThickness: visualT,
        frontZOffset: DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM,
      });
      const box = drawerTarget.box;
      setPreview({
        App,
        THREE,
        anchor: stackPreview?.anchor || drawerGroup || null,
        anchorParent: stackPreview?.anchorParent,
        kind: 'ext_drawers',
        x: stackPreview?.x ?? box.centerX,
        y: stackPreview?.y ?? box.centerY - box.height / 2,
        z:
          stackPreview?.z ??
          box.centerZ + box.depth / 2 + visualT / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM,
        w: stackPreview?.w ?? Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM, box.width),
        d: stackPreview?.d ?? visualT,
        woodThick: DRAWER_DIMENSIONS.external.visualThicknessM,
        drawers: stackPreview?.drawers ?? [
          {
            y: box.centerY,
            h: Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM, box.height),
          },
        ],
        op: 'remove',
      });
      writeExtDrawerModeHover(App, {
        moduleKey: readDrawerModeModuleKey(drawerUserData, drawerPartId),
        isBottom: readDrawerModeIsBottom(drawerUserData),
        kind: 'ext_drawers',
        op: 'remove',
        yCenter:
          stackPreview?.y != null && stackPreview?.stackH != null
            ? stackPreview.y + stackPreview.stackH / 2
            : box.centerY,
        baseY: stackPreview?.y ?? box.centerY - box.height / 2,
        removeId: __readString(drawerUserData, '__wpSketchExtDrawerId', ''),
        removeKind: 'sketch',
        drawerCount: stackPreview?.drawerCount,
        drawerH: stackPreview?.drawerH,
        stackH: stackPreview?.stackH,
      });
      return true;
    }

    if (drawerTarget && drawerFamily === 'sketch_internal') {
      const drawerGroupRecord = __readRecord(drawerGroup);
      const drawerParent = __readRecord(drawerTarget.parent);
      const box = drawerTarget.box;
      const moduleKeyRaw =
        __readString(drawerUserData, 'moduleIndex', '') ||
        __readString(drawerUserData, '__wpSketchModuleKey', '');
      const stackPreview =
        drawerGroupRecord && drawerParent && box && drawerPartId
          ? resolveInternalCrossDrawerStackPreview({
              App,
              targetGroup: drawerGroupRecord,
              targetParent: drawerParent,
              targetBox: box,
              targetPartId: drawerPartId,
              targetModuleKey: moduleKeyRaw,
              measureObjectLocalBox,
            })
          : null;
      const previewBaseY = stackPreview?.y ?? box.centerY - box.height / 2;
      const previewStackH = stackPreview?.stackH ?? box.height;
      const previewDrawerH = stackPreview?.drawerH ?? box.height;
      const previewDrawerGap = stackPreview?.drawerGap ?? DRAWER_DIMENSIONS.sketch.internalGapM;
      setPreview({
        App,
        THREE,
        anchor: stackPreview?.anchor || drawerGroup || null,
        anchorParent: stackPreview?.anchorParent || drawerParent,
        kind: 'drawers',
        x: stackPreview?.x ?? box.centerX,
        y: previewBaseY,
        z: stackPreview?.z ?? box.centerZ,
        w: stackPreview?.w ?? Math.max(DRAWER_DIMENSIONS.sketch.internalWidthMinM, box.width),
        d: stackPreview?.d ?? Math.max(DRAWER_DIMENSIONS.sketch.internalDepthMinM, box.depth),
        drawerH: previewDrawerH,
        drawerGap: previewDrawerGap,
        woodThick: DRAWER_DIMENSIONS.external.visualThicknessM,
        op: 'remove',
      });
      const moduleKey = readDrawerModeModuleKey(drawerUserData, drawerPartId);
      writeExtDrawerModeHover(App, {
        moduleKey,
        isBottom: readDrawerModeIsBottom(drawerUserData),
        kind: 'drawers',
        op: 'remove',
        yCenter: previewBaseY + previewStackH / 2,
        baseY: previewBaseY,
        removeId: readSketchInternalDrawerIdFromPartId(drawerPartId, moduleKey),
        removeKind: 'sketch',
        drawerH: previewDrawerH,
        drawerGap: previewDrawerGap,
        stackH: previewStackH,
      });
      return true;
    }

    if (
      tryHandleSketchBoxRegularExternalDrawersHoverPreview(args, {
        THREE,
        setPreview,
        hidePreview: hidePreview ? previewArgs => __callMaybe(hidePreview, previewArgs) : null,
      })
    ) {
      return true;
    }

    const target = resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target) {
      __callMaybe(hidePreview, __withAppThree(App, THREE));
      clearExtDrawerModeHover(App);
      return false;
    }

    const selectorBox = measureObjectLocalBox(App, target.hitSelectorObj);
    const cfgRef = readInteriorModuleConfigRef(App, target.hitModuleKey, !!target.isBottom);
    const ui = __readRecord(readUi(App));
    const drawerType = __readString(ui, 'currentExtDrawerType', 'regular');
    const countRaw = __readNumber(ui, 'currentExtDrawerCount', DRAWER_DIMENSIONS.sketch.externalCountMin);
    const drawerCount =
      countRaw >= DRAWER_DIMENSIONS.sketch.externalCountMin &&
      countRaw <= DRAWER_DIMENSIONS.sketch.externalCountMax
        ? Math.floor(countRaw)
        : DRAWER_DIMENSIONS.sketch.externalCountMin;
    const currentCount = __readNumber(cfgRef, 'extDrawersCount', 0);
    const hasShoe = !!cfgRef?.hasShoeDrawer;
    const op =
      drawerType === 'shoe' ? (hasShoe ? 'remove' : 'add') : currentCount === drawerCount ? 'remove' : 'add';
    const blockedByHexCell = op !== 'remove' && shouldBlockDrawerBuildInHexCell(cfgRef);
    const blockedByFit =
      !blockedByHexCell &&
      externalDrawerHoverBlockedByFit({
        target,
        drawerType,
        hasShoe,
        currentCount,
        drawerCount,
        op,
      });
    const previewOp = blockedByHexCell || blockedByFit ? 'blocked' : op;

    const outerW =
      selectorBox && selectorBox.width > 0
        ? selectorBox.width
        : Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewMinWidthM,
            Number(target.innerW) + Number(target.woodThick) * 2
          );
    const outerD =
      selectorBox && selectorBox.depth > 0
        ? selectorBox.depth
        : Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewMinDepthM,
            Number(target.internalDepth) + DRAWER_DIMENSIONS.sketch.externalPreviewDepthClearanceM
          );
    const centerX = selectorBox ? selectorBox.centerX : target.internalCenterX;
    const centerZ = selectorBox
      ? selectorBox.centerZ
      : Number(target.internalZ) + DRAWER_DIMENSIONS.sketch.externalPreviewCenterZInsetM;
    const baseY = selectorBox
      ? selectorBox.centerY - selectorBox.height / 2
      : Number(target.bottomY) - Number(target.woodThick);
    const visualW = Math.max(
      DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
      Number(outerW) - DRAWER_DIMENSIONS.external.visualWidthClearanceM
    );
    const visualT = DRAWER_DIMENSIONS.external.visualThicknessM;
    const frontPlaneZ = centerZ + outerD / 2;
    const frontZ = frontPlaneZ + visualT / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM;
    const drawers = [];
    const shoeH = DRAWER_DIMENSIONS.external.shoeHeightM;
    const regH = DRAWER_DIMENSIONS.external.regularHeightM;
    const baseStackOffset = drawerType === 'shoe' ? 0 : hasShoe ? shoeH : 0;
    if (drawerType === 'shoe') {
      drawers.push({
        y: baseY + Number(target.woodThick) + shoeH / 2,
        h: Math.max(
          DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
          shoeH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
        ),
      });
    } else {
      for (let i = 0; i < drawerCount; i++) {
        drawers.push({
          y: baseY + Number(target.woodThick) + baseStackOffset + i * regH + regH / 2,
          h: Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
            regH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
          ),
        });
      }
    }

    setPreview({
      App,
      THREE,
      anchor: target.hitSelectorObj,
      kind: 'ext_drawers',
      x: centerX,
      y: baseY,
      z: frontZ,
      w: visualW,
      d: visualT,
      woodThick: target.woodThick,
      drawers,
      op: previewOp,
      blockedReason: blockedByHexCell ? 'hex-cell' : blockedByFit ? 'no-room' : undefined,
    });
    writeExtDrawerModeHover(App, {
      moduleKey: target.hitModuleKey,
      isBottom: !!target.isBottom,
      kind: 'ext_drawers',
      op: previewOp === 'remove' ? 'remove' : 'add',
      yCenter: baseY + (drawerType === 'shoe' ? shoeH : drawerCount * regH) / 2,
      baseY,
      drawerCount,
      drawerH: drawerType === 'shoe' ? shoeH : regH,
      stackH: drawerType === 'shoe' ? shoeH : drawerCount * regH,
      blockedReason: blockedByHexCell ? 'hex-cell' : blockedByFit ? 'no-room' : null,
    });
    return true;
  } catch {
    return false;
  }
}
