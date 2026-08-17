import type { RoomArchitectureConfigLike, RoomOpeningKind } from '../../../types';

import {
  createRoomOpeningPlacementDraft,
  isRoomOpeningTargetOccludedByWardrobe,
  planRoomOpeningAddition,
  planRoomOpeningRemoval,
  resolveRoomOpeningPlacementPlan,
  type RoomOpeningPlacementInput,
  type RoomOpeningPlacementPlan,
  type RoomOpeningPlacementPoint,
  type RoomOpeningPlacementSurface,
  type RoomOpeningWardrobeObstacle,
} from './room_opening_placement_plan.js';

const ROOM_OPENING_HOVER_KIND = 'room-opening-placement';
const CANVAS_HOVER_CURSOR_PRESERVE = '__wp_canvas_hover_cursor_preserve';

export type RoomOpeningPlacementHoverFeedback = {
  kind: typeof ROOM_OPENING_HOVER_KIND;
  cursor: typeof CANVAS_HOVER_CURSOR_PRESERVE;
  partLabel: string | null;
};

export type RoomOpeningPlacementPointerContext = Readonly<{
  ndcX: number;
  ndcY: number;
  raycaster: unknown;
  mouse: unknown;
}>;

export type RoomOpeningPlacementWallHit = Readonly<{
  surface: RoomOpeningPlacementSurface;
  point: RoomOpeningPlacementPoint;
  distance: number | null;
}>;

export type RoomOpeningPlacementOpeningHit = Readonly<{
  target: unknown;
  distance: number | null;
}>;

export type RoomOpeningPlacementRuntimeCapabilities = {
  enterEditMode(kind: RoomOpeningKind): boolean;
  exitEditMode(source: string): void;
  isEditModeActive(): boolean;
  subscribeEditModeChanges(listener: () => void): (() => void) | null;
  hidePreview(): void;
  showPlacementPreview(plan: RoomOpeningPlacementPlan, surface: RoomOpeningPlacementSurface): void;
  showRemovalPreview(target: unknown): void;
  readArchitecture(): RoomArchitectureConfigLike | null;
  commitArchitecture(next: RoomArchitectureConfigLike, source: string): boolean;
  findOpeningTargetHit(
    pointer: RoomOpeningPlacementPointerContext,
    kind: RoomOpeningKind
  ): RoomOpeningPlacementOpeningHit | null;
  findWallSurfaceHit(pointer: RoomOpeningPlacementPointerContext): RoomOpeningPlacementWallHit | null;
  findWardrobeObstacle(pointer: RoomOpeningPlacementPointerContext): RoomOpeningWardrobeObstacle | null;
  readOpeningId(target: unknown): string | null;
  createOpeningId(): string;
};

export type RoomOpeningPlacementRuntime = {
  begin(input: RoomOpeningPlacementInput): boolean;
  cancel(): void;
  isActive(): boolean;
  hover(pointer: RoomOpeningPlacementPointerContext): RoomOpeningPlacementHoverFeedback | null;
  click(pointer: RoomOpeningPlacementPointerContext): boolean;
  remove(openingId: string): boolean;
};

const HOVER_FEEDBACK: RoomOpeningPlacementHoverFeedback = {
  kind: ROOM_OPENING_HOVER_KIND,
  cursor: CANVAS_HOVER_CURSOR_PRESERVE,
  partLabel: null,
};

export function createRoomOpeningPlacementRuntime(
  capabilities: RoomOpeningPlacementRuntimeCapabilities
): RoomOpeningPlacementRuntime {
  let draft = null as ReturnType<typeof createRoomOpeningPlacementDraft>;
  let disposeModeWatcher: (() => void) | null = null;

  const disposeWatcher = (): void => {
    const dispose = disposeModeWatcher;
    disposeModeWatcher = null;
    if (dispose) dispose();
  };

  const clearPlacementState = (): void => {
    draft = null;
    capabilities.hidePreview();
    disposeWatcher();
  };

  const finishPlacement = (source: string): void => {
    clearPlacementState();
    capabilities.exitEditMode(source);
  };

  const ensureModeWatcher = (): void => {
    if (disposeModeWatcher) return;
    disposeModeWatcher = capabilities.subscribeEditModeChanges(() => {
      if (capabilities.isEditModeActive()) return;
      if (!draft) {
        disposeWatcher();
        return;
      }
      clearPlacementState();
    });
  };

  const readActiveDraft = () => {
    if (!draft) return null;
    if (capabilities.isEditModeActive()) return draft;
    clearPlacementState();
    return null;
  };

  const commitRemoval = (openingId: string, source: string): boolean => {
    const current = capabilities.readArchitecture();
    if (!current) return false;
    const mutation = planRoomOpeningRemoval({ current, openingId });
    return mutation ? capabilities.commitArchitecture(mutation.nextArchitecture, source) : false;
  };

  return {
    begin(input): boolean {
      const nextDraft = createRoomOpeningPlacementDraft(input);
      if (!nextDraft || !capabilities.enterEditMode(nextDraft.kind)) return false;
      draft = nextDraft;
      ensureModeWatcher();
      capabilities.hidePreview();
      return true;
    },

    cancel(): void {
      finishPlacement('settings:roomOpening:cancel');
    },

    isActive(): boolean {
      return readActiveDraft() != null;
    },

    hover(pointer): RoomOpeningPlacementHoverFeedback | null {
      const activeDraft = readActiveDraft();
      if (!activeDraft) return null;
      const wardrobeObstacle = capabilities.findWardrobeObstacle(pointer);
      const openingHit = capabilities.findOpeningTargetHit(pointer, activeDraft.kind);
      if (openingHit && !isRoomOpeningTargetOccludedByWardrobe(openingHit.distance, wardrobeObstacle)) {
        capabilities.showRemovalPreview(openingHit.target);
        return HOVER_FEEDBACK;
      }

      const wallHit = capabilities.findWallSurfaceHit(pointer);
      if (!wallHit) {
        capabilities.hidePreview();
        return HOVER_FEEDBACK;
      }
      if (isRoomOpeningTargetOccludedByWardrobe(wallHit.distance, wardrobeObstacle)) {
        capabilities.hidePreview();
        return HOVER_FEEDBACK;
      }

      const current = capabilities.readArchitecture();
      if (!current) return null;
      const placement = resolveRoomOpeningPlacementPlan({
        draft: activeDraft,
        surface: wallHit.surface,
        point: wallHit.point,
        existing: current.openings,
      });
      if (!placement) return null;
      capabilities.showPlacementPreview(placement, wallHit.surface);
      return HOVER_FEEDBACK;
    },

    click(pointer): boolean {
      const activeDraft = readActiveDraft();
      if (!activeDraft) return false;
      const wardrobeObstacle = capabilities.findWardrobeObstacle(pointer);
      const openingHit = capabilities.findOpeningTargetHit(pointer, activeDraft.kind);
      if (openingHit && !isRoomOpeningTargetOccludedByWardrobe(openingHit.distance, wardrobeObstacle)) {
        const openingId = capabilities.readOpeningId(openingHit.target);
        if (openingId && commitRemoval(openingId, 'canvas:roomOpening:remove')) {
          capabilities.hidePreview();
        }
        return true;
      }

      const wallHit = capabilities.findWallSurfaceHit(pointer);
      if (!wallHit) {
        capabilities.hidePreview();
        if (!wardrobeObstacle) finishPlacement('canvas:roomOpening:emptyClick');
        return true;
      }
      if (isRoomOpeningTargetOccludedByWardrobe(wallHit.distance, wardrobeObstacle)) {
        capabilities.hidePreview();
        return true;
      }

      const current = capabilities.readArchitecture();
      if (!current) return true;
      const placement = resolveRoomOpeningPlacementPlan({
        draft: activeDraft,
        surface: wallHit.surface,
        point: wallHit.point,
        existing: current.openings,
      });
      if (!placement || placement.blockedReason) return true;
      const mutation = planRoomOpeningAddition({
        current,
        placement,
        openingId: capabilities.createOpeningId(),
      });
      if (mutation && capabilities.commitArchitecture(mutation.nextArchitecture, 'canvas:roomOpening:add')) {
        finishPlacement('canvas:roomOpening:placed');
      }
      return true;
    },

    remove(openingId): boolean {
      return commitRemoval(openingId, 'settings:roomOpening:remove');
    },
  };
}
