// Typed store spine utilities (Root store slices)
//
// Goal:
// - Provide a *single source of truth* mapping between root slices and their
//   state/patch types.
// - Enable typed helpers in kernel/platform/runtime without repeating unions.
//
// Notes:
// - This file is type-only and safe to import broadly.
// - Keep it small and stable; expand only when a new root slice is added.

import type { UiStateLike, ConfigStateLike, RuntimeStateLike, ModeStateLike } from './build';
import type { RootMetaStateLike, RootSliceKey } from './store_state';
import type {
  UiSlicePatch,
  ConfigSlicePatch,
  RuntimeSlicePatch,
  ModeSlicePatch,
  MetaSlicePatch,
} from './patch_payload';

export type RootSliceStateMap = {
  ui: UiStateLike;
  config: ConfigStateLike;
  runtime: RuntimeStateLike;
  mode: ModeStateLike;
  meta: RootMetaStateLike;
};

export type RootSlicePatchMap = {
  ui: UiSlicePatch;
  config: ConfigSlicePatch;
  runtime: RuntimeSlicePatch;
  mode: ModeSlicePatch;
  meta: MetaSlicePatch;
};

export type SliceState<K extends RootSliceKey> = RootSliceStateMap[K];
export type SlicePatch<K extends RootSliceKey> = RootSlicePatchMap[K];
