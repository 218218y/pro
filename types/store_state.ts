// Canonical root store state.
// The persistent in-memory store has exactly five owner slices. External
// payloads are normalized before they become RootStateLike.

import type { UiStateLike, ConfigStateLike, RuntimeStateLike, ModeStateLike, MetaStateLike } from './build';
import type { CanonicalActionMetaLike } from './kernel';

export interface StoreLastActionLike extends CanonicalActionMetaLike {
  type: string;
  affectsConfig: boolean;
  affectsUi: boolean;
  affectsRuntime: boolean;
  affectsMode: boolean;
  affectsMeta: boolean;
  ts: number;
}

export type RootMetaStateLike = MetaStateLike & {
  version: number;
  updatedAt: number;
  dirty: boolean;
  lastAction?: StoreLastActionLike;
};

export interface RootStateLike {
  ui: UiStateLike;
  config: ConfigStateLike;
  runtime: RuntimeStateLike;
  mode: ModeStateLike;
  meta: RootMetaStateLike;
}

export type RootSliceKey = keyof RootStateLike;
