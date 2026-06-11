import { asRecord } from '../runtime/record.js';
import type { SketchBoxDividerState } from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  readDividerRecordList,
} from './canvas_picking_sketch_box_dividers_shared.js';

export function readSketchBoxDividerXNorm(box: unknown): number | null {
  const dividers = readSketchBoxDividers(box);
  if (dividers.length) return dividers[0].xNorm;
  return null;
}

export function readSketchBoxDividers(box: unknown): SketchBoxDividerState[] {
  const rec = asRecord(box);
  if (!rec) return [];

  const dividersRaw = readDividerRecordList(rec.dividers);
  const dividers: SketchBoxDividerState[] = [];
  for (let i = 0; i < dividersRaw.length; i++) {
    const it = dividersRaw[i];
    const xNorm = normalizeSketchBoxDividerXNorm(it?.xNorm);
    if (xNorm == null) continue;
    const idRaw = it?.id;
    const id = idRaw != null && idRaw !== '' ? String(idRaw) : `sbd_${i}`;
    dividers.push({
      id,
      xNorm,
      centered: Math.abs(xNorm - 0.5) <= 0.001,
    });
  }
  if (dividers.length) return dividers.sort((a, b) => a.xNorm - b.xNorm);

  const legacyNorm = normalizeSketchBoxDividerXNorm(rec?.dividerXNorm);
  if (legacyNorm != null) {
    return [{ id: 'legacy_divider', xNorm: legacyNorm, centered: Math.abs(legacyNorm - 0.5) <= 0.001 }];
  }
  if (rec?.centerDivider === true) {
    return [{ id: 'legacy_divider', xNorm: 0.5, centered: true }];
  }
  return [];
}

export function writeSketchBoxDividers(box: unknown, dividers: SketchBoxDividerState[]): void {
  const rec = asRecord(box);
  if (!rec) return;
  if (dividers.length) {
    rec.dividers = dividers
      .slice()
      .sort((a, b) => a.xNorm - b.xNorm)
      .map(divider => ({
        id: divider.id,
        xNorm: divider.xNorm,
      }));
  } else {
    delete rec.dividers;
  }
  rec.centerDivider = false;
  delete rec.dividerXNorm;
}
