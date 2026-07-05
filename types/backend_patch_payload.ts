// Backend-only raw PATCH payload types.
//
// Public action patch uses ActionRootPatchPayload, whose config branch is
// non-map. Raw patch payload shapes stay available only through this explicit
// backend module for platform/kernel/runtime owner commits.

import type { UnknownRecord } from './common';
import type { ConfigStateLike } from './build';
import type { ProjectSavedNotesLike } from './project';
import type { MetaSlicePatch, ModeSlicePatch, RuntimeSlicePatch, UiSlicePatch } from './patch_payload';

/** Backend-only raw config patch. Public config actions use PublicConfigPatch. */
export interface ConfigSlicePatch extends Partial<ConfigStateLike> {
  /** Per-key replacement flags (used by kernel snapshot/config writers + store.applyConfigPatch). */
  __replace?: Record<string, boolean>;

  // High-value persisted extras that exist in the wild but aren't fully typed yet.
  savedNotes?: ProjectSavedNotesLike;
  // Some flows still patch these under config; keep them typed (numbers) without forcing full domain model typing.
  width?: number;
  height?: number;
  depth?: number;
}

/** Backend-only raw root patch payload. Public root actions use PublicPatchPayload. */
export interface PatchPayload extends UnknownRecord {
  ui?: UiSlicePatch;
  config?: ConfigSlicePatch;
  runtime?: RuntimeSlicePatch;
  mode?: ModeSlicePatch;
  meta?: MetaSlicePatch;
}

export type RawConfigSlicePatch = ConfigSlicePatch;
export type RawPatchPayload = PatchPayload;

export type StorePatchPayload = PatchPayload;
