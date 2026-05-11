import { tryHandleManualLayoutSketchHoverFreeFlow } from './canvas_picking_manual_layout_sketch_hover_free_flow.js';
import { tryHandleManualLayoutSketchHoverModuleFlow } from './canvas_picking_manual_layout_sketch_hover_module_flow.js';
import { tryHandleSketchHoverOverStandardDrawer } from './canvas_picking_manual_layout_sketch_hover_standard_drawer.js';
import { readManualLayoutSketchHoverRuntime } from './canvas_picking_manual_layout_sketch_hover_tools_shared.js';
import type { ManualLayoutSketchHoverPreviewArgs } from './canvas_picking_manual_layout_sketch_hover_tools_shared.js';
import { resolvePreferredManualLayoutSketchSelectorHit } from './canvas_picking_manual_layout_sketch_hover_tools_selector.js';

export function tryHandleManualLayoutSketchHoverPreviewImpl(
  args: ManualLayoutSketchHoverPreviewArgs
): boolean {
  const {
    App,
    ndcX,
    ndcY,
    __wpRaycaster,
    __wpMouse,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    __wp_resolveSketchFreeBoxGeometry,
    __wp_getSketchFreeBoxPartPrefix,
    __wp_findSketchFreeBoxLocalHit,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_findNearestSketchBoxDivider,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_findSketchModuleBoxAtPoint,
    __wp_readSketchBoxDividerXNorm,
    __wp_isCornerKey,
    __wp_isDefaultCornerCellCfgLike,
    __wp_resolveSketchBoxGeometry,
    __wp_resolveSketchFreeBoxHoverPlacement,
    __wp_writeSketchHover,
    __wp_toModuleKey,
    __wp_projectWorldPointToLocal,
  } = args;

  try {
    const runtime = readManualLayoutSketchHoverRuntime(args);
    if (!runtime) return false;

    const {
      tool,
      camera,
      wardrobeGroup,
      intersects,
      hidePreview,
      setPreview,
      hideSketchPreviewAndClearHover,
    } = runtime;

    if (
      tryHandleSketchHoverOverStandardDrawer({
        ...args,
        tool,
        setPreview: setPreview as ((previewArgs: Record<string, unknown>) => unknown) | null,
      })
    ) {
      return true;
    }

    const preferredSelector = resolvePreferredManualLayoutSketchSelectorHit({
      App,
      ndcX,
      ndcY,
      camera,
      wardrobeGroup,
      intersects,
      raycaster: __wpRaycaster,
      mouse: __wpMouse,
      toModuleKey: __wp_toModuleKey,
      projectWorldPointToLocal: __wp_projectWorldPointToLocal,
      intersectScreenWithLocalZPlane: __wp_intersectScreenWithLocalZPlane,
    });

    const hitModuleKey = preferredSelector?.moduleKey ?? null;
    const hitSelectorObj = preferredSelector?.obj ?? null;
    const hitStack = preferredSelector?.stack ?? 'top';
    const hitY = preferredSelector?.hitY ?? null;
    const hitLocalX = preferredSelector?.hitLocalX ?? null;
    const freeBoxSpec = __wp_parseSketchBoxToolSpec(tool);

    const runFreeHoverFlow = (forceStandalone = false) =>
      tryHandleManualLayoutSketchHoverFreeFlow({
        App,
        tool,
        hitModuleKey: forceStandalone ? null : hitModuleKey,
        hitY: forceStandalone ? null : hitY,
        ndcX,
        ndcY,
        camera,
        wardrobeGroup,
        intersects,
        setPreview,
        __wpRaycaster,
        __wpMouse,
        __hideSketchPreviewAndClearHover: hideSketchPreviewAndClearHover,
        __wp_parseSketchBoxToolSpec,
        __wp_pickSketchFreeBoxHost,
        __wp_measureWardrobeLocalBox,
        __wp_intersectScreenWithLocalZPlane,
        __wp_readInteriorModuleConfigRef,
        __wp_resolveSketchFreeBoxGeometry,
        __wp_getSketchFreeBoxPartPrefix,
        __wp_findSketchFreeBoxLocalHit,
        __wp_readSketchBoxDividers,
        __wp_resolveSketchBoxSegments,
        __wp_pickSketchBoxSegment,
        __wp_findNearestSketchBoxDivider,
        __wp_resolveSketchBoxDividerPlacement,
        __wp_findSketchModuleBoxAtPoint,
        __wp_readSketchBoxDividerXNorm,
        __wp_resolveSketchFreeBoxHoverPlacement,
        __wp_writeSketchHover,
      });

    if (hitModuleKey == null || typeof hitY !== 'number') return runFreeHoverFlow();

    if (freeBoxSpec) {
      // Important: once a module selector was actually hit, keep the interaction scoped to that module.
      // Do NOT demote back to standalone free-placement just because the infinite wardrobe-back plane
      // projects outside the wardrobe bounds from the current camera angle. That projection can pass
      // "through" side walls / backs and incorrectly win over the real module the user is pointing at.
      // Free placement should only run when no module was hit in the first place.
    }

    return tryHandleManualLayoutSketchHoverModuleFlow({
      App,
      tool,
      freeBoxSpec,
      hitModuleKey,
      hitSelectorObj,
      hitStack,
      hitY,
      hitLocalX,
      intersects,
      setPreview,
      hidePreview: hidePreview || null,
      __hideSketchPreviewAndClearHover: hideSketchPreviewAndClearHover,
      __wp_isCornerKey,
      __wp_isDefaultCornerCellCfgLike,
      __wp_resolveSketchBoxGeometry,
      __wp_findSketchModuleBoxAtPoint,
      __wp_readSketchBoxDividers,
      __wp_resolveSketchBoxSegments,
      __wp_pickSketchBoxSegment,
      __wp_findNearestSketchBoxDivider,
      __wp_resolveSketchBoxDividerPlacement,
      __wp_readSketchBoxDividerXNorm,
      __wp_writeSketchHover,
    });
  } catch (_e) {}

  return false;
}
