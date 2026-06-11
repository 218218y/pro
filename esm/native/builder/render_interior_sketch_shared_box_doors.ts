import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { SketchBoxDoorExtra } from './render_interior_sketch_shared_types.js';
import { readObject } from './render_interior_sketch_shared_records.js';

export function readSketchBoxDoors(value: unknown): SketchBoxDoorExtra[] {
  const rec = readObject<InteriorValueRecord>(value);
  if (!rec) return [];
  const raw = Array.isArray(rec.doors) ? rec.doors : [];
  const out: SketchBoxDoorExtra[] = [];
  for (let i = 0; i < raw.length; i++) {
    const door = readObject<SketchBoxDoorExtra>(raw[i]);
    if (door && door.enabled !== false) out.push(door);
  }
  return out;
}

export function readSketchBoxDoorId(value: unknown, fallback: string): string {
  const rec = readObject<InteriorValueRecord>(value);
  const raw = rec ? rec.id : null;
  return raw != null && String(raw) ? String(raw) : fallback;
}
