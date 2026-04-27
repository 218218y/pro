import type { ModuleConfigLike, UiFeedbackNamespaceLike, WardrobeType } from '../../../../../types';
import type {
  LibraryPresetController,
  LibraryPresetEnv,
  MergeUiOverrideFn,
} from '../../../features/library_preset/library_preset.js';

export type StructureWorkflowToastKind = 'success' | 'error' | 'info' | 'warning';

export type StructureWorkflowState = {
  isLibraryMode: boolean;
  wardrobeType: WardrobeType;
  width: number;
  height: number;
  depth: number;
  doors: number;
  stackSplitEnabled: boolean;
  stackSplitLowerHeight: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
  modulesCount: number;
};

export type StructureWorkflowOps = {
  getModulesConfiguration: () => ModuleConfigLike[];
  commitModulesConfiguration: (nextList: ModuleConfigLike[], source: string) => void;
  clearCellDim: (key: 'width' | 'height' | 'depth') => void;
  setAutoWidth: (nextWidth: number) => void;
  reportNonFatal?: (op: string, err: unknown) => void;
};

export type CreateStructureTabWorkflowControllerArgs = {
  fb: UiFeedbackNamespaceLike | null | undefined;
  libraryEnv: LibraryPresetEnv;
  libraryPreset: LibraryPresetController;
  state: StructureWorkflowState;
  ops: StructureWorkflowOps;
  mergeUiOverride: MergeUiOverrideFn;
};

export type StructureTabWorkflowController = {
  syncLibraryModePreState: () => void;
  ensureLibraryInvariants: () => void;
  toggleLibraryMode: () => void;
  resetAllCellDimsOverrides: () => void;
  clearCellDimsWidth: () => void;
  clearCellDimsHeight: () => void;
  clearCellDimsDepth: () => void;
  resetAutoWidth: () => void;
};
