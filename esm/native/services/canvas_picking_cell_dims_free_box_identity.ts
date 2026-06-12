import type { ModuleKey } from './canvas_picking_hover_preview_modes_shared.js';
import { __wp_toModuleKey } from './canvas_picking_core_support_numbers.js';

const FREE_BOX_PART_SUFFIX_RE =
  /_(?:side_(?:left|right)|door_.+|divider_.+|hdivider_.+|storage_.+|(?:regular_)?ext_drawers?_.+|int_drawers?_.+|shelf_.+|rod_.+|hex_diag_(?:left|right)|accent_.+)$/i;

export function stripCellDimsFreeBoxPartSuffix(value: string): string {
  return value.replace(FREE_BOX_PART_SUFFIX_RE, '');
}

export function readCellDimsFreeBoxModuleKeyFromPartId(partId: string): ModuleKey | null {
  const match = /^sketch_box_free_([^_]+)_/.exec(partId);
  return match?.[1] != null ? __wp_toModuleKey(match[1] as never) : null;
}

export function readCellDimsFreeBoxIdFromPartId(
  partId: string,
  moduleKey: ModuleKey | null | undefined
): string | null {
  if (!partId.startsWith('sketch_box_free_')) return null;
  const normalized = stripCellDimsFreeBoxPartSuffix(partId);
  if (moduleKey != null) {
    const prefix = `sketch_box_free_${String(moduleKey)}_`;
    if (normalized.startsWith(prefix)) {
      const rest = normalized.slice(prefix.length);
      return rest ? rest : null;
    }
  }
  const loose = /^sketch_box_free_(?:[^_]+_)?(.+)$/i.exec(normalized);
  return loose?.[1] ? loose[1] : null;
}
