import { getThreeMaybe } from '../runtime/three_access.js';
import {
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
  MATERIAL_THICKNESS_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_hover_manual_mode_dimension_policy.js';
import {
  __wp_readInteriorModuleConfigRef,
  __wp_resolveInteriorHoverTarget,
} from './canvas_picking_local_helpers.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import {
  asHoverModuleConfig,
  getSketchPreviewFns,
  hideLayoutPreview,
  hideSketchPreview,
  readBooleanArray,
  readBraceShelves,
  readCustomData,
  readGridDivisions,
  readManualTool,
  readShelfVariant,
  readUiState,
  setPreview,
} from './canvas_picking_interior_hover_shared.js';
import {
  buildLayoutPreviewPayload,
  readExistingShelfVariant,
  readSavedGridDivisions,
} from './canvas_picking_interior_hover_layout_family_shared.js';
import { resolveManualLayoutShelfFillPlan } from './canvas_picking_manual_layout_config_ops.js';
import { tryHandleManualLayoutFreeBoxHover } from './canvas_picking_manual_layout_free_box_content.js';

export function tryHandleCanvasManualLayoutHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    previewRo,
    hideLayoutPreview: hideLayoutPreviewFn,
    hideSketchPreview: hideSketchPreviewFn,
    setLayoutPreview,
  } = args;
  try {
    const manualTool = readManualTool(App);
    if (!manualTool) return false;
    const { setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    const ui = readUiState(App);
    const currentToolDivs = readGridDivisions(
      ui.currentGridDivisions,
      INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault,
      8
    );
    const shelfVariant = readShelfVariant(ui.currentGridShelfVariant);
    if (
      tryHandleManualLayoutFreeBoxHover({
        App,
        tool: manualTool,
        ndcX,
        ndcY,
        raycaster,
        mouse,
        currentGridDivisions: currentToolDivs,
        shelfVariant,
        setLayoutPreview,
        setSketchPreview,
        hideLayoutPreview: () => hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn }),
        hideSketchPreview: () => hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn }),
      })
    ) {
      return true;
    }

    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    if (!setSketchPreview) {
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });

    const cfgRef = asHoverModuleConfig(
      __wp_readInteriorModuleConfigRef(App, target.hitModuleKey, target.isBottom)
    );
    const savedDivs = readSavedGridDivisions(cfgRef, currentToolDivs);
    const isNewLayout = !cfgRef?.isCustom || savedDivs !== currentToolDivs;
    const pad = Math.min(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
      Math.max(
        DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
        target.woodThick * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio
      )
    );
    const step = target.spanH / currentToolDivs;
    const relY = target.hitY - target.bottomY;

    if (manualTool === 'shelf' && isNewLayout && setLayoutPreview) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      const shelfPlan = resolveManualLayoutShelfFillPlan({
        cfgRef,
        divs: currentToolDivs,
        shelfVariant,
        topY: target.topY,
        bottomY: target.bottomY,
        pad,
        woodThick: target.woodThick,
      });
      setLayoutPreview(
        buildLayoutPreviewPayload({
          App,
          target,
          shelfYs: shelfPlan.shelfYs,
          rodYs: [],
          storageBarrier: null,
          shelfVariant,
        })
      );
      return true;
    }

    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });

    if (manualTool === 'storage') {
      const hasStorage = !!(cfgRef?.isCustom && readCustomData(cfgRef)?.storage);
      return setPreview(setSketchPreview, {
        App,
        THREE: getThreeMaybe(App),
        anchor: target.hitSelectorObj,
        kind: 'storage',
        x: target.internalCenterX,
        y: target.bottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM / 2,
        z: target.internalZ + target.internalDepth / 2 + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
        w: Math.max(
          INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
          target.innerW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
        ),
        h: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
        d: Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, target.woodThick),
        woodThick: target.woodThick,
        op: hasStorage ? 'remove' : 'add',
      });
    }

    if (manualTool === 'rod') {
      let gridIndex = Math.ceil(relY / step);
      if (gridIndex < 1) gridIndex = 1;
      if (gridIndex > currentToolDivs) gridIndex = currentToolDivs;
      const rodY = target.bottomY + gridIndex * step + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM;
      const rods = readCustomData(cfgRef)?.rods;
      const hasRod = Array.isArray(rods) ? !!rods[gridIndex - 1] : false;
      return setPreview(setSketchPreview, {
        App,
        THREE: getThreeMaybe(App),
        anchor: target.hitSelectorObj,
        kind: 'rod',
        x: target.internalCenterX,
        y: Math.max(target.bottomY + pad, Math.min(target.topY - pad, rodY)),
        z: target.internalZ,
        w: Math.max(
          SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM,
          target.innerW - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM
        ),
        h: SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM,
        d: SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM,
        woodThick: target.woodThick,
        op: hasRod ? 'remove' : 'add',
      });
    }

    let shelfIndex = Math.round(relY / step);
    if (shelfIndex < 1) shelfIndex = 1;
    if (shelfIndex > currentToolDivs - 1) shelfIndex = currentToolDivs - 1;
    const shelfY = target.bottomY + shelfIndex * step;
    const customData = readCustomData(cfgRef);
    const shelvesArr = readBooleanArray(customData?.shelves);
    const shelfVariants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : [];
    const braceList = readBraceShelves(cfgRef);
    const exists = !!shelvesArr[shelfIndex - 1];
    const existingVariant = readExistingShelfVariant({ braceList, shelfIndex, shelfVariants });
    const op = !exists ? 'add' : existingVariant !== shelfVariant ? 'add' : 'remove';
    const isBrace = shelfVariant === 'brace';
    const depthM = isBrace ? target.internalDepth : target.regularDepth;
    const z = target.backZ + depthM / 2;
    const w =
      target.innerW > 0
        ? Math.max(
            0,
            target.innerW -
              (isBrace
                ? SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
                : SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM)
          )
        : target.innerW;
    const h =
      shelfVariant === 'glass'
        ? MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM
        : shelfVariant === 'double'
          ? Math.max(
              target.woodThick,
              target.woodThick * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier
            )
          : target.woodThick;
    return setPreview(setSketchPreview, {
      App,
      THREE: getThreeMaybe(App),
      anchor: target.hitSelectorObj,
      kind: 'shelf',
      variant: shelfVariant,
      x: target.internalCenterX,
      y: Math.max(target.bottomY + pad, Math.min(target.topY - pad, shelfY)),
      z,
      w,
      h,
      d: depthM,
      woodThick: target.woodThick,
      op,
    });
  } catch {
    return false;
  }
}
