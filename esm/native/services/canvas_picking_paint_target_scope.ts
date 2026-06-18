import type { AppContainer, UnknownRecord } from '../../../types';

import { __wp_isViewportRoot } from './canvas_picking_local_helpers.js';

export type CanvasPaintTargetScope = {
  stackSplitUnifiedFrame: boolean;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readUnifiedFrameFlag(value: unknown): boolean | null {
  const rec = asRecord(value);
  if (!rec) return null;
  if (rec.__wpStackSplitUnifiedFrame === true) return true;
  if (rec.__wpStackSplitUnifiedFrame === false) return false;
  return null;
}

export function readCanvasPaintTargetScopeFromObject(
  App: AppContainer,
  start: unknown
): CanvasPaintTargetScope {
  let curr: UnknownRecord | null = asRecord(start);
  while (curr && !__wp_isViewportRoot(App, curr)) {
    const flag = readUnifiedFrameFlag(asRecord(curr.userData));
    if (flag !== null) return { stackSplitUnifiedFrame: flag };
    curr = asRecord(curr.parent);
  }
  return { stackSplitUnifiedFrame: false };
}
