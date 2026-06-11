import { normalizeSketchBoxDividerXNorm } from './canvas_picking_sketch_box_dividers_shared.js';
import {
  readSketchBoxDividers,
  writeSketchBoxDividers,
} from './canvas_picking_sketch_box_divider_state_records.js';

export function addSketchBoxDividerState(
  box: unknown,
  dividerXNorm: number | null,
  dividerId?: unknown
): void {
  const norm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) return;
  const dividers = readSketchBoxDividers(box);
  const id =
    dividerId != null && String(dividerId)
      ? String(dividerId)
      : `sbd_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
  dividers.push({
    id,
    xNorm: norm,
    centered: Math.abs(norm - 0.5) <= 0.001,
  });
  writeSketchBoxDividers(box, dividers);
}

export function removeSketchBoxDividerState(box: unknown, dividerId: unknown, dividerXNorm?: unknown): void {
  const dividers = readSketchBoxDividers(box);
  if (!dividers.length) {
    writeSketchBoxDividers(box, []);
    return;
  }

  const id = dividerId != null && String(dividerId) ? String(dividerId) : '';
  if (id) {
    writeSketchBoxDividers(
      box,
      dividers.filter(divider => divider.id !== id)
    );
    return;
  }

  const norm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) {
    writeSketchBoxDividers(box, []);
    return;
  }

  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < dividers.length; i++) {
    const dx = Math.abs(dividers[i].xNorm - norm);
    if (dx < bestDist) {
      bestDist = dx;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return;
  const next = dividers.slice();
  next.splice(bestIdx, 1);
  writeSketchBoxDividers(box, next);
}

export function applySketchBoxDividerState(box: unknown, dividerXNorm: number | null): void {
  const norm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) {
    writeSketchBoxDividers(box, []);
    return;
  }
  writeSketchBoxDividers(box, [
    {
      id: 'legacy_divider',
      xNorm: norm,
      centered: Math.abs(norm - 0.5) <= 0.001,
    },
  ]);
}
