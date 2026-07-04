// Backend-only store PATCH payload types.
//
// Public action patch uses ActionRootPatchPayload, whose config branch is
// non-map. StorePatchPayload stays available only through this explicit
// backend module for platform/kernel/runtime owner commits.

import type { PatchPayload } from './patch_payload';

export type StorePatchPayload = PatchPayload;
