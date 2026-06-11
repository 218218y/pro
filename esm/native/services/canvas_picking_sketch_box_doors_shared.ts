import { asRecord } from '../runtime/record.js';
import type {
  SketchBoxDoorPlacement,
  SketchBoxDoorState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { normalizeSketchBoxDoorState } from './canvas_picking_sketch_box_dividers_shared.js';

export function readSketchBoxDoors(box: unknown): SketchBoxDoorState[] {
  const rec = asRecord(box);
  if (!rec) return [];
  const doorsRaw = Array.isArray(rec.doors) ? rec.doors : [];
  const doors: SketchBoxDoorState[] = [];
  for (let i = 0; i < doorsRaw.length; i++) {
    const door = normalizeSketchBoxDoorState(doorsRaw[i], `sbdr_${i}`);
    if (door) doors.push(door);
  }
  return doors.sort((a, b) => a.xNorm - b.xNorm || a.id.localeCompare(b.id));
}

export function writeSketchBoxDoors(box: unknown, doors: SketchBoxDoorState[]): void {
  const rec = asRecord(box);
  if (!rec) return;
  if (doors.length) {
    rec.doors = doors
      .slice()
      .sort((a, b) => a.xNorm - b.xNorm || a.id.localeCompare(b.id))
      .map(door => ({
        id: door.id,
        xNorm: door.xNorm,
        hinge: door.hinge,
        enabled: door.enabled !== false,
        open: door.open === true,
        groove: door.groove === true,
      }));
  } else {
    delete rec.doors;
  }
  delete rec.door;
}

export function createSketchBoxDoorId(seed: string): string {
  return `sbdr_${seed}${Date.now().toString(36)}`;
}

export function resolveSketchBoxDoubleDoorPair(placements: SketchBoxDoorPlacement[]): {
  left: SketchBoxDoorPlacement | null;
  right: SketchBoxDoorPlacement | null;
} {
  let left: SketchBoxDoorPlacement | null = null;
  let right: SketchBoxDoorPlacement | null = null;
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    if (!placement) continue;
    const hinge = placement.door?.hinge === 'right' ? 'right' : 'left';
    if (hinge === 'left' && !left) left = placement;
    if (hinge === 'right' && !right) right = placement;
  }
  return { left, right };
}
