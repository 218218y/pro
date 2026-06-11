import {
  clampHandleAbsY,
  hasExplicitHandleOverride,
  pushHingedDoorSegment,
  topSplitHandleInsetForPart,
} from './hinged_doors_module_ops_shared.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';
import { grooveForPart, partIdForSegment } from './hinged_doors_module_ops_split_parts.js';

export type HingedDoorSplitVisualState = {
  splitGap: number;
  defaultHandleAbsY: number;
  curtainFull: string | null;
  isFullGrooved: boolean;
  topColorVal: string | null;
  midColorVal: string | null;
  botColorVal: string | null;
  curtainTop: string | null;
  curtainMid: string | null;
  curtainBot: string | null;
  grooveTop: boolean;
  grooveMid: boolean;
  grooveBot: boolean;
};

export function appendCustomSplitHingedDoorSegments(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  visual: HingedDoorSplitVisualState,
  cuts: readonly number[]
): void {
  const segCount = cuts.length + 1;

  for (let segmentIndex = 0; segmentIndex < segCount; segmentIndex++) {
    const segBottomY = segmentIndex === 0 ? ctx.doorBottomY : cuts[segmentIndex - 1] + visual.splitGap / 2;
    const segTopY =
      segmentIndex === segCount - 1 ? ctx.effectiveTopLimit : cuts[segmentIndex] - visual.splitGap / 2;
    const segH = segTopY - segBottomY;
    if (!(segH > 0.1)) continue;

    const partId = partIdForSegment(state, segCount, segmentIndex);
    const curtainVal = ctx.cfg.isMultiColorMode
      ? ctx.resolveCurtainForPart(partId, visual.curtainFull)
      : null;
    pushHingedDoorSegment(ctx, state, {
      partId,
      segH,
      segY: segBottomY + segH / 2,
      curtainVal,
      grooveFlag: grooveForPart(ctx, partId, visual.isFullGrooved),
      colorVal: ctx.getPartColorValueSafe(partId),
      handleAbsY: clampHandleAbsY(ctx, visual.defaultHandleAbsY, segBottomY, segTopY, partId),
      allowHandle:
        segCount < 3
          ? true
          : segmentIndex === 0
            ? hasExplicitHandleOverride(ctx, state.currentDoorId, partId)
            : true,
    });
  }
}

export function appendTripleSplitHingedDoorSegments(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  visual: HingedDoorSplitVisualState,
  topSplitLineY: number,
  bottomLineY: number
): void {
  const topDoorTopY = ctx.effectiveTopLimit;
  const topDoorBottomY = topSplitLineY + visual.splitGap / 2;
  const topDoorH = topDoorTopY - topDoorBottomY;

  const midTopY = topSplitLineY - visual.splitGap / 2;
  const midBottomY = bottomLineY + visual.splitGap / 2;
  const midH = midTopY - midBottomY;

  const botTopY = bottomLineY - visual.splitGap / 2;
  const botBottomY = ctx.doorBottomY;
  const botH = botTopY - botBottomY;

  pushHingedDoorSegment(ctx, state, {
    partId: state.topKey,
    segH: topDoorH,
    segY: topDoorBottomY + topDoorH / 2,
    curtainVal: visual.curtainTop,
    grooveFlag: visual.grooveTop,
    colorVal: visual.topColorVal,
    handleAbsY: clampHandleAbsY(
      ctx,
      topDoorBottomY + topSplitHandleInsetForPart(ctx, state.topKey),
      topDoorBottomY,
      topDoorTopY,
      state.topKey
    ),
    allowHandle: true,
  });
  pushHingedDoorSegment(ctx, state, {
    partId: state.midKey,
    segH: midH,
    segY: midBottomY + midH / 2,
    curtainVal: visual.curtainMid,
    grooveFlag: visual.grooveMid,
    colorVal: visual.midColorVal,
    handleAbsY: clampHandleAbsY(ctx, visual.defaultHandleAbsY, midBottomY, midTopY, state.midKey),
    allowHandle: true,
  });
  pushHingedDoorSegment(ctx, state, {
    partId: state.botKey,
    segH: botH,
    segY: botBottomY + botH / 2,
    curtainVal: visual.curtainBot,
    grooveFlag: visual.grooveBot,
    colorVal: visual.botColorVal,
    handleAbsY: clampHandleAbsY(ctx, visual.defaultHandleAbsY, botBottomY, botTopY, state.botKey),
    allowHandle: hasExplicitHandleOverride(ctx, state.currentDoorId, state.botKey),
  });
}

export function appendTopSplitHingedDoorSegments(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  visual: HingedDoorSplitVisualState,
  topSplitLineY: number
): void {
  const topDoorTopY = ctx.effectiveTopLimit;
  const topDoorBottomY = topSplitLineY + visual.splitGap / 2;
  const topDoorH = topDoorTopY - topDoorBottomY;

  const bottomDoorTopY = topSplitLineY - visual.splitGap / 2;
  const bottomDoorBottomY = ctx.doorBottomY;
  const bottomDoorH = bottomDoorTopY - bottomDoorBottomY;

  pushHingedDoorSegment(ctx, state, {
    partId: state.topKey,
    segH: topDoorH,
    segY: topDoorBottomY + topDoorH / 2,
    curtainVal: visual.curtainTop,
    grooveFlag: visual.grooveTop,
    colorVal: visual.topColorVal,
    handleAbsY: clampHandleAbsY(
      ctx,
      topDoorBottomY + topSplitHandleInsetForPart(ctx, state.topKey),
      topDoorBottomY,
      topDoorTopY,
      state.topKey
    ),
    allowHandle: true,
  });
  pushHingedDoorSegment(ctx, state, {
    partId: state.botKey,
    segH: bottomDoorH,
    segY: bottomDoorBottomY + bottomDoorH / 2,
    curtainVal: visual.curtainBot,
    grooveFlag: visual.grooveBot,
    colorVal: visual.botColorVal,
    handleAbsY: clampHandleAbsY(
      ctx,
      visual.defaultHandleAbsY,
      bottomDoorBottomY,
      bottomDoorTopY,
      state.botKey
    ),
    allowHandle: true,
  });
}

export function appendBottomSplitHingedDoorSegments(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  visual: HingedDoorSplitVisualState,
  bottomLineY: number
): void {
  const topDoorTopY = ctx.effectiveTopLimit;
  const topDoorBottomY = bottomLineY + visual.splitGap / 2;
  const topH = topDoorTopY - topDoorBottomY;

  const botTopY = bottomLineY - visual.splitGap / 2;
  const botBottomY = ctx.doorBottomY;
  const botH = botTopY - botBottomY;

  pushHingedDoorSegment(ctx, state, {
    partId: state.topKey,
    segH: topH,
    segY: topDoorBottomY + topH / 2,
    curtainVal: visual.curtainTop,
    grooveFlag: visual.grooveTop,
    colorVal: visual.topColorVal,
    handleAbsY: clampHandleAbsY(ctx, visual.defaultHandleAbsY, topDoorBottomY, topDoorTopY, state.topKey),
    allowHandle: true,
  });
  pushHingedDoorSegment(ctx, state, {
    partId: state.botKey,
    segH: botH,
    segY: botBottomY + botH / 2,
    curtainVal: visual.curtainBot,
    grooveFlag: visual.grooveBot,
    colorVal: visual.botColorVal,
    handleAbsY: clampHandleAbsY(ctx, visual.defaultHandleAbsY, botBottomY, botTopY, state.botKey),
    allowHandle: hasExplicitHandleOverride(ctx, state.currentDoorId, state.botKey),
  });
}
