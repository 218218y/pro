import type { UnknownRecord } from '../../../types';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  isSketchExternalShoeDrawerItem,
  readSketchDrawerHeightMFromItem,
} from './canvas_picking_external_drawer_count_policy.js';

export type ModuleSketchShoeDrawerState = {
  id: string;
  drawerHeightM: number;
};

export type ModuleShoeDrawerState = {
  hasStandard: boolean;
  sketchDrawers: ModuleSketchShoeDrawerState[];
  hasSketch: boolean;
  hasAny: boolean;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readTopLevelSketchExternalDrawers(value: unknown): unknown[] {
  const cfg = asRecord(value);
  const sketchExtras = asRecord(cfg?.sketchExtras);
  return Array.isArray(sketchExtras?.extDrawers) ? sketchExtras.extDrawers : [];
}

export function readModuleShoeDrawerState(
  value: unknown,
  defaultSketchHeightM: number = DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
): ModuleShoeDrawerState {
  const cfg = asRecord(value);
  const sketchDrawers: ModuleSketchShoeDrawerState[] = [];
  for (const item of readTopLevelSketchExternalDrawers(cfg)) {
    if (!isSketchExternalShoeDrawerItem(item)) continue;
    const rec = asRecord(item);
    if (!rec) continue;
    sketchDrawers.push({
      id: rec.id == null ? '' : String(rec.id),
      drawerHeightM: readSketchDrawerHeightMFromItem(rec, defaultSketchHeightM),
    });
  }
  const hasStandard = cfg?.hasShoeDrawer === true;
  return {
    hasStandard,
    sketchDrawers,
    hasSketch: sketchDrawers.length > 0,
    hasAny: hasStandard || sketchDrawers.length > 0,
  };
}

export function removeTopLevelSketchShoeDrawers(value: unknown): number {
  const cfg = asRecord(value);
  const sketchExtras = asRecord(cfg?.sketchExtras);
  if (!sketchExtras || !Array.isArray(sketchExtras.extDrawers)) return 0;

  const list = sketchExtras.extDrawers;
  let removed = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (!isSketchExternalShoeDrawerItem(list[i])) continue;
    list.splice(i, 1);
    removed += 1;
  }
  return removed;
}
