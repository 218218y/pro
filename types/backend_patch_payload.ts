// Backend-only raw PATCH payload types.
//
// Public action patch uses ActionRootPatchPayload, whose config branch is
// non-map. Raw patch payload shapes stay available only through this explicit
// backend module for platform/kernel/runtime owner commits.

import type { ConfigStateLike } from './build';
import type { ProjectSavedNotesLike } from './project';
import type { MetaSlicePatch, ModeSlicePatch, RuntimeSlicePatch, UiSlicePatch } from './patch_payload';

/** Backend-only raw config patch. Public config actions use PublicConfigPatch. */
export interface ConfigSlicePatch extends Partial<ConfigStateLike> {
  /** Per-key replacement flags (used by kernel snapshot/config writers + applyStoreConfigPatch). */
  __replace?: Record<string, boolean>;

  savedNotes?: ProjectSavedNotesLike;
}

/** Backend-only raw root patch payload. Public root actions use PublicPatchPayload. */
export interface PatchPayload {
  ui?: UiSlicePatch;
  config?: ConfigSlicePatch;
  runtime?: RuntimeSlicePatch;
  mode?: ModeSlicePatch;
  meta?: MetaSlicePatch;
}

export type RawConfigSlicePatch = ConfigSlicePatch;
export type RawPatchPayload = PatchPayload;

export type StorePatchPayload = PatchPayload;
