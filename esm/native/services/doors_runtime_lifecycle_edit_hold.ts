import {
  type AppLike,
  type HoldEditOptions,
  type ReleaseEditHoldOptions,
  ensureDoorsRuntimeDefaults,
  getModeConst,
  getModeSlice,
  isGlobalClickMode,
  reportDoorsRuntimeNonFatal,
  touchDoorsRuntimeRender,
} from './doors_runtime_shared.js';
import {
  applyAllDoors,
  applyAllDrawers,
  applySnapshot,
  captureSnapshot,
} from './doors_runtime_lifecycle_shared.js';

export function holdOpenForEdit(App: AppLike, opts?: HoldEditOptions): void {
  if (!App || typeof App !== 'object') return;
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const includeDrawers = !!safeOpts.includeDrawers;

  if (isGlobalClickMode(App)) return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const hold = runtime.editHold;

  if (!hold.active) {
    hold.snapshot = captureSnapshot(App, includeDrawers);
    hold.active = true;
    hold.includeDrawers = includeDrawers;
  }

  applyAllDoors(App, true);
  if (includeDrawers) applyAllDrawers(App, true);
  touchDoorsRuntimeRender(App);
}

export function releaseEditHold(App: AppLike, opts?: ReleaseEditHoldOptions): void {
  if (!App || typeof App !== 'object') return;
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const restore = typeof safeOpts.restore === 'boolean' ? safeOpts.restore : true;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const hold = runtime.editHold;
  if (!hold.active) return;

  try {
    const NONE = getModeConst('NONE', 'none');
    const modeSlice = getModeSlice(App);
    const current = modeSlice && typeof modeSlice.primary === 'string' ? modeSlice.primary : NONE;
    if (current && current !== NONE && current !== 'none') return;
  } catch (_) {
    reportDoorsRuntimeNonFatal('L484', _);
  }

  if (restore) applySnapshot(App, hold.snapshot);

  hold.active = false;
  hold.snapshot = null;
  hold.includeDrawers = false;

  touchDoorsRuntimeRender(App);
}

export function applyEditHoldAfterBuild(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const hold = runtime.editHold;
  if (!hold.active) return;
  if (isGlobalClickMode(App)) return;

  applyAllDoors(App, true);
  if (hold.includeDrawers) applyAllDrawers(App, true);
  touchDoorsRuntimeRender(App);
}
