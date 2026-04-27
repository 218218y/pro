import type { AppContainer } from '../../../types';
import type {
  SketchModuleBoxContentLike,
  SketchModuleBoxLike,
  SketchPreviewArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { asRecord } from '../runtime/record.js';

export const SKETCH_BOX_TOOL_PREFIX = 'sketch_box:';
export const SKETCH_BOX_DIM_SEP = '@';

export type SketchBoxToolSpec = {
  heightCm: number;
  widthCm: number | null;
  depthCm: number | null;
};

export function isSketchModuleBox(value: unknown): value is SketchModuleBoxLike {
  return !!asRecord(value);
}

export function asSketchModuleBox(value: unknown): SketchModuleBoxLike | null {
  return isSketchModuleBox(value) ? value : null;
}

export function isSketchModuleBoxContent(value: unknown): value is SketchModuleBoxContentLike {
  return !!asRecord(value);
}

export function isSketchModuleBoxContentList(value: unknown): value is SketchModuleBoxContentLike[] {
  return Array.isArray(value) && value.every(isSketchModuleBoxContent);
}

export function readSketchBoxFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function buildSketchPreviewArgs(App: AppContainer): SketchPreviewArgs {
  return { App, THREE: getThreeMaybe(App) };
}
