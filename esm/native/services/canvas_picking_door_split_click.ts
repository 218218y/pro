import { readSplitVariant } from './canvas_picking_door_edit_shared.js';
import type { CanvasDoorSplitClickArgs } from './canvas_picking_door_split_click_contracts.js';
import {
  resolveCanvasDoorSplitBaseKey,
  readCanvasDoorSplitBounds,
} from './canvas_picking_door_split_click_shared.js';
import { handleCanvasDoorCustomSplitClick } from './canvas_picking_door_split_click_custom.js';
import { handleCanvasDoorToggleSplitClick } from './canvas_picking_door_split_click_toggle.js';

export type { CanvasDoorSplitClickArgs } from './canvas_picking_door_split_click_contracts.js';

export function handleCanvasDoorSplitClick(args: CanvasDoorSplitClickArgs): boolean {
  const splitVariant = readSplitVariant(args.App);
  const doorBaseKey = resolveCanvasDoorSplitBaseKey(args.App, args.effectiveDoorId);
  const bounds = readCanvasDoorSplitBounds(args.App, doorBaseKey);

  if (splitVariant === 'custom') {
    return handleCanvasDoorCustomSplitClick({ click: args, doorBaseKey, bounds });
  }

  return handleCanvasDoorToggleSplitClick({ click: args, doorBaseKey, bounds });
}
