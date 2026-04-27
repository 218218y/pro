import type { AppContainer, ModuleConfigLike, UnknownRecord } from '../../../types';
import type { SpecialDimsRecord } from '../features/special_dims/index.js';

export type CornerConfigShape = UnknownRecord & {
  specialDims?: unknown;
  connectorSpecialDims?: unknown;
  modulesConfiguration?: unknown;
};

export interface CornerCellDimsContext {
  App: AppContainer;
  ui: UnknownRecord;
  cfg: UnknownRecord;
  raw: UnknownRecord;
  applyW: number | null;
  applyH: number | null;
  applyD: number | null;
  foundModuleIndex: string | number;
  foundPartId: string | null;
  ensureCornerCellConfigRef: (cellIdx: number) => ModuleConfigLike | null;
  nextCornerCfg: CornerConfigShape;
  sd: SpecialDimsRecord;
  connSd: SpecialDimsRecord;
  cornerWBase: number;
  cornerHBase: number;
  cornerDBase: number;
  wallLenBase: number;
  curWingW: number;
  curH: number;
  curD: number;
  curWallL: number;
  isConnectorHit: boolean;
  cellIdx: number;
  isPerCellWing: boolean;
}
