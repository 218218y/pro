import {
  findSketchFreeBoxLocalHit,
  resolveSketchFreeBoxHoverPlacement,
} from './canvas_picking_sketch_free_boxes.js';
import {
  addSketchBoxDividerState,
  addSketchBoxHorizontalDividerState,
  applySketchBoxDividerState,
  findNearestSketchBoxDivider,
  findNearestSketchBoxHorizontalDivider,
  getSketchFreeBoxContentKind,
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividerXNorm,
  readSketchBoxHorizontalDividers,
  readSketchBoxDividers,
  removeSketchBoxDividerState,
  removeSketchBoxHorizontalDividerState,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from './canvas_picking_sketch_box_dividers.js';
import { __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers_runtime.js';

type __SketchFreeBoxLocalHitArgs = Omit<
  Parameters<typeof findSketchFreeBoxLocalHit>[0],
  'projectWorldPointToLocal'
>;

export const __wp_findSketchFreeBoxLocalHit = (args: __SketchFreeBoxLocalHitArgs) =>
  findSketchFreeBoxLocalHit({
    ...args,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
  });

type __SketchFreeBoxHoverPlacementArgs = Omit<
  Parameters<typeof resolveSketchFreeBoxHoverPlacement>[0],
  'projectWorldPointToLocal'
>;

export const __wp_resolveSketchFreeBoxHoverPlacement = (args: __SketchFreeBoxHoverPlacementArgs) =>
  resolveSketchFreeBoxHoverPlacement({
    ...args,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
  });

export const __wp_readSketchBoxDividerXNorm = readSketchBoxDividerXNorm;
export const __wp_readSketchBoxDividers = readSketchBoxDividers;
export const __wp_readSketchBoxHorizontalDividers = readSketchBoxHorizontalDividers;
export const __wp_addSketchBoxDividerState = addSketchBoxDividerState;
export const __wp_addSketchBoxHorizontalDividerState = addSketchBoxHorizontalDividerState;
export const __wp_removeSketchBoxDividerState = removeSketchBoxDividerState;
export const __wp_removeSketchBoxHorizontalDividerState = removeSketchBoxHorizontalDividerState;
export const __wp_findNearestSketchBoxDivider = findNearestSketchBoxDivider;
export const __wp_findNearestSketchBoxHorizontalDivider = findNearestSketchBoxHorizontalDivider;
export const __wp_resolveSketchBoxDividerPlacement = resolveSketchBoxDividerPlacement;
export const __wp_resolveSketchBoxHorizontalDividerPlacement = resolveSketchBoxHorizontalDividerPlacement;
export const __wp_resolveSketchBoxSegments = resolveSketchBoxSegments;
export const __wp_resolveSketchBoxVerticalSegments = resolveSketchBoxVerticalSegments;
export const __wp_pickSketchBoxSegment = pickSketchBoxSegment;
export const __wp_pickSketchBoxVerticalSegment = pickSketchBoxVerticalSegment;
export const __wp_applySketchBoxDividerState = applySketchBoxDividerState;
export const __wp_getSketchFreeBoxContentKind = getSketchFreeBoxContentKind;
