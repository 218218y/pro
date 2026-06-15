import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';

import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import type {
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';

import { asMesh, readObject, readUnknownMap, asValueRecord } from './render_interior_sketch_shared.js';
import { applySketchModulePickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { resolveSketchFrontVisualState } from './render_interior_sketch_visuals_door_state.js';
import { resolveSketchGroovesEnabled } from './render_interior_sketch_grooves_visibility.js';

export function addSketchExternalDrawerFrontVisual(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  const frontVisualState = resolveSketchFrontVisualState(context.input, opPlan.partId);
  const cfg = asValueRecord(context.input.cfg);
  const fallbackConfig = asValueRecord(context.input.config);
  const groovesMap = readUnknownMap(cfg?.groovesMap) || readUnknownMap(fallbackConfig?.groovesMap);
  const hasGroove = !!(
    resolveSketchGroovesEnabled(context.input) &&
    groovesMap &&
    (groovesMap[`groove_${opPlan.partId}`] != null || groovesMap[opPlan.partId] != null)
  );
  opPlan.omitBoxFrontPanel = frontVisualState.isGlass;
  opPlan.omitConnectorPanel = frontVisualState.isGlass;
  const materialSet = resolveSketchExternalDrawerFrontMaterials(
    context,
    opPlan.frontMat,
    frontVisualState.isMirror
  );
  const visual = createSketchExternalDrawerFrontVisual(
    context,
    opPlan,
    materialSet,
    frontVisualState,
    hasGroove
  );
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
  const doorTrimMap = asValueRecord(cfg?.doorTrimMap) || asValueRecord(fallbackConfig?.doorTrimMap);
  appendDoorTrimVisuals({
    App: context.App,
    THREE: context.THREE,
    group: groupNode,
    partId: opPlan.partId,
    trims: doorTrimMap?.[opPlan.partId],
    doorWidth: opPlan.faceW,
    doorHeight: opPlan.visualH,
    doorMeshOffsetX: opPlan.faceOffsetX,
    frontZ: opPlan.visualD / 2 + 0.0015,
    faceSign: 1,
  });
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
  frontVisualState: ReturnType<typeof resolveSketchFrontVisualState>,
  hasGroove: boolean
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
      hasGroove && !frontVisualState.isGlass,
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
