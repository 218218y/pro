import type { ModulesRecomputeFromUiOptionsLike } from '../../../../../types';

export type StructureRecomputeOpts = ModulesRecomputeFromUiOptionsLike & {
  structureChanged: true;
  preserveTemplate: true;
  anchorSide: 'left';
};

export type EditStateToastFn = (message: string | null, sticky: boolean) => unknown;
