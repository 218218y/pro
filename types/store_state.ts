// Canonical root store state.
// The persistent in-memory store has exactly five owner slices. External
// payloads are normalized before they become RootStateLike.

import type { UiStateLike, ConfigStateLike, RuntimeStateLike, ModeStateLike, MetaStateLike } from './build';

export type RootMetaStateLike = MetaStateLike & { version: number; updatedAt: number; dirty: boolean };

export interface RootStateLike {
  ui: UiStateLike;
  config: ConfigStateLike;
  runtime: RuntimeStateLike;
  mode: ModeStateLike;
  meta: RootMetaStateLike;
}

export type RootSliceKey = keyof RootStateLike;
