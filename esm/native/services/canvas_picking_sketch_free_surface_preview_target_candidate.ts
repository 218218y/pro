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
    woodThick: 0.018,
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
  });
  const partPrefix = getSketchFreeBoxPartPrefix(hostModuleKey, readRecordValue(box, 'id') ?? index);
  const localHit = findSketchFreeBoxLocalHit({ App, intersects, localParent, partPrefix });
  const planeHitX = Number(planeHit.x);
  const planeHitY = Number(planeHit.y);
  const hitX = localHit && Number.isFinite(Number(localHit.x)) ? Number(localHit.x) : planeHitX;
  const hitY = localHit && Number.isFinite(Number(localHit.y)) ? Number(localHit.y) : planeHitY;
  const dx = Math.abs(hitX - centerX);
  const tolX = Math.max(0.02, Math.min(0.06, geo.outerW * 0.16));
  const tolY = Math.max(0.02, Math.min(0.06, heightM * 0.16));
  const selectedBaseSpec = contentKind === 'base' ? parseSketchBoxBaseToolSpec(tool) : null;
  const selectedBaseHeight =
    contentKind === 'base'
      ? getSketchBoxAdornmentBaseHeight(
          selectedBaseSpec?.baseType || parseSketchBoxBaseTool(tool) || 'plinth',
          selectedBaseSpec?.baseLegHeightCm
        )
      : 0;
  const currentBaseHeight = getSketchBoxAdornmentBaseHeight(
    readRecordValue(box, 'baseType'),
    readRecordValue(box, 'baseLegHeightCm')
  );
  const baseHoverExtra = contentKind === 'base' ? Math.max(currentBaseHeight, selectedBaseHeight) + 0.03 : 0;
  const topHoverExtra = contentKind === 'cornice' ? 0.05 : 0;
  const minHitY = centerY - heightM / 2 - tolY - baseHoverExtra;
  const maxHitY = centerY + heightM / 2 + tolY + topHoverExtra;
  if (dx > geo.outerW / 2 + tolX || hitY < minHitY || hitY > maxHitY) return null;
  return {
    dist: localHit ? -1 : dx + Math.abs(hitY - centerY),
    target: {
      boxId: readRecordString(box, 'id') || '',
      targetBox: box,
      targetGeo: geo,
      targetCenterY: centerY,
      targetHeight: heightM,
      pointerX: hitX,
      pointerY: hitY,
    },
  };
}
