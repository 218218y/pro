import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { applyUiRawScalarPatch, setUiFlag } from '../actions/store_actions.js';
import { applyStructureTemplateRecomputeBatch, structureTabReportNonFatal } from './structure_tab_core.js';
import { normalizeStructureRawValue } from './structure_tab_dimension_constraints.js';
import {
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  STACK_SPLIT_LOWER_HEIGHT_MIN,
  STACK_SPLIT_LOWER_WIDTH_MIN,
  STACK_SPLIT_MIN_TOP_HEIGHT,
  WARDROBE_DEPTH_MIN,
} from '../../../services/api.js';
import {
  buildRawUiPatch,
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
  const valueKeyForBounds =
    field === 'depth'
      ? 'stackSplitLowerDepth'
      : field === 'width'
        ? 'stackSplitLowerWidth'
        : 'stackSplitLowerDoors';
  const normalizedValue =
    normalizeStructureRawValue({
      key: valueKeyForBounds,
      value: nextValue,
      wardrobeType,
      width,
      depth,
      doors,
    }) ?? (field === 'doors' ? Math.max(0, Math.round(Number(nextValue) || 0)) : Number(nextValue) || 0);

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

  const minTopCm = STACK_SPLIT_MIN_TOP_HEIGHT;
  const maxBottom = Math.max(0, height - minTopCm);
  const seededBottomHeight =
    Number.isFinite(stackSplitLowerHeight) && stackSplitLowerHeight > 0
      ? stackSplitLowerHeight
      : Math.min(DEFAULT_STACK_SPLIT_LOWER_HEIGHT, maxBottom || DEFAULT_STACK_SPLIT_LOWER_HEIGHT);
  const bottomHeight =
    normalizeStructureRawValue({
      key: 'stackSplitLowerHeight',
      value: seededBottomHeight,
      wardrobeType,
      height,
      width,
      depth,
    }) ??
    Math.max(STACK_SPLIT_LOWER_HEIGHT_MIN, Math.min(seededBottomHeight, maxBottom || seededBottomHeight));

  const seededBottomDepth =
    Number.isFinite(stackSplitLowerDepth) && stackSplitLowerDepth > 0
      ? stackSplitLowerDepth
      : Math.max(WARDROBE_DEPTH_MIN, Math.min(depth - 5, depth));
  const bottomDepth =
    normalizeStructureRawValue({
      key: 'stackSplitLowerDepth',
      value: seededBottomDepth,
      wardrobeType,
      height,
      width,
      depth,
    }) ?? Math.max(WARDROBE_DEPTH_MIN, seededBottomDepth);

  const seededBottomWidth =
    Number.isFinite(stackSplitLowerWidth) && stackSplitLowerWidth > 0 ? stackSplitLowerWidth : width;
  const bottomWidth =
    normalizeStructureRawValue({
      key: 'stackSplitLowerWidth',
      value: seededBottomWidth,
      wardrobeType,
      height,
      width,
      depth,
    }) ?? Math.max(STACK_SPLIT_LOWER_WIDTH_MIN, seededBottomWidth);

  const seededBottomDoors =
    Number.isFinite(stackSplitLowerDoors) && stackSplitLowerDoors >= 0 ? stackSplitLowerDoors : doors;
  const bottomDoors =
    normalizeStructureRawValue({
      key: 'stackSplitLowerDoors',
      value: seededBottomDoors,
      wardrobeType,
      height,
      width,
      depth,
      doors,
    }) ?? Math.max(0, Math.round(Number(seededBottomDoors) || 0));

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
