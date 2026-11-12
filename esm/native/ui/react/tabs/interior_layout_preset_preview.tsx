import type { ReactElement } from 'react';
import type { LayoutTypeId } from './interior_tab_helpers.js';

type PresetIllustration = {
  description: string;
  shelves: string;
  rods?: string;
  hangers?: string;
  storage?: boolean;
};

// Schematic front views: solid shelves, dashed rods and a filled linen compartment.
const PRESET_ILLUSTRATIONS: Partial<Record<LayoutTypeId, PresetIllustration>> = {
  shelves: {
    description: 'מדפים לכל הגובה',
    shelves: 'M9 16H39 M9 24H39 M9 32H39 M9 40H39 M9 48H39',
  },
  hanging: {
    description: 'מדפים עליונים ומוט',
    shelves: 'M9 16H39 M9 24H39',
    rods: 'M11 28H37',
    hangers: 'M24 28V32L15 38H33L24 32',
  },
  hanging_split: {
    description: 'קושרת אמצעית ושני מוטות',
    shelves: 'M9 32H39',
    rods: 'M11 10H37 M11 34H37',
    hangers: 'M24 10V14L16 19H32L24 14 M24 34V38L16 43H32L24 38',
  },
  mixed: {
    description: 'מדפים ומוט תלייה',
    shelves: 'M9 16H39 M9 24H39 M9 32H39 M9 40H39 M9 48H39',
    rods: 'M11 28H37',
  },
  storage: {
    description: 'מדפים, תלייה ואוגר',
    shelves: 'M9 16H39 M9 24H39',
    rods: 'M11 28H37',
    hangers: 'M24 28V32L15 38H33L24 32',
    storage: true,
  },
};

export function InteriorLayoutPresetPreview({
  id,
  label,
}: {
  id: LayoutTypeId;
  label: string;
}): ReactElement | null {
  const illustration = PRESET_ILLUSTRATIONS[id];
  if (!illustration) return null;
  return (
    <>
      <span className="wp-interior-preset-copy">
        <span className="wp-interior-preset-title">{label}</span>
        <span className="wp-interior-preset-description">{illustration.description}</span>
      </span>
      <svg
        className="wp-interior-preset-preview"
        viewBox="5 4 38 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect className="wp-interior-preset-shell" x="8" y="7" width="32" height="50" rx="2" />
        <path d={illustration.shelves} />
        {illustration.rods ? (
          <path className="wp-interior-preset-rod" d={illustration.rods} strokeDasharray="2 2" />
        ) : null}
        {illustration.hangers ? (
          <path className="wp-interior-preset-hanger" d={illustration.hangers} />
        ) : null}
        {illustration.storage ? (
          <rect className="wp-interior-preset-storage" x="9" y="45" width="30" height="11" rx="1" />
        ) : null}
      </svg>
    </>
  );
}
