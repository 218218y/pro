import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';

import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import type {
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { asMesh, readObject, readUnknownMap, asValueRecord } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { resolveSketchFrontVisualState } from './render_interior_sketch_visuals_door_state.js';
import { resolveSketchGroovesEnabled } from './render_interior_sketch_grooves_visibility.js';

export function addSketchBoxExternalDrawerFrontVisual(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  const { shell } = context;
  const { boxId: bid, isFreePlacement } = shell;
  const frontVisualState = resolveSketchFrontVisualState(context.input, opPlan.partId);
  const cfgSnapshot = asValueRecord(context.input.cfgSnapshot);
  const groovesMap = readUnknownMap(cfgSnapshot?.groovesMap);
  const hasGroove = !!(
    resolveSketchGroovesEnabled(context.input) &&
    groovesMap &&
    (groovesMap[`groove_${opPlan.partId}`] != null || groovesMap[opPlan.partId] != null)
  );
  opPlan.omitBoxFrontPanel = frontVisualState.isGlass;
  opPlan.omitConnectorPanel = frontVisualState.isGlass;
  const materialSet = resolveSketchBoxExternalDrawerFrontMaterials(
    context,
    opPlan.frontMat,
    frontVisualState.isMirror
  );
  const visual = createSketchBoxExternalDrawerFrontVisual(
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
  applySketchBoxPickMetaDeep(visualObj, opPlan.partId, context.moduleKeyStr, bid, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: opPlan.drawerId,
    __wpRegularExternalDrawer: opPlan.isRegularExternalDrawer === true,
    __wpSketchFreePlacement: isFreePlacement === true,
  });
  if (context.isFn(context.input.addOutlines)) context.input.addOutlines(visualObj);
  groupNode.add?.(visualObj);
  const doorTrimMap = asValueRecord(cfgSnapshot?.doorTrimMap);
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

function resolveSketchBoxExternalDrawerFrontMaterials(
  context: SketchBoxExternalDrawersContext,
  frontMat: unknown,
  isMirror: boolean
): { frontFaceMat: unknown; frontBaseMat: unknown } {
  const { boxMat } = context.shell;
  let frontFaceMat = frontMat;
  let frontBaseMat = boxMat || frontMat;
  if (!isMirror) return { frontFaceMat, frontBaseMat };

  const resolvedMirrorMat = context.resolveCachedMirrorMaterial();
  if (resolvedMirrorMat) {
    frontFaceMat = resolvedMirrorMat;
    if (frontBaseMat === frontFaceMat) frontBaseMat = boxMat || frontMat;
  } else {
    frontFaceMat = frontMat;
    frontBaseMat = boxMat || frontMat;
  }
  return { frontFaceMat, frontBaseMat };
}

function createSketchBoxExternalDrawerFrontVisual(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  materialSet: { frontFaceMat: unknown; frontBaseMat: unknown },
  frontVisualState: ReturnType<typeof resolveSketchFrontVisualState>,
  hasGroove: boolean
): unknown {
  if (!context.isFn(context.createDoorVisual)) return null;

  try {
    const effectiveFrameStyle = resolveEffectiveDoorStyle(
      context.doorStyle,
      context.doorStyleMap,
      opPlan.partId
    );
    return context.createDoorVisual(
      opPlan.faceW,
      opPlan.visualH,
      opPlan.visualD,
      materialSet.frontFaceMat,
      frontVisualState.isGlass ? 'glass' : effectiveFrameStyle,
      hasGroove && !frontVisualState.isGlass,
      frontVisualState.isMirror,
      frontVisualState.curtainType,
      frontVisualState.isMirror ? materialSet.frontBaseMat : context.shell.boxMat || opPlan.frontMat,
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
