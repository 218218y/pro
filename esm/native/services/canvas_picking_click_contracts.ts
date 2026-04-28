import type { ActionMetaLike, AppContainer, ModuleConfigLike } from '../../../types';
import type {
  HitObjectLike,
  RaycastHitLike,
  MouseVectorLike,
  RaycasterLike,
} from './canvas_picking_engine.js';
import type { CanvasPickingHitIdentity } from './canvas_picking_hit_identity.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type CanvasPickingClickHitState = {
  intersects: RaycastHitLike[];
  foundPartId: string | null;
  foundModuleIndex: ModuleKey | null;
  foundModuleStack: 'top' | 'bottom';
  effectiveDoorId: string | null;
  foundDrawerId: string | null;
  primaryHitObject: HitObjectLike | null;
  doorHitObject: HitObjectLike | null;
  primaryHitPoint: { x?: number; y?: number; z?: number } | null;
  doorHitPoint: { x?: number; y?: number; z?: number } | null;
  moduleHitY: number | null;
  doorHitY: number | null;
  primaryHitY: number | null;
  hitIdentity?: CanvasPickingHitIdentity | null;
};

export type CanvasPickingClickHitFlowArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  isRemoveDoorMode: boolean;
  raycaster: RaycasterLike | null | undefined;
  mouse: MouseVectorLike | null | undefined;
};

export type CanvasPickingManualSketchFreeClickArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  foundModuleIndex: ModuleKey | null;
  raycaster: RaycasterLike | null | undefined;
  mouse: MouseVectorLike | null | undefined;
};

export type CanvasPickingClickModeState = {
  __pm: string | null;
  __isPaintMode: boolean;
  __isGrooveEditMode: boolean;
  __isSplitEditMode: boolean;
  __isLayoutEditMode: boolean;
  __isManualLayoutMode: boolean;
  __isBraceShelvesMode: boolean;
  __isCellDimsMode: boolean;
  __isExtDrawerEditMode: boolean;
  __isIntDrawerEditMode: boolean;
  __isDividerEditMode: boolean;
  __isHandleEditMode: boolean;
  __isHingeEditMode: boolean;
  __isRemoveDoorMode: boolean;
  __isDoorTrimMode: boolean;
};

export type CanvasPickingClickModuleRefs = {
  __activeModuleKey: ModuleKey | null;
  __activeStack: 'top' | 'bottom';
  __isBottomStack: boolean;
  __ensureConfigRefForKey: (mk: ModuleKey | 'corner' | null) => ModuleConfigLike | null;
  __patchConfigForKey: (
    mk: ModuleKey | 'corner' | null,
    patchFn: (cfg: ModuleConfigLike) => void,
    meta: ActionMetaLike
  ) => void;
  __getActiveConfigRef: () => ModuleConfigLike | null;
  __ensureCornerCellConfigRef: (cellIdx: number) => ModuleConfigLike | null;
};
