import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import type {
  PartHoverPreviewCommand,
  PartHoverPreviewDecision,
} from './canvas_picking_part_hover_preview_protocol.js';
import { validatePartHoverPreviewCommand } from './canvas_picking_part_hover_preview_protocol.js';

export type PartHoverPreviewCallback = (args: SketchPlacementPreviewArgsLike) => unknown;

export type PartHoverPreviewRuntime = {
  canShow: boolean;
  apply: (decision: PartHoverPreviewDecision) => boolean;
};

function readSetSketchPlacementPreview(previewRo: unknown): PartHoverPreviewCallback | null {
  if (!previewRo || typeof previewRo !== 'object') return null;
  const candidate = (previewRo as UnknownRecord).setSketchPlacementPreview;
  return typeof candidate === 'function' ? (args: SketchPlacementPreviewArgsLike) => candidate(args) : null;
}

function createPreviewPayload(
  App: AppContainer,
  THREE: unknown,
  command?: PartHoverPreviewCommand
): SketchPlacementPreviewArgsLike {
  if (!command) return { App, THREE };
  return {
    App,
    THREE,
    anchor: command.anchor,
    anchorParent: command.anchorParent,
    kind: command.kind,
    ...(command.kind === 'object_boxes' ? { previewObjects: [...command.previewObjects] } : {}),
    fillFront: command.fillFront,
    fillBack: command.fillBack,
    overlayThroughScene: command.overlayThroughScene,
    x: command.x,
    y: command.y,
    z: command.z,
    w: command.w,
    boxH: command.boxH,
    d: command.d,
    woodThick: command.woodThick,
    op: command.op,
  };
}

function callPreviewCleanup(
  callback: PartHoverPreviewCallback | null | undefined,
  payload: SketchPlacementPreviewArgsLike
): void {
  if (typeof callback !== 'function') return;
  try {
    callback(payload);
  } catch {
    // hover-preview-cleanup: optional preview teardown is best-effort and must not block pointer flow
  }
}

export function createPartHoverPreviewRuntime(args: {
  App: AppContainer;
  hideLayoutPreview?: PartHoverPreviewCallback | null;
  hideSketchPreview?: PartHoverPreviewCallback | null;
  previewRo?: unknown;
}): PartHoverPreviewRuntime {
  const { App, hideLayoutPreview, hideSketchPreview, previewRo } = args;
  const THREE = getThreeMaybe(App);
  const setPreview = readSetSketchPlacementPreview(previewRo);
  const cleanupPayload = createPreviewPayload(App, THREE);

  return {
    canShow: !!setPreview,
    apply(decision) {
      if (decision.clearScope === 'layout' || decision.clearScope === 'layout-and-sketch') {
        callPreviewCleanup(hideLayoutPreview, cleanupPayload);
      }
      if (decision.clearScope === 'sketch' || decision.clearScope === 'layout-and-sketch') {
        callPreviewCleanup(hideSketchPreview, cleanupPayload);
      }
      if (decision.type === 'clear') return false;
      if (!setPreview) return false;

      const violations = validatePartHoverPreviewCommand(decision.command);
      if (violations.length > 0) return false;
      setPreview(createPreviewPayload(App, THREE, decision.command));
      return true;
    },
  };
}
