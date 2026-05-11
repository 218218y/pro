import type { AppContainer, UnknownRecord } from '../../../types';

import { readMapOrEmpty } from '../runtime/maps_access.js';
import { getCfg } from './store_access.js';
import type { RenderInteriorSketchInput } from './render_interior_sketch_shared.js';
import { readObject } from './render_interior_sketch_shared.js';

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
  App?: AppContainer | null;
  input?: RenderInteriorSketchInput | null;
  partId: string;
  dividerKey?: string | null;
}): boolean {
  const partId = String(args.partId || '');
  const dividerKey = String(args.dividerKey || partId || '');
  const keys = dividerKey && dividerKey !== partId ? [dividerKey, partId] : [partId];
  if (!partId && !dividerKey) return false;

  const input = readObject<RenderInteriorSketchInput>(args.input) || null;
  const candidates: Array<UnknownRecord | null> = [];
  if (args.App) {
    try {
      candidates.push(readDividerMapCandidate(getCfg(args.App)));
    } catch {
      candidates.push(null);
    }
    try {
      candidates.push(readMapOrEmpty(args.App, 'drawerDividersMap') as UnknownRecord);
    } catch {
      candidates.push(null);
    }
  }
  candidates.push(readDividerMapCandidate(input?.cfg));
  candidates.push(readDividerMapCandidate(input?.config));
  candidates.push(readDividerMapCandidate(input));

  for (let i = 0; i < candidates.length; i++) {
    const state = readFromCandidate(candidates[i], keys);
    if (state !== null) return state;
  }
  return false;
}
