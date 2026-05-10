export type {
  DisplayedValueReader,
  StructureRawPatch,
  StructureTabNumericKey,
  StructureTabStackSplitField,
  StructureUiPatch,
} from './structure_tab_structure_mutations_shared.js';
export {
  buildRawUiPatch,
  normalizeDoorsValue,
  readRawPatch,
} from './structure_tab_structure_mutations_shared.js';
export { commitStructureRawValue } from './structure_tab_structure_raw_mutations.js';
export {
  setStackSplitLowerLinkModeValue,
  toggleStackSplitDecorativeSeparatorState,
  toggleStackSplitState,
} from './structure_tab_structure_stack_split_mutations.js';
