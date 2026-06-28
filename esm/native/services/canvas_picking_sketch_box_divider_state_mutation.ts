import {
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  writeSketchBoxDividers,
  writeSketchBoxHorizontalDividers,
} from './canvas_picking_sketch_box_divider_state_records.js';

function createDividerId(prefix: string, dividerId?: unknown): string {
  return dividerId != null && String(dividerId)
    ? String(dividerId)
    : `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function addSketchBoxDividerState(
  box: unknown,
  dividerXNorm: number | null,
  dividerId?: unknown,
  options?: { frontZ?: unknown; yNorm?: unknown }
): void {
  const norm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) return;
  const yNorm = normalizeSketchBoxDividerYNorm(options?.yNorm);
  const frontZ = readFiniteNumber(options?.frontZ);
  const dividers = readSketchBoxDividers(box);
  dividers.push({
    id: createDividerId('sbd', dividerId),
    xNorm: norm,
    centered: Math.abs(norm - 0.5) <= 0.001,
    ...(frontZ != null ? { frontZ } : {}),
    ...(yNorm != null ? { yNorm } : {}),
  });
  writeSketchBoxDividers(box, dividers);
}

export function removeSketchBoxDividerState(
  box: unknown,
  dividerId: unknown,
  dividerXNorm?: unknown,
  dividerYNorm?: unknown
): void {
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
  const yNorm = normalizeSketchBoxDividerYNorm(dividerYNorm);
  if (norm == null) {
    writeSketchBoxDividers(box, []);
    return;
  }
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < dividers.length; i++) {
    const dy = yNorm == null || dividers[i].yNorm == null ? 0 : Math.abs((dividers[i].yNorm ?? 0) - yNorm);
    const dx = Math.abs(dividers[i].xNorm - norm);
    const dist = dx + dy * 3;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return;
  const next = dividers.slice();
  next.splice(bestIdx, 1);
  writeSketchBoxDividers(box, next);
}

export function addSketchBoxHorizontalDividerState(
  box: unknown,
  dividerYNorm: number | null,
  dividerId?: unknown,
  options?: { frontZ?: unknown; xNorm?: unknown }
): void {
  const norm = normalizeSketchBoxDividerYNorm(dividerYNorm);
  if (norm == null) return;
  const xNorm = normalizeSketchBoxDividerXNorm(options?.xNorm);
  const frontZ = readFiniteNumber(options?.frontZ);
  const dividers = readSketchBoxHorizontalDividers(box);
  dividers.push({
    id: createDividerId('sbh', dividerId),
    yNorm: norm,
    centered: Math.abs(norm - 0.5) <= 0.001,
    ...(frontZ != null ? { frontZ } : {}),
    ...(xNorm != null ? { xNorm } : {}),
  });
  writeSketchBoxHorizontalDividers(box, dividers);
}

export function removeSketchBoxHorizontalDividerState(
  box: unknown,
  dividerId: unknown,
  dividerYNorm?: unknown,
  dividerXNorm?: unknown
): void {
  const dividers = readSketchBoxHorizontalDividers(box);
  if (!dividers.length) {
    writeSketchBoxHorizontalDividers(box, []);
    return;
  }
  const id = dividerId != null && String(dividerId) ? String(dividerId) : '';
  if (id) {
    writeSketchBoxHorizontalDividers(
      box,
      dividers.filter(divider => divider.id !== id)
    );
    return;
  }
  const norm = normalizeSketchBoxDividerYNorm(dividerYNorm);
  const xNorm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) {
    writeSketchBoxHorizontalDividers(box, []);
    return;
  }
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < dividers.length; i++) {
    const dy = Math.abs(dividers[i].yNorm - norm);
    const dx = xNorm == null || dividers[i].xNorm == null ? 0 : Math.abs((dividers[i].xNorm ?? 0) - xNorm);
    const dist = dy + dx * 3;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return;
  const next = dividers.slice();
  next.splice(bestIdx, 1);
  writeSketchBoxHorizontalDividers(box, next);
}

export function applySketchBoxDividerState(box: unknown, dividerXNorm: number | null): void {
  const norm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  if (norm == null) {
    writeSketchBoxDividers(box, []);
    return;
  }
  writeSketchBoxDividers(box, [
    { id: 'primary_divider', xNorm: norm, centered: Math.abs(norm - 0.5) <= 0.001 },
  ]);
}
