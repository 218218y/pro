import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';

import type { InteriorOpsCallable } from './render_interior_ops_contracts.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';
import type { SketchBoxDoorVisualState } from './render_interior_sketch_boxes_fronts_door_visual_materials.js';
import type { SketchDoorStyle } from './render_interior_sketch_boxes_fronts_support.js';

export type SketchBoxDoorVisualRoute = 'special' | 'styled' | 'slab';

export type ResolvedSketchBoxDoorVisualRoute = {
  route: SketchBoxDoorVisualRoute;
  effectiveDoorStyle: SketchDoorStyle;
  createDoorVisual: InteriorOpsCallable | null | undefined;
  shouldUseClassicAccents: boolean;
};

export function resolveSketchBoxDoorVisualRoute(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  layout: ResolvedSketchBoxDoorLayout;
  doorVisualState: SketchBoxDoorVisualState;
}): ResolvedSketchBoxDoorVisualRoute {
  const { renderArgs, layout, doorVisualState } = args;
  const { frontsArgs, doorStyle, doorStyleMap } = renderArgs;
  const { createDoorVisual } = frontsArgs.args;
  const { doorPid } = layout;
  const { isFreePlacement } = frontsArgs.shell;

  const effectiveDoorStyle = resolveEffectiveDoorStyle(doorStyle, doorStyleMap, doorPid);
  const hasDoorVisualFactory = !!createDoorVisual;
  const isSpecialVisual = doorVisualState.isMirror || doorVisualState.isGlass;
  const canUseStyledDoorVisual = !!(
    hasDoorVisualFactory &&
    isFreePlacement === true &&
    (effectiveDoorStyle === 'profile' || effectiveDoorStyle === 'tom') &&
    !isSpecialVisual
  );

  if (hasDoorVisualFactory && isSpecialVisual) {
    return {
      route: 'special',
      effectiveDoorStyle,
      createDoorVisual,
      shouldUseClassicAccents: false,
    };
  }

  if (canUseStyledDoorVisual) {
    return {
      route: 'styled',
      effectiveDoorStyle,
      createDoorVisual,
      shouldUseClassicAccents: false,
    };
  }

  return {
    route: 'slab',
    effectiveDoorStyle,
    createDoorVisual,
    shouldUseClassicAccents: !doorVisualState.isMirror && !doorVisualState.isGlass,
  };
}
