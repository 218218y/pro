import { getThreeMaybe } from '../runtime/three_access.js';
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
    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    const { setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    if (!setSketchPreview) {
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });

    const ui = readUiState(App);
    const currentToolDivs = readGridDivisions(ui.currentGridDivisions, 6, 8);
    const shelfVariant = readShelfVariant(ui.currentGridShelfVariant);
    const cfgRef = asHoverModuleConfig(
      __wp_readInteriorModuleConfigRef(App, target.hitModuleKey, target.isBottom)
    );
    const savedDivs = readSavedGridDivisions(cfgRef, currentToolDivs);
    const isNewLayout = !cfgRef?.isCustom || savedDivs !== currentToolDivs;
    const pad = Math.min(0.006, Math.max(0.001, target.woodThick * 0.2));
    const step = target.spanH / currentToolDivs;
    const relY = target.hitY - target.bottomY;

    if (manualTool === 'shelf' && isNewLayout && setLayoutPreview) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      const shelfYs: number[] = [];
      for (let i = 1; i < currentToolDivs; i++) shelfYs.push(target.bottomY + i * step);
      setLayoutPreview(
        buildLayoutPreviewPayload({
          App,
          target,
          shelfYs,
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
        y: target.bottomY + 0.25,
        z: target.internalZ + target.internalDepth / 2 - 0.06,
        w: Math.max(0.05, target.innerW - 0.025),
        h: 0.5,
        d: Math.max(0.0001, target.woodThick),
        woodThick: target.woodThick,
        op: hasStorage ? 'remove' : 'add',
      });
    }

    if (manualTool === 'rod') {
      let gridIndex = Math.ceil(relY / step);
      if (gridIndex < 1) gridIndex = 1;
      if (gridIndex > currentToolDivs) gridIndex = currentToolDivs;
      const rodY = target.bottomY + gridIndex * step - 0.08;
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
        w: Math.max(0.05, target.innerW - 0.06),
        h: 0.03,
        d: 0.03,
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
    const w = target.innerW > 0 ? Math.max(0, target.innerW - (isBrace ? 0.002 : 0.014)) : target.innerW;
    const h =
      shelfVariant === 'glass'
        ? 0.018
        : shelfVariant === 'double'
          ? Math.max(target.woodThick, target.woodThick * 2)
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
