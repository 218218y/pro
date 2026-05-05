import type { ReactNode } from 'react';

import type { StructureDimInputBounds } from './structure_tab_dimension_field_shared.js';

export type StructureDimFieldProps = {
  label: ReactNode;
  ariaLabel?: string;
  labelAddon?: ReactNode;
  inputAddon?: ReactNode;
  reserveInputAddon?: boolean;
  value: number;
  onCommit: (n: number) => void;
  step: number;
  buttonsStep: number;
  bounds?: StructureDimInputBounds;
  activeId: string;
};

export type StructureOptionalDimFieldProps = {
  label: string;
  value: number | '';
  placeholder?: number;
  onCommit: (n: number | null) => void;
  step: number;
  buttonsStep: number;
  bounds?: StructureDimInputBounds;
  activeId: string;
};
