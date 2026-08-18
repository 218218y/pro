// Backend-only store write surface.
//
// Public/read-only store typing lives in state.ts. Do not export this module
// from the public `types/index.ts` barrel.

import type { DispatchOptionsLike } from './actions';
import type { UnknownRecord } from './common';
import type { ConfigSlicePatch, StorePatchPayload } from './backend_patch_payload';
import type { ActionMetaLike, ModeActionOptsLike } from './kernel';
import type { MetaSlicePatch, ModeSlicePatch, RuntimeSlicePatch, UiSlicePatch } from './patch_payload';
import type { PublicStoreLike } from './state';
import type { RootStateLike } from './store_state';

export interface BackendStoreLike<S = RootStateLike> extends PublicStoreLike<S>, UnknownRecord {
  /**
   * Raw/backend store patch boundary (Zustand-only).
   *
   * This accepts StorePatchPayload for platform/kernel/runtime owner commits,
   * including snapshot/map-owner paths. UI, services, builder, and public
   * callers must use App.actions.* or the focused semantic writer facade.
   */
  patch: (
    payload: StorePatchPayload | UnknownRecord,
    meta?: ActionMetaLike,
    opts?: DispatchOptionsLike
  ) => unknown;

  /** Rare backend root replacement helper. Snapshot/parity tooling only; not for UI/service/domain callers. */
  setRoot?: (nextRoot: unknown, meta?: ActionMetaLike, opts?: DispatchOptionsLike) => unknown;

  // Optional backend convenience methods (present in platform store builds).
  setMode?: (primary: unknown, opts?: ModeActionOptsLike, meta?: ActionMetaLike) => void;
  setRuntime?: (patch: RuntimeSlicePatch | UnknownRecord, meta?: ActionMetaLike) => void;
  setMeta?: (patch: MetaSlicePatch | UnknownRecord, meta?: ActionMetaLike) => void;
  setDirty?: (isDirty: boolean, meta?: ActionMetaLike) => void;
  setUi?: (patch: UiSlicePatch | UnknownRecord, meta?: ActionMetaLike) => void;
  /** Backend-only convenience writer. Not for UI/service/domain callers. */
  setConfig?: (
    patch: ConfigSlicePatch | UnknownRecord,
    meta?: ActionMetaLike,
    opts?: DispatchOptionsLike | UnknownRecord
  ) => void;
  setModePatch?: (patch: ModeSlicePatch | UnknownRecord, meta?: ActionMetaLike) => void;
}

/** Backend-only alias retained for internal platform/runtime/kernel owners. */
export type StoreLike<S = RootStateLike> = BackendStoreLike<S>;

/** Backend-only root store shape. */
export type RootStoreLike = BackendStoreLike<RootStateLike>;
