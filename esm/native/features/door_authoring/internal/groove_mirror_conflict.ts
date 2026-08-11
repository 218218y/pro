import {
  DEFAULT_FACE_SIGN,
  normalizeMirrorFaceSign,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
} from './surface_layout_contracts.js';
import { resolveMirrorPlacementInRect } from './mirror_geometry.js';
import {
  resolveGroovePlacementInRect,
  type GrooveLayoutRect,
} from '../../../../shared/groove_layout_contracts_shared.js';

type SurfaceRect = GrooveLayoutRect;

type PlacementRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function rectsOverlap(a: PlacementRect, b: PlacementRect): boolean {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}

function groovePlacementRect(rect: SurfaceRect, layout: unknown): PlacementRect {
  const placement = resolveGroovePlacementInRect({ rect, layout });
  return {
    minX: placement.centerX - placement.widthM / 2,
    maxX: placement.centerX + placement.widthM / 2,
    minY: placement.centerY - placement.heightM / 2,
    maxY: placement.centerY + placement.heightM / 2,
  };
}

function mirrorPlacementRectsForFace(args: {
  rect: SurfaceRect;
  mirrorLayouts: unknown;
  faceSign: unknown;
  defaultSurfaceFaceSign?: number;
}): PlacementRect[] {
  const defaultSurfaceFaceSign = normalizeMirrorFaceSign(args.defaultSurfaceFaceSign, DEFAULT_FACE_SIGN);
  const faceSign = normalizeMirrorFaceSign(args.faceSign, defaultSurfaceFaceSign);
  const layouts = readMirrorLayoutList(args.mirrorLayouts);

  if (!layouts.length) {
    if (faceSign !== defaultSurfaceFaceSign) return [];
    const placement = resolveMirrorPlacementInRect({ rect: args.rect, layout: null });
    return [
      {
        minX: placement.centerX - placement.mirrorWidthM / 2,
        maxX: placement.centerX + placement.mirrorWidthM / 2,
        minY: placement.centerY - placement.mirrorHeightM / 2,
        maxY: placement.centerY + placement.mirrorHeightM / 2,
      },
    ];
  }

  const out: PlacementRect[] = [];
  for (let index = 0; index < layouts.length; index += 1) {
    const layout = layouts[index];
    if (readMirrorLayoutFaceSign(layout, defaultSurfaceFaceSign) !== faceSign) continue;
    const placement = resolveMirrorPlacementInRect({ rect: args.rect, layout });
    out.push({
      minX: placement.centerX - placement.mirrorWidthM / 2,
      maxX: placement.centerX + placement.mirrorWidthM / 2,
      minY: placement.centerY - placement.mirrorHeightM / 2,
      maxY: placement.centerY + placement.mirrorHeightM / 2,
    });
  }
  return out;
}

export function doesGrooveLayoutOverlapMirrorOnFace(args: {
  rect: SurfaceRect;
  grooveLayout?: unknown;
  mirrorLayouts?: unknown;
  faceSign?: unknown;
  defaultSurfaceFaceSign?: number;
}): boolean {
  const mirrorRects = mirrorPlacementRectsForFace({
    rect: args.rect,
    mirrorLayouts: args.mirrorLayouts,
    faceSign: args.faceSign ?? DEFAULT_FACE_SIGN,
    defaultSurfaceFaceSign: args.defaultSurfaceFaceSign,
  });
  if (!mirrorRects.length) return false;

  const grooveRect = groovePlacementRect(args.rect, args.grooveLayout ?? null);
  return mirrorRects.some(mirrorRect => rectsOverlap(grooveRect, mirrorRect));
}
