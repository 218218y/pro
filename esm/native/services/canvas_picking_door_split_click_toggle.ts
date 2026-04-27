import type {
  CanvasDoorSplitBounds,
  CanvasDoorSplitClickArgs,
} from './canvas_picking_door_split_click_contracts.js';
import {
  callCanvasDoorSplitAction,
  callCanvasDoorSplitBottomAction,
  createCanvasDoorSplitKeyState,
  isCanvasDoorSplitBottomEnabled,
  isCanvasDoorSplitEnabled,
  isCanvasDoorSplitExplicit,
  runCanvasDoorSplitHistoryBatch,
} from './canvas_picking_door_split_click_shared.js';

function isCanvasDoorSplitBottomClick(bounds: CanvasDoorSplitBounds | null, hitY: number | null): boolean {
  return !!(bounds && typeof hitY === 'number' && hitY <= bounds.minY + (bounds.maxY - bounds.minY) / 3);
}

export function handleCanvasDoorToggleSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
}): boolean {
  const { click, doorBaseKey, bounds } = args;
  const { App, foundModuleStack, doorHitY } = click;
  const { splitKey, splitBottomKey } = createCanvasDoorSplitKeyState(doorBaseKey);

  if (isCanvasDoorSplitBottomClick(bounds, doorHitY)) {
    const next = !isCanvasDoorSplitBottomEnabled(App, doorBaseKey);
    runCanvasDoorSplitHistoryBatch(App, { source: 'splitDoorsBottom:click', immediate: true }, () => {
      callCanvasDoorSplitBottomAction({
        App,
        key: splitBottomKey,
        next,
        source: 'splitDoorsBottom:click',
        op: 'splitBottom.missingDomainApi',
      });
      return undefined;
    });
    return true;
  }

  const isCurrentlySplit =
    foundModuleStack === 'bottom'
      ? isCanvasDoorSplitExplicit(App, doorBaseKey)
      : isCanvasDoorSplitEnabled(App, doorBaseKey);
  const nextSplit = !isCurrentlySplit;

  runCanvasDoorSplitHistoryBatch(App, { source: 'splitDoors:click', immediate: true }, () => {
    callCanvasDoorSplitAction({
      App,
      key: splitKey,
      next: nextSplit,
      source: 'splitDoors:click',
      op: 'split.missingDomainApi',
    });
    return undefined;
  });
  return true;
}
