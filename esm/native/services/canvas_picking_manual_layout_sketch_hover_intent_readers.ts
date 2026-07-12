import {
  type ManualLayoutSketchBoxHoverIntent,
  type ManualLayoutSketchRodHoverIntent,
  type ManualLayoutSketchShelfHoverIntent,
  type ManualLayoutSketchStackHoverIntent,
  type ManualLayoutSketchStorageHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent_shared.js';
import { decodeManualLayoutCommand } from './canvas_picking_manual_layout_command.js';

function readCommand(record: unknown) {
  const decoded = decodeManualLayoutCommand(record);
  return decoded.ok ? decoded.command : null;
}

export function readManualLayoutSketchBoxHoverIntent(
  record: unknown
): ManualLayoutSketchBoxHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'box' ? command : null;
}

export function readManualLayoutSketchStackHoverIntent(
  record: unknown
): ManualLayoutSketchStackHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'drawers' || command?.kind === 'ext_drawers' ? command : null;
}

export function readManualLayoutSketchShelfHoverIntent(
  record: unknown
): ManualLayoutSketchShelfHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'shelf' ? command : null;
}

export function readManualLayoutSketchStorageHoverIntent(
  record: unknown
): ManualLayoutSketchStorageHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'storage' ? command : null;
}

export function readManualLayoutSketchRodHoverIntent(
  record: unknown
): ManualLayoutSketchRodHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'rod' ? command : null;
}
