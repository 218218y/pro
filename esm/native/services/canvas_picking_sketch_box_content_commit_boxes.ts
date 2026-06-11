import type {
  SketchModuleBoxContentLike,
  SketchModuleBoxLike,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { RecordMap } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { asRecord, getProp, getRecordProp } from '../runtime/record.js';

function isSketchModuleBox(value: unknown): value is SketchModuleBoxLike {
  return !!asRecord(value);
}

function isSketchModuleBoxList(value: unknown): value is SketchModuleBoxLike[] {
  return Array.isArray(value) && value.every(isSketchModuleBox);
}

function isSketchModuleBoxContent(value: unknown): value is SketchModuleBoxContentLike {
  return !!asRecord(value);
}

function isSketchModuleBoxContentList(value: unknown): value is SketchModuleBoxContentLike[] {
  return Array.isArray(value) && value.every(isSketchModuleBoxContent);
}

export function createRandomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function ensureSketchBoxContentList(
  box: SketchModuleBoxLike,
  key: 'shelves' | 'rods' | 'storageBarriers' | 'drawers' | 'extDrawers'
): SketchModuleBoxContentLike[] {
  const list = getProp(box, key);
  if (isSketchModuleBoxContentList(list)) return list;
  const next: SketchModuleBoxContentLike[] = [];
  box[key] = next;
  return next;
}

export function ensureSketchModuleBoxes(cfg: RecordMap): SketchModuleBoxLike[] {
  const extra = (() => {
    const existing = getRecordProp(cfg, 'sketchExtras');
    if (existing) return existing;
    const created: RecordMap = {};
    cfg.sketchExtras = created;
    return created;
  })();
  const boxes = getProp(extra, 'boxes');
  if (isSketchModuleBoxList(boxes)) return boxes;
  const next: SketchModuleBoxLike[] = [];
  extra.boxes = next;
  return next;
}

export function findSketchModuleBoxById(
  boxes: SketchModuleBoxLike[],
  boxId: string,
  options?: { freePlacement?: boolean | null }
): SketchModuleBoxLike | null {
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (!box) continue;
    if (options && options.freePlacement != null && (box.freePlacement === true) !== options.freePlacement)
      continue;
    if (box.id != null && String(box.id) === boxId) return box;
  }
  return null;
}

export function getSketchModuleBoxContentSource(contentKind: string): string {
  switch (contentKind) {
    case 'divider':
      return 'manualSketchBoxDivider';
    case 'shelf':
      return 'manualSketchBoxShelf';
    case 'rod':
      return 'manualSketchBoxRod';
    case 'storage':
      return 'manualSketchBoxStorage';
    case 'door':
      return 'manualSketchBoxDoor';
    case 'double_door':
      return 'manualSketchBoxDoubleDoor';
    case 'door_hinge':
      return 'manualSketchBoxDoorHinge';
    case 'drawers':
      return 'manualSketchBoxDrawers';
    case 'ext_drawers':
      return 'manualSketchBoxExternalDrawers';
    case 'cornice':
      return 'manualSketchBoxCornice';
    case 'base':
      return 'manualSketchBoxBase';
    default:
      return 'manualSketchBoxContent';
  }
}
