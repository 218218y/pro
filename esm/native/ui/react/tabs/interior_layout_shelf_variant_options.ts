import {
  SKETCH_TOOL_SHELF_BRACE,
  SKETCH_TOOL_SHELF_DOUBLE,
  SKETCH_TOOL_SHELF_GLASS,
  SKETCH_TOOL_SHELF_REGULAR,
} from './interior_tab_helpers.js';

// One UI-owned set of shelf choices for rendered controls and search destinations.
export const SHELF_VARIANT_OPTIONS = [
  { prefix: SKETCH_TOOL_SHELF_REGULAR, variant: 'regular', label: 'רגיל', icon: 'fas fa-minus' },
  { prefix: SKETCH_TOOL_SHELF_DOUBLE, variant: 'double', label: 'כפול', icon: 'fas fa-clone' },
  { prefix: SKETCH_TOOL_SHELF_GLASS, variant: 'glass', label: 'זכוכית', icon: 'fas fa-gem' },
  { prefix: SKETCH_TOOL_SHELF_BRACE, variant: 'brace', label: 'קושרת', icon: 'fas fa-link' },
] as const;
