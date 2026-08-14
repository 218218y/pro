import type {
  AppContainer,
  ConfigStateLike,
  ModuleConfigLike,
  UiRawInputsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

export interface CanvasCellDimsClickArgs {
  App: AppContainer;
  foundModuleIndex: string | number;
  foundPartId: string | null;
  hitUserData?: UnknownRecord | null;
  isBottomStack: boolean;
  ensureCornerCellConfigRef: (cellIdx: number) => ModuleConfigLike | null;
  ndcX?: number;
  ndcY?: number;
}

export interface CanvasCellDimsResolvedDrafts {
  App: AppContainer;
  isBottomStack?: boolean;
  ui: UiStateLike;
  cfg: ConfigStateLike;
  raw: UiRawInputsLike;
  applyW: number | null;
  applyH: number | null;
  applyD: number | null;
  autoWidthMatchToleranceCm: number;
  hexCellMode?: boolean;
  hexCellProtrusionCm?: number | null;
  hexCellDoorWidthCm?: number | null;
}

export interface CanvasCornerCellDimsArgs extends CanvasCellDimsResolvedDrafts {
  foundModuleIndex: string | number;
  foundPartId: string | null;
  ensureCornerCellConfigRef: (cellIdx: number) => ModuleConfigLike | null;
}

export interface CanvasLinearCellDimsArgs extends CanvasCellDimsResolvedDrafts {
  foundModuleIndex: string | number;
}
