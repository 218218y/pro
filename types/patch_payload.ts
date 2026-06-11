// Typed PATCH payload shapes.
//
// Goal:
// - Provide helpful structure at the store/action boundary (PATCH/SET),
//   without forcing full domain-model typing.
// - Keep slices open-ended (index signatures) so migration can be incremental.

import type { UnknownRecord } from './common';
import type { HandleType } from './domain';
import type { ConfigStateLike, MetaStateLike, ModeStateLike, RuntimeStateLike, UiStateLike } from './build';
import type { UiRawInputsLike } from './ui_raw';
import type { ProjectSavedNotesLike } from './project';

/** UI slice patch. Supports full snapshot replacement via __snapshot. */
export interface UiSlicePatch extends Partial<UiStateLike> {
  __snapshot?: boolean;
  __capturedAt?: number;
  // Keep `raw` patching ergonomic: allow partial raw updates without forcing full UiRawInputsLike typing.
  raw?: Partial<UiRawInputsLike> | UnknownRecord;
}

/** Config slice patch. Supports snapshot + per-key replacements. */
export interface ConfigSlicePatch extends Partial<ConfigStateLike> {
  /** Per-key replacement flags (used by kernel.applyConfig + store.applyConfigPatch). */
  __replace?: Record<string, boolean>;

  // High-value persisted extras that exist in the wild but aren't fully typed yet.
  savedNotes?: ProjectSavedNotesLike;
  // Some flows still patch these under config; keep them typed (numbers) without forcing full domain model typing.
  width?: number;
  height?: number;
  depth?: number;
}

/** Runtime slice patch (transient flags and session state). */
export interface RuntimeSlicePatch extends Partial<RuntimeStateLike> {
  // Keep permissive during migration.
  paintColor?: string | null;
  handlesType?: HandleType;
  interiorManualTool?: string | null;
}

/** Mode slice patch. */
export interface ModeSlicePatch extends Partial<ModeStateLike> {
  primary?: string;
  opts?: UnknownRecord;
}

/** Meta slice patch (allow-list in store). */
export interface MetaSlicePatch extends Partial<MetaStateLike> {
  dirty?: boolean;
}

/** PATCH payload: known slices + open-ended extra slices. */
export interface PatchPayload extends UnknownRecord {
  ui?: UiSlicePatch;
  config?: ConfigSlicePatch;
  runtime?: RuntimeSlicePatch;
  mode?: ModeSlicePatch;
  meta?: MetaSlicePatch;
}
