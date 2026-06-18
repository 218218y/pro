import type { UnknownRecord } from '../../../types';

import type { RenderInteriorSketchInput } from './render_interior_sketch_shared.js';
import { readObject } from './render_interior_sketch_shared.js';
import { requireInteriorSketchConfigSnapshot } from './render_interior_sketch_input_contract.js';

function readDividerMapCandidate(value: unknown): UnknownRecord | null {
  const rec = readObject<UnknownRecord>(value);
  if (!rec) return null;
  const map = readObject<UnknownRecord>(rec.drawerDividersMap);
  return map || null;
}

function hasOwn(map: UnknownRecord | null, key: string): boolean {
  return !!map && Object.prototype.hasOwnProperty.call(map, key);
}

function readOwnDividerState(map: UnknownRecord | null, key: string): boolean | null {
  if (!key || !hasOwn(map, key)) return null;
  return map?.[key] === true;
}

function readFromCandidate(map: UnknownRecord | null, keys: string[]): boolean | null {
  for (let i = 0; i < keys.length; i++) {
    const state = readOwnDividerState(map, keys[i]);
    if (state !== null) return state;
  }
  return null;
}

export function hasSketchDrawerDivider(args: {
  input: RenderInteriorSketchInput;
  partId: string;
  dividerKey?: string | null;
}): boolean {
  const partId = String(args.partId || '');
  const dividerKey = String(args.dividerKey || partId || '');
  const keys = dividerKey && dividerKey !== partId ? [dividerKey, partId] : [partId];
  if (!partId && !dividerKey) return false;

  const cfgSnapshot = requireInteriorSketchConfigSnapshot(
    args.input.cfgSnapshot,
    'render_interior_sketch.drawerDividers'
  );
  return readFromCandidate(readDividerMapCandidate(cfgSnapshot), keys) === true;
}
