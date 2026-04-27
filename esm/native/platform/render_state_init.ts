import type { AppContainer, UnknownRecord } from '../../../types';

import {
  ensureRenderCacheMaps,
  ensureRenderMaterialSlots,
  ensureRenderMetaMaps,
  ensureRenderNamespace,
  ensureRenderRuntimeState,
} from '../runtime/render_access.js';

type AppLike = UnknownRecord & { util?: UnknownRecord };

// Native ESM implementation of render runtime state initialization.

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readAppLike(value: unknown): AppLike | null {
  return isRecord(value) ? value : null;
}

function ensureRecordSlot(owner: UnknownRecord, key: string): UnknownRecord {
  const current = owner[key];
  if (isRecord(current)) return current;
  const next: UnknownRecord = {};
  owner[key] = next;
  return next;
}

export function initRenderState(App: unknown): AppContainer['render'] | null {
  const A = readAppLike(App);
  if (!A) return null;

  const U = ensureRecordSlot(A, 'util');
  const R = ensureRenderNamespace(A);
  const materials = ensureRenderMaterialSlots(A);
  ensureRenderCacheMaps(A);
  ensureRenderMetaMaps(A);
  ensureRenderRuntimeState(A);

  // Core render pointers
  if (typeof R.scene === 'undefined') R.scene = null;
  if (typeof R.camera === 'undefined') R.camera = null;
  if (typeof R.renderer === 'undefined') R.renderer = null;
  if (typeof R.controls === 'undefined') R.controls = null;

  // Runtime groups/collections
  if (typeof R.wardrobeGroup === 'undefined') R.wardrobeGroup = null;
  if (!Array.isArray(R.doorsArray)) R.doorsArray = [];
  if (!Array.isArray(R.drawersArray)) R.drawersArray = [];

  // Material placeholders
  if (typeof materials.dimLineMaterial === 'undefined') materials.dimLineMaterial = null;
  if (typeof materials.outlineLineMaterial === 'undefined') materials.outlineLineMaterial = null;
  if (typeof materials.sketchFillMaterial === 'undefined') materials.sketchFillMaterial = null;

  // Room group
  if (typeof R.roomGroup === 'undefined') R.roomGroup = null;

  if (!(U.dimLabelCache instanceof Map)) U.dimLabelCache = new Map();

  return R;
}
