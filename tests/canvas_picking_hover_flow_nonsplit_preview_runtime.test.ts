import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasNonSplitDoorPreviewRoute } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts';
import { tryHandleCanvasNonSplitPaintPreviewRoute } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_paint.ts';
import { tryHandleCanvasNonSplitInteriorPreviewRoutes } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.ts';
import type {
  HandleCanvasNonSplitHoverArgs,
  NonSplitPreviewRouteArgs,
} from '../esm/native/services/canvas_picking_hover_flow_nonsplit_contracts.ts';

function createHoverArgs(
  overrides: Partial<HandleCanvasNonSplitHoverArgs> = {}
): HandleCanvasNonSplitHoverArgs {
  return {
    App: {} as never,
    ndcX: 0.1,
    ndcY: -0.2,
    primaryMode: 'layout',
    paintSelection: null,
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: false,
    isExtDrawerEditMode: false,
    isDividerEditMode: false,
    isCellDimsMode: false,
    raycaster: {} as never,
    mouse: {} as never,
    doorMarker: null,
    cutMarker: null,
    previewRo: null,
    hideLayoutPreview: null,
    hideSketchPreview: null,
    setSketchPreview: null,
    setLayoutPreview: null,
    ...overrides,
  };
}

test('non-split door preview forwards preferred face state and hides the live marker on miss', () => {
  const doorMarker = { visible: true } as { visible: boolean };
  let captured: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasNonSplitDoorPreviewRoute(
    {
      hoverArgs: createHoverArgs({
        paintSelection: 'oak',
        doorMarker: doorMarker as never,
      }),
      facePreviewState: {
        preferredFacePreviewPartId: 'd1_left',
        preferredFacePreviewHitObject: { id: 'front' },
      },
    } satisfies NonSplitPreviewRouteArgs,
    {
      tryHandleDoorActionHover: args => {
        captured = args as Record<string, unknown>;
        return false;
      },
    }
  );

  assert.equal(handled, false);
  assert.equal(doorMarker.visible, false);
  assert.equal(captured?.preferredFacePreviewPartId, 'd1_left');
  assert.equal(captured?.paintUsesWardrobeGroup, true);
  assert.equal(captured?.readUi instanceof Function, true);
});

test('non-split paint preview normalizes preview render ops to null before delegating', () => {
  let captured: Record<string, unknown> | null = null;
  const handled = tryHandleCanvasNonSplitPaintPreviewRoute(createHoverArgs({ paintSelection: 'ivory' }), {
    tryHandleGenericPartPaintHover: args => {
      captured = args as Record<string, unknown>;
      return true;
    },
  });

  assert.equal(handled, true);
  assert.equal(captured?.paintSelection, 'ivory');
  assert.equal(captured?.previewRo, null);
});

test('non-split interior preview stops at the first handled route and does not fan out further', () => {
  const calls: string[] = [];
  const handled = tryHandleCanvasNonSplitInteriorPreviewRoutes(
    createHoverArgs({ isExtDrawerEditMode: true }),
    {
      tryHandleCanvasIntDrawerHover: () => {
        calls.push('int');
        return false;
      },
      tryHandleExtDrawersHoverPreview: args => {
        calls.push(`ext:${String((args as Record<string, unknown>).isExtDrawerEditMode)}`);
        return true;
      },
      tryHandleDrawerDividerHoverPreview: () => {
        calls.push('divider');
        return false;
      },
      tryHandleCanvasLayoutFamilyHover: () => {
        calls.push('layout');
        return false;
      },
      tryHandleCellDimsHoverPreview: () => {
        calls.push('cell');
        return false;
      },
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, ['int', 'ext:true']);
});

test('non-split interior preview reaches cell-dims with the canonical helper surface when earlier routes miss', () => {
  let captured: Record<string, unknown> | null = null;
  const handled = tryHandleCanvasNonSplitInteriorPreviewRoutes(
    createHoverArgs({ isCellDimsMode: true, previewRo: { kind: 'preview' } as never }),
    {
      tryHandleCanvasIntDrawerHover: () => false,
      tryHandleExtDrawersHoverPreview: () => false,
      tryHandleDrawerDividerHoverPreview: () => false,
      tryHandleCanvasLayoutFamilyHover: () => false,
      tryHandleCellDimsHoverPreview: args => {
        captured = args as Record<string, unknown>;
        return true;
      },
    }
  );

  assert.equal(handled, true);
  assert.equal(captured?.isCellDimsMode, true);
  assert.equal((captured?.readCellDimsDraft as Function) instanceof Function, true);
  assert.equal((captured?.getCellDimsHoverOp as Function) instanceof Function, true);
  assert.equal(captured?.previewRo && typeof captured.previewRo, 'object');
});
