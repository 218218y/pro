import type { AppContainer, UnknownRecord } from '../../../types';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { commitSketchFreePlacementHoverRecord } from './canvas_picking_sketch_free_commit.js';
import {
  decodeSketchBoxContentCommandHover,
  isStrictSketchBoxContentKind,
  SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
} from './canvas_picking_sketch_box_content_command.js';
import {
  decodeSketchStructuralCommandHover,
  isStrictSketchStructuralContentKind,
  SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
  type SketchStructuralContentKind,
} from './canvas_picking_sketch_structural_command.js';
import type { SketchFreeHoverHost as SketchFreeBoxHost } from './canvas_picking_sketch_free_surface_preview.js';

const FREE_BOX_VERTICAL_REMOVAL_CONTENT_KINDS = ['shelf', 'rod', 'storage'] as const;
type FreeBoxVerticalRemovalContentKind = (typeof FREE_BOX_VERTICAL_REMOVAL_CONTENT_KINDS)[number];

function isStackFreeBoxContentKind(contentKind: string | null): boolean {
  return contentKind === 'drawers' || contentKind === 'ext_drawers';
}

function isVerticalFreeBoxContentKind(
  contentKind: string | null
): contentKind is FreeBoxVerticalRemovalContentKind {
  return (FREE_BOX_VERTICAL_REMOVAL_CONTENT_KINDS as readonly string[]).includes(String(contentKind || ''));
}

function findRecentStructuralCommandHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreeBoxHost;
  expectedContentKind?: SketchStructuralContentKind | null;
}): { hoverRec: UnknownRecord; contentKind: SketchStructuralContentKind } | null {
  const hoverRec = matchRecentSketchHover({
    hover: args.hover,
    tool: args.tool,
    kind: SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
    host: args.host,
    toModuleKey: __wp_toModuleKey,
  });
  if (!hoverRec) return null;
  const decoded = decodeSketchStructuralCommandHover(hoverRec);
  if (!decoded.ok || !decoded.value.command.freePlacement) return null;
  if (args.expectedContentKind && decoded.value.contentKind !== args.expectedContentKind) return null;
  return { hoverRec, contentKind: decoded.value.contentKind };
}

function findRecentVerticalRemovalHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreeBoxHost;
}): { hoverRec: UnknownRecord; contentKind: FreeBoxVerticalRemovalContentKind } | null {
  const match = findRecentStructuralCommandHover(args);
  if (
    !match ||
    match.contentKind === 'divider' ||
    match.contentKind === 'base' ||
    match.contentKind === 'cornice'
  )
    return null;
  const decoded = decodeSketchStructuralCommandHover(match.hoverRec);
  if (
    !decoded.ok ||
    decoded.value.command.op !== 'remove' ||
    !isVerticalFreeBoxContentKind(match.contentKind)
  )
    return null;
  return { hoverRec: match.hoverRec, contentKind: match.contentKind };
}

function findRecentStrictBoxCommandHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreeBoxHost;
  contentKind: string;
}): UnknownRecord | null {
  if (!isStrictSketchBoxContentKind(args.contentKind)) return null;
  const hoverRec = matchRecentSketchHover({
    hover: args.hover,
    tool: args.tool,
    kind: SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
    host: args.host,
    toModuleKey: __wp_toModuleKey,
  });
  const decoded = decodeSketchBoxContentCommandHover(hoverRec);
  if (!decoded.ok) return null;
  if (decoded.value.contentKind !== args.contentKind || !decoded.value.command.freePlacement) return null;
  return hoverRec;
}

type TryHandleCanvasManualSketchFreeContentArgs = {
  App: AppContainer;
  tool: string;
  foundModuleIndex: number | 'corner' | `corner:${number}` | null;
  host: SketchFreeBoxHost | null;
  floorY: number;
  __wp_readSketchHover: (App: AppContainer) => unknown;
  __wp_writeSketchHover: (App: AppContainer, hover: UnknownRecord | null) => void;
  __wp_clearSketchHover: (App: AppContainer) => void;
  __wp_getSketchFreeBoxContentKind: (tool: string) => string | null;
};

export function tryHandleCanvasManualSketchFreeContentClick(
  args: TryHandleCanvasManualSketchFreeContentArgs
): boolean {
  const {
    App,
    tool,
    foundModuleIndex,
    host,
    floorY,
    __wp_readSketchHover,
    __wp_writeSketchHover,
    __wp_clearSketchHover,
    __wp_getSketchFreeBoxContentKind,
  } = args;

  const freeBoxContentKind = __wp_getSketchFreeBoxContentKind(tool);
  if (!freeBoxContentKind) return false;

  const currentHover = __wp_readSketchHover(App);
  if (
    host &&
    (isStackFreeBoxContentKind(freeBoxContentKind) || isVerticalFreeBoxContentKind(freeBoxContentKind))
  ) {
    const verticalRemoval = findRecentVerticalRemovalHover({ hover: currentHover, tool, host });
    if (verticalRemoval) {
      const commit = commitSketchFreePlacementHoverRecord({
        App,
        host,
        hoverRec: verticalRemoval.hoverRec,
        freeBoxContentKind: verticalRemoval.contentKind,
        floorY,
      });
      if (!commit.committed) return false;
      if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
      else __wp_clearSketchHover(App);
      return true;
    }
  }

  const hoverRec =
    host == null
      ? null
      : isStrictSketchBoxContentKind(freeBoxContentKind)
        ? findRecentStrictBoxCommandHover({
            hover: currentHover,
            tool,
            host,
            contentKind: freeBoxContentKind,
          })
        : isStrictSketchStructuralContentKind(freeBoxContentKind)
          ? (findRecentStructuralCommandHover({
              hover: currentHover,
              tool,
              host,
              expectedContentKind: freeBoxContentKind,
            })?.hoverRec ?? null)
          : null;
  const hoverOk = !!hoverRec;
  if (!hoverOk && foundModuleIndex !== null) return false;
  if (!(host && hoverRec && hoverOk)) return false;

  const commit = commitSketchFreePlacementHoverRecord({
    App,
    host,
    hoverRec,
    freeBoxContentKind,
    floorY,
  });
  if (!commit.committed) return false;
  if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
  else __wp_clearSketchHover(App);
  return true;
}
