import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { asFiniteNumberOrNaN, asNumberOrNull } from './canvas_picking_sketch_free_box_shared.js';
import {
  getSketchBoxAdornmentBaseHeight,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  type LocalPoint,
  readRecordNumber,
  readRecordIdentity,
  readRecordValue,
  type SelectorLocalBox,
  type SketchFreeBoxTarget,
  type SketchFreeHoverContentKind,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export type SketchFreeBoxTargetCandidate = {
  dist: number;
  rayHitIndex: number | null;
  target: SketchFreeBoxTarget;
};

function rayObjectMatchesPartPrefix(object: unknown, partPrefix: string): boolean {
  let node = object && typeof object === 'object' ? object : null;
  for (let depth = 0; node && depth < 12; depth += 1) {
    const userData = Reflect.get(node, 'userData') as unknown;
    if (userData && typeof userData === 'object' && !Array.isArray(userData)) {
      const partIdValue = Reflect.get(userData, 'partId') as unknown;
      const partId = typeof partIdValue === 'string' ? partIdValue : '';
      if (partId && (partId === partPrefix || partId.startsWith(`${partPrefix}_`))) return true;
    }
    const parent = Reflect.get(node, 'parent') as unknown;
    node = parent && typeof parent === 'object' ? parent : null;
  }
  return false;
}

function findRayHitIndexForPartPrefix(intersects: RaycastHitLike[], partPrefix: string): number | null {
  for (let i = 0; i < intersects.length; i += 1) {
    if (rayObjectMatchesPartPrefix(intersects[i]?.object, partPrefix)) return i;
  }
  return null;
}

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
    wardrobeWidth: asNumberOrNull(wardrobeBox.width) ?? 0,
    wardrobeDepth: asNumberOrNull(wardrobeBox.depth) ?? 0,
    backZ: wardrobeBackZ,
    centerX,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
  });
  const partPrefix = getSketchFreeBoxPartPrefix(hostModuleKey, readRecordValue(box, 'id') ?? index);
  const rayHitIndex = findRayHitIndexForPartPrefix(intersects, partPrefix);
  const localHit = findSketchFreeBoxLocalHit({ App, intersects, localParent, partPrefix });
  const placementWall = readRecordValue(box, 'placementWall');
  const isSideWallPlacement = placementWall === 'left' || placementWall === 'right';
  const frontPlaneZ = geo.innerBackZ + geo.innerD;
  const frontPlaneHit =
    !isSideWallPlacement && typeof projectPointerToLocalZPlane === 'function'
      ? projectPointerToLocalZPlane(frontPlaneZ)
      : null;

  // Door-profile visuals (raised frames, miter caps, grooves) are legitimate
  // descendants of the free box and therefore share the same `partPrefix`.
  // Using their raw raycast point for content placement makes the cursor snap to
  // the decorative rail that was hit instead of the box's usable front plane.
  // Back-wall boxes can project to the canonical box front plane when the caller can provide it.
  // Side-wall boxes are physically rotated after rendering, so a wardrobe-local Z projection is the
  // wrong plane; their remapped concrete hit is already in the box's canonical logical coordinates.
  const pointerHit = frontPlaneHit || localHit;
  const planeHitX = asFiniteNumberOrNaN(planeHit.x);
  const planeHitY = asFiniteNumberOrNaN(planeHit.y);
  const hitX = asNumberOrNull(pointerHit?.x) ?? planeHitX;
  const hitY = asNumberOrNull(pointerHit?.y) ?? planeHitY;
  const planeHitZ = asFiniteNumberOrNaN(planeHit.z);
  const hitZ = asNumberOrNull(pointerHit?.z) ?? (Number.isFinite(planeHitZ) ? planeHitZ : undefined);
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
            : {
                baseLegHeightCm: selectedBaseSpec?.baseLegHeightCm,
                baseLegPlatformMode: selectedBaseSpec?.baseLegPlatformMode,
              }
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
    rayHitIndex,
    target: {
      boxId: readRecordIdentity(box, 'id') || '',
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
