import { HINGED_DEFAULT_PER_DOOR_WIDTH } from '../../../services/api.js';

export type StructurePattern = {
  label: string;
  structure: 'default' | number[];
};

const formatStructureWidths = (...doorUnits: number[]): string =>
  doorUnits.map(units => String(units * HINGED_DEFAULT_PER_DOOR_WIDTH)).join('-');

// Keep this pattern table aligned with the structure pattern options used by the current React Structure tab.
export const STRUCTURE_PATTERNS: Record<number, StructurePattern[]> = {
  2: [
    { label: `תא אחד רחב (${formatStructureWidths(2)})`, structure: [2] },
    { label: `2 תאים צרים (${formatStructureWidths(1, 1)})`, structure: [1, 1] },
  ],
  3: [
    {
      label: `ברירת מחדל (${formatStructureWidths(2, 1)} או ${formatStructureWidths(1, 2)})`,
      structure: 'default',
    },
    { label: `3 תאים צרים (${formatStructureWidths(1, 1, 1)})`, structure: [1, 1, 1] },
  ],
  4: [
    { label: `סטנדרט (${formatStructureWidths(2, 2)})`, structure: [2, 2] },
    { label: `סימטרי: צר-רחב-צר (${formatStructureWidths(1, 2, 1)})`, structure: [1, 2, 1] },
    { label: `4 תאים צרים (${formatStructureWidths(1, 1, 1, 1)})`, structure: [1, 1, 1, 1] },
  ],
  5: [
    {
      label: `ברירת מחדל (${formatStructureWidths(2, 2)} ותא ${formatStructureWidths(1)} לבחירה)`,
      structure: 'default',
    },
    { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1] },
  ],
  6: [
    { label: `סטנדרט (${formatStructureWidths(2, 2, 2)})`, structure: [2, 2, 2] },
    { label: `מרכז רחב: (${formatStructureWidths(1, 2, 2, 1)})`, structure: [1, 2, 2, 1] },
    { label: `מרכז צר: (${formatStructureWidths(2, 1, 1, 2)})`, structure: [2, 1, 1, 2] },
    { label: '6 תאים צרים', structure: [1, 1, 1, 1, 1, 1] },
  ],
  7: [
    {
      label: `ברירת מחדל (${formatStructureWidths(2, 2, 2)} ותא ${formatStructureWidths(1)} לבחירה)`,
      structure: 'default',
    },
    { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1, 1, 1] },
  ],
};
