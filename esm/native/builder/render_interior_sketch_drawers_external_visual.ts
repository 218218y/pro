import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';

import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import type {
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';

import { asMesh, readObject } from './render_interior_sketch_shared.js';
import { applySketchModulePickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { resolveSketchFrontVisualState } from './render_interior_sketch_visuals_door_state.js';

export function addSketchExternalDrawerFrontVisual(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  const frontVisualState = resolveSketchFrontVisualState(context.input, opPlan.partId);
  opPlan.omitBoxFrontPanel = frontVisualState.isGlass;
  opPlan.omitConnectorPanel = frontVisualState.isGlass;
  const materialSet = resolveSketchExternalDrawerFrontMaterials(
    context,
    opPlan.frontMat,
    frontVisualState.isMirror
  );
  const visual = createSketchExternalDrawerFrontVisual(context, opPlan, materialSet, frontVisualState);
  const visualObj =
    (readObject<InteriorGroupLike>(visual) || asMesh(visual)) ??
    new context.THREE.Mesh(
      new context.THREE.BoxGeometry(opPlan.faceW, opPlan.visualH, opPlan.visualD),
      frontVisualState.isMirror ? materialSet.frontFaceMat : opPlan.frontMat
    );

  visualObj.position?.set?.(opPlan.faceOffsetX, opPlan.faceOffsetY, 0);
  applySketchModulePickMetaDeep(visualObj, opPlan.partId, context.moduleKeyStr, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
  });
  if (context.outlineFn) context.outlineFn(visualObj);
  groupNode.add?.(visualObj);
}

function resolveSketchExternalDrawerFrontMaterials(
  context: SketchExternalDrawerRenderContext,
  frontMat: unknown,
  isMirror: boolean
): { frontFaceMat: unknown; frontBaseMat: unknown } {
  let frontFaceMat = frontMat;
  let frontBaseMat = context.bodyMat || frontMat;
  if (!isMirror) return { frontFaceMat, frontBaseMat };

  const resolvedMirrorMat = context.resolveCachedMirrorMaterial();
  if (resolvedMirrorMat) {
    frontFaceMat = resolvedMirrorMat;
    if (frontBaseMat === frontFaceMat) frontBaseMat = context.bodyMat || frontMat;
  } else {
    frontFaceMat = frontMat;
    frontBaseMat = context.bodyMat || frontMat;
  }
  return { frontFaceMat, frontBaseMat };
}

function createSketchExternalDrawerFrontVisual(
  context: SketchExternalDrawerRenderContext,
  opPlan: SketchExternalDrawerOpPlan,
  materialSet: { frontFaceMat: unknown; frontBaseMat: unknown },
  frontVisualState: ReturnType<typeof resolveSketchFrontVisualState>
): unknown {
  if (!context.isFn(context.input.createDoorVisual)) return null;

  try {
    const effectiveFrameStyle = resolveEffectiveDoorStyle(
      context.doorStyle,
      context.doorStyleMap,
      opPlan.partId
    );
    return context.input.createDoorVisual(
      opPlan.faceW,
      opPlan.visualH,
      opPlan.visualD,
      materialSet.frontFaceMat,
      frontVisualState.isGlass ? 'glass' : effectiveFrameStyle,
      false,
      frontVisualState.isMirror,
      frontVisualState.curtainType,
      frontVisualState.isMirror ? materialSet.frontBaseMat : context.bodyMat || opPlan.frontMat,
      1,
      false,
      frontVisualState.mirrorLayout,
      opPlan.partId,
      frontVisualState.isGlass ? { glassFrameStyle: effectiveFrameStyle } : null
    );
  } catch {
    return null;
  }
}
