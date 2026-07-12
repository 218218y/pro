import { MODES } from '../runtime/api.js';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { decodeSketchBoxContentCommandHover } from './canvas_picking_sketch_box_content_command.js';

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
  if (!hoverRec) return false;
  const decoded = decodeSketchBoxContentCommandHover(hoverRec);
  return decoded.ok ? !decoded.value.command.freePlacement : hoverRec.freePlacement !== true;
}
