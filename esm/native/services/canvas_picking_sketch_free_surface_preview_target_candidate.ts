import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import {
  getSketchBoxAdornmentBaseHeight,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  type LocalPoint,
  readRecordNumber,
  readRecordString,
  readRecordValue,
  type SelectorLocalBox,
  type SketchFreeBoxTarget,
  type SketchFreeHoverContentKind,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export type SketchFreeBoxTargetCandidate = {
  dist: number;
  target: SketchFreeBoxTarget;
};

export function resolveSketchFreeHoverTargetCandidate(args: {
  App: AppContainer;
  tool: string;
  contentKind: SketchFreeHoverContentKind;
  hostModuleKey: SketchFreeHoverHost['moduleKey'];
  box: Record<string, unknown>;
  index: number;
  planeHit: LocalPoint;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  intersects: RaycastHitLike[];
  localParent: unknown;
  resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  getSketchFreeBoxPartPrefix: (moduleKey: SketchFreeHoverHost['moduleKey'], boxId: unknown) => string;
  findSketchFreeBoxLocalHit: (args: {
    App: AppContainer;
    intersects: RaycastHitLike[];
    localParent: unknown;
    partPrefix: string;
  }) => LocalPoint | null;
  projectPointerToLocalZPlane?: ((planeZ: number) => LocalPoint | null) | null;
}): SketchFreeBoxTargetCandidate | null {
  const {
    App,
    tool,
    contentKind,
    hostModuleKey,
    box,
    index,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    intersects,
    localParent,
    resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit,
    projectPointerToLocalZPlane,
  } = args;
  if (readRecordValue(box, 'freePlacement') !== true) return null;
  const centerX = readRecordNumber(box, 'absX');
  const centerY = readRecordNumber(box, 'absY');
  const heightM = readRecordNumber(box, 'heightM');
  if (centerX == null || centerY == null || heightM == null || !(heightM > 0)) return null;
  const widthM = readRecordNumber(box, 'widthM');
  const depthM = readRecordNumber(box, 'depthM');
  const geo = resolveSketchFreeBoxGeometry({
    wardrobeWidth: Number(wardrobeBox.width) || 0,
    wardrobeDepth: Number(wardrobeBox.depth) || 0,
    backZ: wardrobeBackZ,
    centerX,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
  });
  const partPrefix = getSketchFreeBoxPartPrefix(hostModuleKey, readRecordValue(box, 'id') ?? index);
  const localHit = findSketchFreeBoxLocalHit({ App, intersects, localParent, partPrefix });
  const frontPlaneZ = geo.innerBackZ + geo.innerD;
  const frontPlaneHit =
    typeof projectPointerToLocalZPlane === 'function' ? projectPointerToLocalZPlane(frontPlaneZ) : null;

  // Door-profile visuals (raised frames, miter caps, grooves) are legitimate
  // descendants of the free box and therefore share the same `partPrefix`.
  // Using their raw raycast point for content placement makes the cursor snap to
  // the decorative rail that was hit instead of the box's usable front plane.
  // Project to the canonical box front plane whenever the caller can provide it,
  // while still using the concrete local hit to choose which free box wins.
  const pointerHit = frontPlaneHit || localHit;
  const planeHitX = Number(planeHit.x);
  const planeHitY = Number(planeHit.y);
  const hitX = pointerHit && Number.isFinite(Number(pointerHit.x)) ? Number(pointerHit.x) : planeHitX;
  const hitY = pointerHit && Number.isFinite(Number(pointerHit.y)) ? Number(pointerHit.y) : planeHitY;
  const planeHitZ = Number(planeHit.z);
  const hitZ =
    pointerHit && Number.isFinite(Number(pointerHit.z))
      ? Number(pointerHit.z)
      : Number.isFinite(planeHitZ)
        ? planeHitZ
        : undefined;
  const dx = Math.abs(hitX - centerX);
  const tolX = Math.max(0.02, Math.min(0.06, geo.outerW * 0.16));
  const tolY = Math.max(0.02, Math.min(0.06, heightM * 0.16));
  const selectedBaseSpec = contentKind === 'base' ? parseSketchBoxBaseToolSpec(tool) : null;
  const selectedBaseHeight =
    contentKind === 'base'
      ? getSketchBoxAdornmentBaseHeight(
          selectedBaseSpec?.baseType || parseSketchBoxBaseTool(tool) || 'plinth',
          selectedBaseSpec?.baseType === 'plinth'
            ? { basePlinthHeightCm: selectedBaseSpec.basePlinthHeightCm }
            : { baseLegHeightCm: selectedBaseSpec?.baseLegHeightCm }
        )
      : 0;
  const currentBaseHeight = getSketchBoxAdornmentBaseHeight(readRecordValue(box, 'baseType'), box);
  const baseHoverExtra = contentKind === 'base' ? Math.max(currentBaseHeight, selectedBaseHeight) + 0.03 : 0;
  const topHoverExtra = contentKind === 'cornice' ? 0.05 : 0;
  const minHitY = centerY - heightM / 2 - tolY - baseHoverExtra;
  const maxHitY = centerY + heightM / 2 + tolY + topHoverExtra;
  if (dx > geo.outerW / 2 + tolX || hitY < minHitY || hitY > maxHitY) return null;
  return {
    dist: localHit ? -1 : dx + Math.abs(hitY - centerY),
    target: {
      boxId: readRecordString(box, 'id') || '',
      partPrefix,
      targetBox: box,
      targetGeo: geo,
      targetCenterY: centerY,
      targetHeight: heightM,
      pointerX: hitX,
      pointerY: hitY,
      pointerZ: hitZ,
    },
  };
}
