import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

export type InteriorSketchBoxControlsSectionProps = InteriorLayoutSectionProps & {
  isSketchBoxControlsOpen: boolean;
};

export type InteriorDoorTrimSectionProps = InteriorLayoutSectionProps & {
  isDoorTrimControlsOpen: boolean;
};

export type InteriorSketchDrawersSectionProps = InteriorLayoutSectionProps & {
  isSketchExtDrawersControlsOpen: boolean;
};
