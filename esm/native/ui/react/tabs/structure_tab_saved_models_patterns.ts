export type StructurePattern = {
  label: string;
  structure: 'default' | number[];
};

// Keep this pattern table aligned with the structure pattern options used by the current React Structure tab.
export const STRUCTURE_PATTERNS: Record<number, StructurePattern[]> = {
  2: [
    { label: 'תא אחד רחב (80)', structure: [2] },
    { label: '2 תאים צרים (40-40)', structure: [1, 1] },
  ],
  3: [
    { label: 'ברירת מחדל (80-40 או 40-80)', structure: 'default' },
    { label: '3 תאים צרים (40-40-40)', structure: [1, 1, 1] },
  ],
  4: [
    { label: 'סטנדרט (80-80)', structure: [2, 2] },
    { label: 'סימטרי: צר-רחב-צר (40-80-40)', structure: [1, 2, 1] },
    { label: '4 תאים צרים (40-40-40-40)', structure: [1, 1, 1, 1] },
  ],
  5: [
    { label: 'ברירת מחדל (80-80 ותא 40 לבחירה)', structure: 'default' },
    { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1] },
  ],
  6: [
    { label: 'סטנדרט (80-80-80)', structure: [2, 2, 2] },
    { label: 'מרכז רחב: (40-80-80-40)', structure: [1, 2, 2, 1] },
    { label: 'מרכז צר: (80-40-40-80)', structure: [2, 1, 1, 2] },
    { label: '6 תאים צרים', structure: [1, 1, 1, 1, 1, 1] },
  ],
  7: [
    { label: 'ברירת מחדל (80-80-80 ותא 40 לבחירה)', structure: 'default' },
    { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1, 1, 1] },
  ],
};
