import { readDoorStyleMap } from '../features/door_style_overrides.js';

import type {
  BuilderDoorVisualFrameStyle,
  BuilderInteriorSketchArgsLike,
  UnknownRecord,
} from '../../../types';

export type SketchDoorStyle = BuilderDoorVisualFrameStyle;
export type SketchDoorStyleMap = ReturnType<typeof readDoorStyleMap>;

function readRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function requireInteriorSketchConfigSnapshot(value: unknown, where: string): UnknownRecord {
  const snapshot = readRecord(value);
  if (!snapshot) throw new TypeError(`[${where}] cfgSnapshot is required`);
  return snapshot;
}

export function requireInteriorSketchDoorStyle(value: unknown, where: string): BuilderDoorVisualFrameStyle {
  if (value === 'flat' || value === 'profile' || value === 'double_profile') return value;
  throw new TypeError(`[${where}] doorStyle must be flat, profile, or double_profile`);
}

export function requireInteriorSketchBooleanFlag(
  value: unknown,
  key: 'isGroovesEnabled' | 'isInternalDrawersEnabled',
  where: string
): boolean {
  if (typeof value === 'boolean') return value;
  throw new TypeError(`[${where}] ${key} must be boolean`);
}

export function resolveSketchDoorStyle(input: BuilderInteriorSketchArgsLike): BuilderDoorVisualFrameStyle {
  return requireInteriorSketchDoorStyle(input.doorStyle, 'render_interior_sketch');
}

export function resolveSketchDoorStyleMap(input: BuilderInteriorSketchArgsLike) {
  const cfgSnapshot = requireInteriorSketchConfigSnapshot(input.cfgSnapshot, 'render_interior_sketch');
  return readDoorStyleMap(cfgSnapshot.doorStyleMap);
}
