// Shared non-config slice PATCH payload shapes.
//
// Goal:
// - Provide helpful structure for shared slice patch plumbing without exposing
//   raw root/config payload contracts.
// - Public actions.patch uses ActionRootPatchPayload / PublicPatchPayload.
// - Raw root/config patch types live in backend_patch_payload.ts.
// - Slice patches are partial views of the closed canonical store contracts.

import type { UnknownRecord } from './common';
import type { HandleType } from './domain';
import type { MetaStateLike, ModeStateLike, RuntimeStateLike, UiStateLike } from './build';
import type { UiRawInputsLike } from './ui_raw';

/** UI slice patch. Supports full snapshot replacement via __snapshot. */
export interface UiSlicePatch extends Partial<UiStateLike> {
  __snapshot?: boolean;
  __capturedAt?: number;
  raw?: Partial<UiRawInputsLike>;
}

/** Runtime slice patch (transient flags and session state). */
export interface RuntimeSlicePatch extends Partial<RuntimeStateLike> {
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
