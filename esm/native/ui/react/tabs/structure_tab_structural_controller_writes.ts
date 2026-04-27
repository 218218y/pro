import {
  setUiBaseLegColor,
  setUiBaseLegHeightCm,
  setUiBaseLegWidthCm,
  setUiBaseLegStyle,
  setUiBaseType,
  setUiSlidingTracksColor,
} from '../actions/store_actions.js';
import {
  commitStructureRawValue,
  setStackSplitLowerLinkModeValue,
  toggleStackSplitState,
} from './structure_tab_shared.js';
import type {
  CreateStructureTabStructuralControllerArgs,
  StructureTabStructuralController,
} from './structure_tab_structural_controller_contracts.js';
import type { DisplayedValueReader } from './structure_tab_structure_mutations_shared.js';
import { readUiRawNumberFromApp } from './structure_tab_structural_controller_shared.js';

export function createStructureTabStructuralWriteController(
  args: CreateStructureTabStructuralControllerArgs
): Pick<
  StructureTabStructuralController,
  | 'setRaw'
  | 'setStackSplitLowerLinkMode'
  | 'toggleStackSplit'
  | 'setBaseType'
  | 'setBaseLegStyle'
  | 'setBaseLegColor'
  | 'setBaseLegHeightCm'
  | 'setBaseLegWidthCm'
  | 'setSlidingTracksColor'
> {
  const getDisplayedRawValue: DisplayedValueReader = key => {
    switch (key) {
      case 'width':
        return Number(args.width) || 0;
      case 'height':
        return Number(args.height) || 0;
      case 'depth':
        return Number(args.depth) || 0;
      case 'doors':
        return Number(args.doors) || 0;
      case 'stackSplitLowerHeight':
        return Number(args.stackSplitLowerHeight) || 0;
      case 'stackSplitLowerDepth':
        return Number(args.stackSplitLowerDepth) || 0;
      case 'stackSplitLowerWidth':
        return Number(args.stackSplitLowerWidth) || 0;
      case 'stackSplitLowerDoors':
        return Number(args.stackSplitLowerDoors) || 0;
      case 'cellDimsWidth':
      case 'cellDimsHeight':
      case 'cellDimsDepth':
        return readUiRawNumberFromApp(args.app, key);
      default:
        return 0;
    }
  };

  return {
    setRaw(key, nextValue) {
      commitStructureRawValue({
        app: args.app,
        meta: args.meta,
        key,
        nextValue,
        getDisplayedRawValue,
        wardrobeType: args.wardrobeType,
        isManualWidth: args.isManualWidth,
        width: args.width,
        doors: args.doors,
        structureSelectRaw: args.structureSelectRaw,
        singleDoorPosRaw: args.singleDoorPosRaw,
      });
    },

    setStackSplitLowerLinkMode(field: 'depth' | 'width' | 'doors', nextManual: boolean) {
      setStackSplitLowerLinkModeValue({
        app: args.app,
        meta: args.meta,
        field,
        nextManual,
        wardrobeType: args.wardrobeType,
        depth: args.depth,
        width: args.width,
        doors: args.doors,
        stackSplitLowerDepth: args.stackSplitLowerDepth,
        stackSplitLowerWidth: args.stackSplitLowerWidth,
        stackSplitLowerDoors: args.stackSplitLowerDoors,
      });
    },

    toggleStackSplit() {
      toggleStackSplitState({
        app: args.app,
        meta: args.meta,
        stackSplitEnabled: args.stackSplitEnabled,
        height: args.height,
        depth: args.depth,
        width: args.width,
        doors: args.doors,
        wardrobeType: args.wardrobeType,
        stackSplitLowerHeight: args.stackSplitLowerHeight,
        stackSplitLowerDepth: args.stackSplitLowerDepth,
        stackSplitLowerWidth: args.stackSplitLowerWidth,
        stackSplitLowerDoors: args.stackSplitLowerDoors,
        stackSplitLowerDepthManual: args.stackSplitLowerDepthManual,
        stackSplitLowerWidthManual: args.stackSplitLowerWidthManual,
        stackSplitLowerDoorsManual: args.stackSplitLowerDoorsManual,
      });
    },

    setBaseType(next: 'plinth' | 'legs' | 'none') {
      setUiBaseType(args.app, next, { source: 'react:structure:baseType', immediate: true });
    },

    setBaseLegStyle(next) {
      setUiBaseLegStyle(args.app, next, { source: 'react:structure:baseLegStyle', immediate: true });
    },

    setBaseLegColor(next) {
      setUiBaseLegColor(args.app, next, { source: 'react:structure:baseLegColor', immediate: true });
    },

    setBaseLegHeightCm(next) {
      setUiBaseLegHeightCm(args.app, next, {
        source: 'react:structure:baseLegHeightCm',
        immediate: true,
      });
    },

    setBaseLegWidthCm(next) {
      setUiBaseLegWidthCm(args.app, next, {
        source: 'react:structure:baseLegWidthCm',
        immediate: true,
      });
    },

    setSlidingTracksColor(next: 'nickel' | 'black') {
      setUiSlidingTracksColor(args.app, next, {
        source: 'react:structure:slidingTracksColor',
        immediate: true,
      });
    },
  };
}
