import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { applyUiRawScalarPatch, setUiFlag } from '../actions/store_actions.js';
import { applyStructureTemplateRecomputeBatch, structureTabReportNonFatal } from './structure_tab_core.js';
import {
  buildRawUiPatch,
  normalizeDoorsValue,
  readRawPatch,
  type StructureTabStackSplitField,
  type StructureUiPatch,
} from './structure_tab_structure_mutations_shared.js';

export function setStackSplitLowerLinkModeValue(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  field: StructureTabStackSplitField;
  nextManual: boolean;
  wardrobeType: string;
  depth: number;
  width: number;
  doors: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
}): void {
  const {
    app,
    meta,
    field,
    nextManual,
    wardrobeType,
    depth,
    width,
    doors,
    stackSplitLowerDepth,
    stackSplitLowerWidth,
    stackSplitLowerDoors,
  } = args;

  const manualKey =
    field === 'depth'
      ? 'stackSplitLowerDepthManual'
      : field === 'width'
        ? 'stackSplitLowerWidthManual'
        : 'stackSplitLowerDoorsManual';

  const valueKey =
    field === 'depth'
      ? 'stackSplitLowerDepth'
      : field === 'width'
        ? 'stackSplitLowerWidth'
        : 'stackSplitLowerDoors';

  const topValue = field === 'depth' ? depth : field === 'width' ? width : doors;
  const curValue =
    field === 'depth'
      ? stackSplitLowerDepth
      : field === 'width'
        ? stackSplitLowerWidth
        : stackSplitLowerDoors;

  const nextValue = nextManual ? curValue : topValue;
  const normalizedValue =
    field === 'doors' ? normalizeDoorsValue(wardrobeType, Number(nextValue) || 0) : Number(nextValue) || 0;

  const uiPatch = buildRawUiPatch({ [manualKey]: nextManual, [valueKey]: normalizedValue });
  const source = `react:structure:stackSplit:link:${field}:${nextManual ? 'manual' : 'auto'}`;
  const m = meta.noBuildImmediate(source);

  try {
    applyStructureTemplateRecomputeBatch({
      app,
      source,
      meta: m,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        applyUiRawScalarPatch(app, readRawPatch(uiPatch), m);
      },
    });
  } catch (err) {
    structureTabReportNonFatal('setStackSplitLowerLinkModeValue', err);
  }
}

export function toggleStackSplitState(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  stackSplitEnabled: boolean;
  height: number;
  depth: number;
  width: number;
  doors: number;
  wardrobeType: string;
  stackSplitLowerHeight: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
}): void {
  const {
    app,
    meta,
    stackSplitEnabled,
    height,
    depth,
    width,
    doors,
    wardrobeType,
    stackSplitLowerHeight,
    stackSplitLowerDepth,
    stackSplitLowerWidth,
    stackSplitLowerDoors,
    stackSplitLowerDepthManual,
    stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual,
  } = args;

  const source = 'react:structure:stackSplit';

  if (stackSplitEnabled) {
    const m = meta.noBuildImmediate(source + ':off');
    try {
      applyStructureTemplateRecomputeBatch({
        app,
        source: source + ':off',
        meta: m,
        uiPatch: { stackSplitEnabled: false },
        statePatch: { ui: { stackSplitEnabled: false } },
        mutate: () => {
          setUiFlag(app, 'stackSplitEnabled', false, m);
        },
      });
    } catch (err) {
      structureTabReportNonFatal('toggleStackSplitState.disable', err);
    }
    return;
  }

  const minTopCm = 40;
  const maxBottom = Math.max(0, height - minTopCm);
  const seededBottomHeight =
    Number.isFinite(stackSplitLowerHeight) && stackSplitLowerHeight > 0
      ? stackSplitLowerHeight
      : Math.min(60, maxBottom || 60);
  const bottomHeight = Math.max(20, Math.min(seededBottomHeight, maxBottom || seededBottomHeight));

  const seededBottomDepth =
    Number.isFinite(stackSplitLowerDepth) && stackSplitLowerDepth > 0
      ? stackSplitLowerDepth
      : Math.max(20, Math.min(depth - 5, depth));
  const bottomDepth = Math.max(20, seededBottomDepth);

  const seededBottomWidth =
    Number.isFinite(stackSplitLowerWidth) && stackSplitLowerWidth > 0 ? stackSplitLowerWidth : width;
  const bottomWidth = Math.max(20, seededBottomWidth);

  const seededBottomDoors =
    Number.isFinite(stackSplitLowerDoors) && stackSplitLowerDoors > 0 ? stackSplitLowerDoors : doors;
  const bottomDoors = normalizeDoorsValue(wardrobeType, seededBottomDoors);

  const uiPatch: StructureUiPatch = {
    stackSplitEnabled: true,
    raw: {
      stackSplitLowerHeight: bottomHeight,
      stackSplitLowerDepth: bottomDepth,
      stackSplitLowerWidth: bottomWidth,
      stackSplitLowerDoors: bottomDoors,
      stackSplitLowerDepthManual: !!stackSplitLowerDepthManual,
      stackSplitLowerWidthManual: !!stackSplitLowerWidthManual,
      stackSplitLowerDoorsManual: !!stackSplitLowerDoorsManual,
    },
  };
  const m = meta.noBuildImmediate(source + ':on');

  try {
    applyStructureTemplateRecomputeBatch({
      app,
      source: source + ':on',
      meta: m,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiFlag(app, 'stackSplitEnabled', true, m);
        applyUiRawScalarPatch(app, readRawPatch(uiPatch), m);
      },
    });
  } catch (err) {
    structureTabReportNonFatal('toggleStackSplitState.enable', err);
  }
}
