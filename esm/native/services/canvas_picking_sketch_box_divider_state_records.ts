import { asRecord } from '../runtime/record.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readDividerRecordList,
} from './canvas_picking_sketch_box_dividers_shared.js';

export function readSketchBoxDividerXNorm(box: unknown): number | null {
  const dividers = readSketchBoxDividers(box);
  return dividers.length ? dividers[0].xNorm : null;
}

export function readSketchBoxHorizontalDividerYNorm(box: unknown): number | null {
  const dividers = readSketchBoxHorizontalDividers(box);
  return dividers.length ? dividers[0].yNorm : null;
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
    const frontZ = typeof it?.frontZ === 'number' && Number.isFinite(it.frontZ) ? it.frontZ : null;
    const yNorm = normalizeSketchBoxDividerYNorm(it?.yNorm);
    dividers.push({
      id: it?.id != null && String(it.id) ? String(it.id) : `sbd_${i}`,
      xNorm,
      centered: Math.abs(xNorm - 0.5) <= 0.001,
      ...(frontZ != null ? { frontZ } : {}),
      ...(yNorm != null ? { yNorm } : {}),
    });
  }
  if (dividers.length) return dividers.sort((a, b) => (a.yNorm ?? -1) - (b.yNorm ?? -1) || a.xNorm - b.xNorm);
  return [];
}

export function readSketchBoxHorizontalDividers(box: unknown): SketchBoxHorizontalDividerState[] {
  const rec = asRecord(box);
  if (!rec) return [];
  const dividersRaw = readDividerRecordList(rec.horizontalDividers);
  const dividers: SketchBoxHorizontalDividerState[] = [];
  for (let i = 0; i < dividersRaw.length; i++) {
    const it = dividersRaw[i];
    const yNorm = normalizeSketchBoxDividerYNorm(it?.yNorm);
    if (yNorm == null) continue;
    const xNorm = normalizeSketchBoxDividerXNorm(it?.xNorm);
    const frontZ = typeof it?.frontZ === 'number' && Number.isFinite(it.frontZ) ? it.frontZ : null;
    dividers.push({
      id: it?.id != null && String(it.id) ? String(it.id) : `sbh_${i}`,
      yNorm,
      centered: Math.abs(yNorm - 0.5) <= 0.001,
      ...(frontZ != null ? { frontZ } : {}),
      ...(xNorm != null ? { xNorm } : {}),
    });
  }
  return dividers.sort((a, b) => (a.xNorm ?? -1) - (b.xNorm ?? -1) || a.yNorm - b.yNorm);
}

export function writeSketchBoxDividers(box: unknown, dividers: SketchBoxDividerState[]): void {
  const rec = asRecord(box);
  if (!rec) return;
  const clean = Array.isArray(dividers)
    ? dividers.filter(d => normalizeSketchBoxDividerXNorm(d?.xNorm) != null)
    : [];
  if (clean.length) {
    rec.dividers = clean
      .slice()
      .sort((a, b) => (a.yNorm ?? -1) - (b.yNorm ?? -1) || a.xNorm - b.xNorm)
      .map(divider => ({
        id: divider.id,
        xNorm: normalizeSketchBoxDividerXNorm(divider.xNorm) ?? 0.5,
        ...(typeof divider.frontZ === 'number' && Number.isFinite(divider.frontZ)
          ? { frontZ: divider.frontZ }
          : {}),
        ...(typeof divider.yNorm === 'number' && Number.isFinite(divider.yNorm)
          ? { yNorm: divider.yNorm }
          : {}),
      }));
  } else {
    delete rec.dividers;
  }
  delete rec.centerDivider;
  delete rec.dividerXNorm;
}

export function writeSketchBoxHorizontalDividers(
  box: unknown,
  dividers: SketchBoxHorizontalDividerState[]
): void {
  const rec = asRecord(box);
  if (!rec) return;
  const clean = Array.isArray(dividers)
    ? dividers.filter(d => normalizeSketchBoxDividerYNorm(d?.yNorm) != null)
    : [];
  if (clean.length) {
    rec.horizontalDividers = clean
      .slice()
      .sort((a, b) => (a.xNorm ?? -1) - (b.xNorm ?? -1) || a.yNorm - b.yNorm)
      .map(divider => ({
        id: divider.id,
        yNorm: normalizeSketchBoxDividerYNorm(divider.yNorm) ?? 0.5,
        ...(typeof divider.frontZ === 'number' && Number.isFinite(divider.frontZ)
          ? { frontZ: divider.frontZ }
          : {}),
        ...(typeof divider.xNorm === 'number' && Number.isFinite(divider.xNorm)
          ? { xNorm: divider.xNorm }
          : {}),
      }));
  } else {
    delete rec.horizontalDividers;
  }
}
