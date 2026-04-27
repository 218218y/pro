import type { AppContainer, UnknownRecord } from '../../../types';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { commitSketchFreePlacementHoverRecord } from './canvas_picking_sketch_free_commit.js';
import type { SketchFreeHoverHost as SketchFreeBoxHost } from './canvas_picking_sketch_free_surface_preview.js';

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

  const hoverRec =
    host != null
      ? matchRecentSketchHover({
          hover: __wp_readSketchHover(App),
          tool,
          kind: 'box_content',
          contentKind: freeBoxContentKind,
          host,
          toModuleKey: __wp_toModuleKey,
          requireFreePlacement: true,
        })
      : null;
  const hoverOk = !!(host && hoverRec && hoverRec.freePlacement === true);
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
