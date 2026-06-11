import {
  findSketchFreeHoverTargetBox,
  resolveSketchFreeSurfaceContentPreview,
} from './canvas_picking_sketch_free_surface_preview.js';
import type {
  SketchFreeBoxContentPreviewArgs,
  SketchFreeBoxContentPreviewResult,
  SketchFreeDoorPreviewArgs,
  SketchFreeStackPreviewArgs,
  SketchFreeSurfacePreviewResolverArgs,
  SketchFreeVerticalPreviewArgs,
} from './canvas_picking_sketch_free_box_content_preview_contracts.js';
import { resolveSketchFreeDoorContentPreview } from './canvas_picking_sketch_free_box_content_preview_doors.js';
import { resolveSketchFreeStackContentPreview } from './canvas_picking_sketch_free_box_content_preview_stack.js';
import { resolveSketchFreeVerticalContentPreview } from './canvas_picking_sketch_free_box_content_preview_vertical.js';

function isSketchFreeSurfaceKind(
  contentKind: string
): contentKind is SketchFreeSurfacePreviewResolverArgs['contentKind'] {
  return contentKind === 'divider' || contentKind === 'cornice' || contentKind === 'base';
}

function isSketchFreeVerticalKind(
  contentKind: string
): contentKind is SketchFreeVerticalPreviewArgs['contentKind'] {
  return contentKind === 'shelf' || contentKind === 'rod' || contentKind === 'storage';
}

function isSketchFreeStackKind(
  contentKind: string
): contentKind is SketchFreeStackPreviewArgs['contentKind'] {
  return contentKind === 'drawers' || contentKind === 'ext_drawers';
}

function isSketchFreeDoorKind(contentKind: string): contentKind is SketchFreeDoorPreviewArgs['contentKind'] {
  return contentKind === 'door' || contentKind === 'double_door' || contentKind === 'door_hinge';
}

export function resolveSketchFreeBoxContentPreview(
  args: SketchFreeBoxContentPreviewArgs
): SketchFreeBoxContentPreviewResult | null {
  const {
    App,
    tool,
    contentKind,
    host,
    freeBoxes,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    intersects,
    localParent,
    resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
  } = args;

  const surfaceKind = isSketchFreeSurfaceKind(contentKind) ? contentKind : null;
  const verticalKind = isSketchFreeVerticalKind(contentKind) ? contentKind : null;
  const stackKind = isSketchFreeStackKind(contentKind) ? contentKind : null;
  const doorKind = isSketchFreeDoorKind(contentKind) ? contentKind : null;
  const previewKind = surfaceKind
    ? 'surface'
    : verticalKind
      ? 'vertical'
      : stackKind
        ? 'stack'
        : doorKind
          ? 'door'
          : null;
  if (!previewKind) return null;

  const target = findSketchFreeHoverTargetBox({
    App,
    tool,
    contentKind,
    hostModuleKey: host.moduleKey,
    freeBoxes,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    intersects,
    localParent,
    resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit,
  });
  if (!target) return null;

  if (surfaceKind) {
    const surfacePreview = resolveSketchFreeSurfaceContentPreview({
      tool,
      contentKind: surfaceKind,
      host,
      target,
      wardrobeBox,
      readSketchBoxDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
      findNearestSketchBoxDivider,
      resolveSketchBoxDividerPlacement,
      readSketchBoxDividerXNorm,
    } satisfies SketchFreeSurfacePreviewResolverArgs);
    return surfacePreview ? { mode: 'preview', ...surfacePreview } : null;
  }

  if (verticalKind) {
    return resolveSketchFreeVerticalContentPreview({
      tool,
      contentKind: verticalKind,
      host,
      target,
      readSketchBoxDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
    } satisfies SketchFreeVerticalPreviewArgs);
  }

  if (stackKind) {
    return resolveSketchFreeStackContentPreview({
      tool,
      contentKind: stackKind,
      host,
      target,
      readSketchBoxDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
    } satisfies SketchFreeStackPreviewArgs);
  }

  if (!doorKind) return null;

  return resolveSketchFreeDoorContentPreview({
    tool,
    contentKind: doorKind,
    host,
    target,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  } satisfies SketchFreeDoorPreviewArgs);
}
