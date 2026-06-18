import type { AppContainer, UnknownRecord } from '../../../types';

import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import {
  frameSideToPartId,
  sketchBoxSideToPartId,
  readRemovableFrameSideFromPartId,
  readRemovableSketchBoxSideFromPartId,
  canonicalRemovablePartKey,
} from '../features/removable_parts.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { __wp_isRemoved, __wp_toast } from './canvas_picking_core_helpers.js';

const REMOVABLE_SIDE_WITH_FITTINGS_BLOCK_MESSAGE =
  'אי אפשר להסיר דופן בתא שיש בו תלייה או מגירות. הסר קודם את התלייה או המגירות מהתא.';

const REMOVABLE_SIDE_DOUBLE_REMOVAL_BLOCK_MESSAGE =
  'אי אפשר להסיר את שתי הדפנות של אותו תא. תא חייב להישאר עם דופן אחת לפחות.';

const REMOVABLE_SIDE_CONTENT_BUILD_BLOCK_MESSAGE =
  'אי אפשר לבנות תלייה או מגירות בתא שדופן שלו הוסרה. החזר קודם את הדופן לתא.';

export type RemovableSideRemovalBlockReason = 'fittings' | 'double-side-removal';

type ReadRemovedFn = (partId: string) => boolean;

function asRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readRecordArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readPositiveCount(value: unknown): number {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hasEnabledListEntries(value: unknown): boolean {
  const list = readRecordArray(value);
  if (!list.length) return false;
  return list.some(item => {
    if (typeof item === 'boolean') return item;
    if (readPositiveCount(item) > 0) return true;
    const rec = asRecord(item);
    return !!rec && rec.enabled !== false;
  });
}

function hasSavedDrawerPerCellContent(value: unknown): boolean {
  const rec = asRecord(value);
  if (!rec) return false;
  return Object.values(rec).some(entry => {
    if (Array.isArray(entry)) return hasEnabledListEntries(entry);
    if (typeof entry === 'boolean') return entry;
    return readPositiveCount(entry) > 0;
  });
}

function recordHasDrawerContent(record: unknown): boolean {
  const rec = asRecord(record);
  if (!rec) return false;

  if (readPositiveCount(rec.extDrawersCount) > 0) return true;
  if (rec.hasShoeDrawer === true || rec.hasShoe === true || rec.shoeDrawer === true) return true;

  if (rec.extDrawers === 'shoe') return true;
  if (readPositiveCount(rec.extDrawers) > 0) return true;

  if (hasEnabledListEntries(rec.drawers)) return true;
  if (hasEnabledListEntries(rec.extDrawers)) return true;
  if (hasEnabledListEntries(rec.regularExtDrawers)) return true;
  if (hasSavedDrawerPerCellContent(rec.drawersPerCell)) return true;

  const sketchExtras = asRecord(rec.sketchExtras);
  if (sketchExtras) {
    if (hasEnabledListEntries(sketchExtras.drawers)) return true;
    if (hasEnabledListEntries(sketchExtras.extDrawers)) return true;
    if (hasEnabledListEntries(sketchExtras.regularExtDrawers)) return true;
    for (const box of readRecordArray(sketchExtras.boxes)) {
      if (recordHasDrawerContent(box)) return true;
    }
  }

  return false;
}

function recordHasHangingContent(record: unknown): boolean {
  const rec = asRecord(record);
  if (!rec) return false;

  if (hasEnabledListEntries(rec.rods)) return true;
  if (hasEnabledListEntries(rec.rodOps)) return true;

  const customData = asRecord(rec.customData);
  if (customData) {
    if (hasEnabledListEntries(customData.rods)) return true;
    if (hasEnabledListEntries(customData.rodOps)) return true;
  }

  const sketchExtras = asRecord(rec.sketchExtras);
  if (sketchExtras) {
    if (hasEnabledListEntries(sketchExtras.rods)) return true;
    for (const box of readRecordArray(sketchExtras.boxes)) {
      if (recordHasHangingContent(box)) return true;
    }
  }

  const layout = typeof rec.layout === 'string' ? rec.layout : '';
  return rec.isCustom !== true && layout.startsWith('hanging');
}

function recordHasSideBlockingFittings(record: unknown): boolean {
  return recordHasDrawerContent(record) || recordHasHangingContent(record);
}

function readRemovedDoorsMapFromConfig(cfg: unknown): UnknownRecord {
  return asRecord(asRecord(cfg)?.removedDoorsMap) || {};
}

function isRemovedPartIdOn(App: AppContainer, cfg: unknown, partId: string): boolean {
  if (!partId) return false;
  if (__wp_isRemoved(App, partId)) return true;
  return readRemovedDoorsMapFromConfig(cfg)[`removed_${canonicalRemovablePartKey(partId)}`] === true;
}

function readModuleIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function isRemovableFrameSideMissingForModuleContentBuild(args: {
  App: AppContainer;
  moduleKey: unknown;
  isBottomStack?: boolean;
}): boolean {
  const moduleIndex = readModuleIndex(args.moduleKey);
  if (moduleIndex == null) return false;

  const cfg = readRemovablePartConfigSnapshot(args.App);
  const prefix = args.isBottomStack ? 'lower_' : '';
  const modules = readFrameSideModules(cfg, `${prefix}body_left`);
  if (!modules.length || moduleIndex >= modules.length) return false;

  if (moduleIndex === 0 && isRemovedPartIdOn(args.App, cfg, frameSideToPartId('left', prefix))) return true;
  return (
    moduleIndex === modules.length - 1 && isRemovedPartIdOn(args.App, cfg, frameSideToPartId('right', prefix))
  );
}

export function readSketchBoxPartIdCandidatesForRecord(args: {
  box: unknown;
  boxIndex?: number;
  moduleKey?: unknown;
  isBottomStack?: boolean;
  freePlacement?: boolean;
}): string[] {
  const box = asRecord(args.box) || {};
  const rawBoxId =
    box.id != null && String(box.id).trim()
      ? String(box.id).trim()
      : args.boxIndex != null
        ? String(args.boxIndex)
        : '';
  if (!rawBoxId) return [];

  const moduleIndex = readModuleIndex(args.moduleKey);
  const moduleKey = moduleIndex == null ? '' : `${args.isBottomStack ? 'lower_' : ''}${moduleIndex}`;
  const freePlacement = args.freePlacement === true || box.freePlacement === true;
  const candidates = new Set<string>();
  const pushPrefix = (prefix: string): void => {
    if (prefix) candidates.add(prefix);
  };

  if (freePlacement) {
    pushPrefix(moduleKey ? `sketch_box_free_${moduleKey}_${rawBoxId}` : `sketch_box_free_${rawBoxId}`);
    pushPrefix(`sketch_box_free_${rawBoxId}`);
  } else {
    pushPrefix(moduleKey ? `sketch_box_${moduleKey}_${rawBoxId}` : `sketch_box_${rawBoxId}`);
    pushPrefix(`sketch_box_${rawBoxId}`);
  }

  // Imported/legacy snapshots may miss the freePlacement marker while rendered ids already carry it.
  pushPrefix(moduleKey ? `sketch_box_free_${moduleKey}_${rawBoxId}` : `sketch_box_free_${rawBoxId}`);
  pushPrefix(`sketch_box_free_${rawBoxId}`);

  return Array.from(candidates);
}

export function isRemovableSketchBoxSideMissingForContentBuild(args: {
  App: AppContainer;
  cfg: unknown;
  box: unknown;
  boxIndex?: number;
  moduleKey?: unknown;
  isBottomStack?: boolean;
  freePlacement?: boolean;
}): boolean {
  const candidates = readSketchBoxPartIdCandidatesForRecord(args);
  return candidates.some(boxPartId => {
    const leftPartId = sketchBoxSideToPartId(boxPartId, 'left');
    const rightPartId = sketchBoxSideToPartId(boxPartId, 'right');
    return (
      isRemovedPartIdOn(args.App, args.cfg, leftPartId) || isRemovedPartIdOn(args.App, args.cfg, rightPartId)
    );
  });
}

export function toastRemovableSideContentBuildBlock(App: AppContainer): void {
  __wp_toast(App, REMOVABLE_SIDE_CONTENT_BUILD_BLOCK_MESSAGE, 'error');
}

export function blockRemovableSideContentBuildIfModuleSideMissing(args: {
  App: AppContainer;
  moduleKey: unknown;
  isBottomStack?: boolean;
}): boolean {
  if (!isRemovableFrameSideMissingForModuleContentBuild(args)) return false;
  toastRemovableSideContentBuildBlock(args.App);
  return true;
}

export function blockRemovableSideContentBuildIfSketchBoxSideMissing(args: {
  App: AppContainer;
  cfg: unknown;
  box: unknown;
  boxIndex?: number;
  moduleKey?: unknown;
  isBottomStack?: boolean;
  freePlacement?: boolean;
}): boolean {
  if (!isRemovableSketchBoxSideMissingForContentBuild(args)) return false;
  toastRemovableSideContentBuildBlock(args.App);
  return true;
}

function readFrameSidePartIdPrefixFromPartId(partId: string): '' | 'lower_' {
  return partId.startsWith('lower_') ? 'lower_' : '';
}

function readFrameSideModules(cfg: unknown, partId: string): unknown[] {
  const key = readFrameSidePartIdPrefixFromPartId(partId)
    ? 'stackSplitLowerModulesConfiguration'
    : 'modulesConfiguration';
  return readModulesConfigurationListFromConfigSnapshot(cfg, key);
}

function readAdjacentFrameSideModule(args: {
  cfg: unknown;
  partId: string;
  side: 'left' | 'right';
}): { moduleConfig: unknown; modulesLength: number } | null {
  const modules = readFrameSideModules(args.cfg, args.partId);
  if (!modules.length) return null;
  const index = args.side === 'left' ? 0 : modules.length - 1;
  return { moduleConfig: modules[index], modulesLength: modules.length };
}

function readOppositeFrameSidePartId(partId: string, side: 'left' | 'right'): string {
  const oppositeSide = side === 'left' ? 'right' : 'left';
  return frameSideToPartId(oppositeSide, readFrameSidePartIdPrefixFromPartId(partId));
}

function readSketchBoxIdCandidates(box: UnknownRecord, boxIndex: number, moduleKey: string): string[] {
  const rawBoxId = box.id != null && String(box.id).trim() ? String(box.id).trim() : String(boxIndex);
  const hasModuleKey = !!moduleKey;
  const candidates = new Set<string>();
  const pushPrefix = (prefix: string): void => {
    if (!prefix) return;
    candidates.add(prefix);
  };

  if (box.freePlacement === true) {
    pushPrefix(hasModuleKey ? `sketch_box_free_${moduleKey}_${rawBoxId}` : `sketch_box_free_${rawBoxId}`);
    pushPrefix(`sketch_box_free_${rawBoxId}`);
  } else {
    pushPrefix(hasModuleKey ? `sketch_box_${moduleKey}_${rawBoxId}` : `sketch_box_${rawBoxId}`);
    pushPrefix(`sketch_box_${rawBoxId}`);
  }

  // Legacy/imported snapshots occasionally lack the freePlacement marker while the rendered part id still
  // carries the free-box prefix. Keeping both candidates makes the guard match the actual canvas part id.
  pushPrefix(hasModuleKey ? `sketch_box_free_${moduleKey}_${rawBoxId}` : `sketch_box_free_${rawBoxId}`);
  pushPrefix(`sketch_box_free_${rawBoxId}`);

  return Array.from(candidates);
}

function readSketchBoxRecordForPartId(cfg: unknown, boxPartId: string): UnknownRecord | null {
  for (const bucket of ['modulesConfiguration', 'stackSplitLowerModulesConfiguration'] as const) {
    const modules = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const moduleConfig = asRecord(modules[moduleIndex]);
      const sketchExtras = asRecord(moduleConfig?.sketchExtras);
      const boxes = readRecordArray(sketchExtras?.boxes);
      const moduleKey =
        bucket === 'stackSplitLowerModulesConfiguration' ? `lower_${moduleIndex}` : String(moduleIndex);
      for (let boxIndex = 0; boxIndex < boxes.length; boxIndex += 1) {
        const box = asRecord(boxes[boxIndex]);
        if (!box) continue;
        if (readSketchBoxIdCandidates(box, boxIndex, moduleKey).includes(boxPartId)) return box;
      }
    }
  }
  return null;
}

function readRemovablePartConfigSnapshot(App: AppContainer): unknown {
  const state = readStoreStateMaybe(App);
  return asRecord(state)?.config || {};
}

export function readRemovablePartRemovalBlockReason(args: {
  App: AppContainer;
  partId: string;
  hasRemoved: ReadRemovedFn;
}): RemovableSideRemovalBlockReason | null {
  const frameSide = readRemovableFrameSideFromPartId(args.partId);
  const cfg = readRemovablePartConfigSnapshot(args.App);

  if (frameSide) {
    const adjacent = readAdjacentFrameSideModule({ cfg, partId: args.partId, side: frameSide });
    if (adjacent && recordHasSideBlockingFittings(adjacent.moduleConfig)) return 'fittings';
    if (
      adjacent?.modulesLength === 1 &&
      args.hasRemoved(readOppositeFrameSidePartId(args.partId, frameSide))
    ) {
      return 'double-side-removal';
    }
    return null;
  }

  const sketchBoxSide = readRemovableSketchBoxSideFromPartId(args.partId);
  if (sketchBoxSide) {
    const boxRecord = readSketchBoxRecordForPartId(cfg, sketchBoxSide.boxPartId);
    if (boxRecord && recordHasSideBlockingFittings(boxRecord)) return 'fittings';
    const oppositePartId = sketchBoxSideToPartId(
      sketchBoxSide.boxPartId,
      sketchBoxSide.side === 'left' ? 'right' : 'left'
    );
    if (oppositePartId && args.hasRemoved(oppositePartId)) return 'double-side-removal';
  }

  return null;
}

export function toastRemovablePartRemovalBlock(
  App: AppContainer,
  reason: RemovableSideRemovalBlockReason
): void {
  __wp_toast(
    App,
    reason === 'fittings'
      ? REMOVABLE_SIDE_WITH_FITTINGS_BLOCK_MESSAGE
      : REMOVABLE_SIDE_DOUBLE_REMOVAL_BLOCK_MESSAGE,
    'error'
  );
}
