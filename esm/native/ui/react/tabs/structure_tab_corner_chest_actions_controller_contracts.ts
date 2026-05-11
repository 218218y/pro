import type { AppContainer, MetaActionsNamespaceLike, ProjectPreChestStateLike } from '../../../../../types';

export type StructureTabCornerChestActionsArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  cornerSide: 'left' | 'right';
  cornerWidth: number;
  cornerDoors: number;
  cornerHeight: number;
  cornerDepth: number;
  depth: number;
  doors: number;
  width: number;
  height: number;
  isManualWidth: boolean;
  baseType: string;
  preChestState: ProjectPreChestStateLike;
  chestCommodeEnabled: boolean;
  chestCommodeMirrorHeightCm: number;
  chestCommodeMirrorWidthCm: number;
  chestCommodeMirrorWidthManual: boolean;
};

export type StructureTabCornerChestActionsController = {
  toggleCornerMode(nextOn: boolean): void;
  toggleCornerSide(): void;
  commitCornerDoors(nn: number): void;
  commitCornerWidth(nn: number): void;
  commitCornerHeight(nn: number): void;
  commitCornerDepth(nn: number): void;
  toggleChestMode(next: boolean): void;
  toggleChestCommode(next: boolean): void;
  setChestDrawersCount(nn: number): void;
  setChestCommodeMirrorHeight(nn: number): void;
  setChestCommodeMirrorWidth(nn: number): void;
  setChestCommodeMirrorWidthManual(nextManual: boolean): void;
};
