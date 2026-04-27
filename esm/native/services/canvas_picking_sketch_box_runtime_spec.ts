import {
  SKETCH_BOX_DIM_SEP,
  SKETCH_BOX_TOOL_PREFIX,
  type SketchBoxToolSpec,
} from './canvas_picking_sketch_box_runtime_shared.js';

export function parseSketchBoxToolSpec(tool: string): SketchBoxToolSpec | null {
  if (!tool || !tool.startsWith(SKETCH_BOX_TOOL_PREFIX)) return null;
  const raw = tool.slice(SKETCH_BOX_TOOL_PREFIX.length).trim();
  if (!raw) return null;

  const [heightRaw, widthRaw = '', depthRaw = ''] = raw.split(SKETCH_BOX_DIM_SEP);
  const heightCm = Number(heightRaw.trim());
  if (!Number.isFinite(heightCm)) return null;

  const parseOptional = (value: string): number | null => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  return {
    heightCm,
    widthCm: parseOptional(widthRaw),
    depthCm: parseOptional(depthRaw),
  };
}
