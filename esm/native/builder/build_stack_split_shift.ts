import { shiftWardrobeRange } from './build_stack_shift_runtime.js';
import { readUnknownArray } from './build_flow_readers.js';

import type { AppContainer, UnknownRecord } from '../../../types';

export function finalizeBuiltStackSplitLowerRange(args: {
  App: AppContainer;
  group: UnknownRecord | null;
  splitBottomStartIndex: number;
  splitDzBottom: number;
}): number {
  const groupChildren = args.group ? readUnknownArray(args.group.children) : null;
  const splitBottomEndIndex = groupChildren ? groupChildren.length : -1;
  shiftWardrobeRange({
    App: args.App,
    fromIdx: args.splitBottomStartIndex,
    toIdx: splitBottomEndIndex,
    dy: 0,
    dz: Number.isFinite(args.splitDzBottom) ? args.splitDzBottom : 0,
    adjustHandleAbsY: false,
  });
  return groupChildren ? groupChildren.length : -1;
}
