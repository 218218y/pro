// Backend-only raw PATCH payload types.
//
// Public action patch uses ActionRootPatchPayload, whose config branch is
// non-map. Raw patch payload shapes stay available only through this explicit
// backend module for platform/kernel/runtime owner commits.

import type {
  ConfigSlicePatch as RawConfigSlicePatchBase,
  PatchPayload as RawPatchPayloadBase,
} from './patch_payload';

export type RawConfigSlicePatch = RawConfigSlicePatchBase;
export type RawPatchPayload = RawPatchPayloadBase;

/** Backend-only raw config patch. Public config actions use PublicConfigPatch. */
export type ConfigSlicePatch = RawConfigSlicePatch;

/** Backend-only raw root patch payload. Public root actions use PublicPatchPayload. */
export type PatchPayload = RawPatchPayload;

export type StorePatchPayload = RawPatchPayload;
