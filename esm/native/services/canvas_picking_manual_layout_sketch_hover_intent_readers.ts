import {
  type ManualLayoutSketchBoxHoverIntent,
  type ManualLayoutSketchRodHoverIntent,
  type ManualLayoutSketchShelfHoverIntent,
  type ManualLayoutSketchStackHoverIntent,
  type ManualLayoutSketchStorageHoverIntent,
  readRecordNumber,
} from './canvas_picking_manual_layout_sketch_hover_intent_shared.js';
import { decodeManualLayoutCommand } from './canvas_picking_manual_layout_command.js';

function readCommand(record: unknown) {
  const decoded = decodeManualLayoutCommand(record);
  return decoded.ok ? decoded.command : null;
}

function withPartitionOwnership<T extends Record<string, unknown>>(record: unknown, command: T): T {
  const xNorm = readRecordNumber(record, 'xNorm');
  const scopeOrder = readRecordNumber(record, 'scopeOrder');
  if (xNorm == null || xNorm < 0 || xNorm > 1 || scopeOrder == null || scopeOrder < 0) return command;
  return { ...command, xNorm, scopeOrder };
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
  return command?.kind === 'drawers' || command?.kind === 'ext_drawers'
    ? withPartitionOwnership(record, command)
    : null;
}

export function readManualLayoutSketchShelfHoverIntent(
  record: unknown
): ManualLayoutSketchShelfHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'shelf' ? withPartitionOwnership(record, command) : null;
}

export function readManualLayoutSketchStorageHoverIntent(
  record: unknown
): ManualLayoutSketchStorageHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'storage' ? withPartitionOwnership(record, command) : null;
}

export function readManualLayoutSketchRodHoverIntent(
  record: unknown
): ManualLayoutSketchRodHoverIntent | null {
  const command = readCommand(record);
  return command?.kind === 'rod' ? withPartitionOwnership(record, command) : null;
}
