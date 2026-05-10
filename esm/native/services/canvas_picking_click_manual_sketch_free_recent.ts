import { MODES } from '../runtime/api.js';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';

type RecordMap = Record<string, unknown>;

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getModeConst(key: 'NONE' | 'SCREEN_NOTE', defaultValue: string): string {
  const value = isRecord(MODES) ? MODES[key] : null;
  return typeof value === 'string' && value ? value : defaultValue;
}

export function isRecentModuleScopedSketchHover(hover: unknown, tool: string): boolean {
  const hoverRec = matchRecentSketchHover({ hover, tool });
  return !!hoverRec && hoverRec.freePlacement !== true;
}
