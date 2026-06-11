// Root store state shapes (minimal, high-value typing)
//
// Goal:
// - Provide a stable, typed shape for the *root store* state (ui/config/runtime/mode/meta)
// - Keep it permissive with index signatures so migration remains incremental.
//
// NOTE: We reuse the existing "*StateLike" interfaces from build.ts to avoid duplication.

import type { UiStateLike, ConfigStateLike, RuntimeStateLike, ModeStateLike, MetaStateLike } from './build';

// Root store meta: store.ts guarantees these core flags exist.
export type RootMetaStateLike = MetaStateLike & { version: number; updatedAt: number; dirty: boolean };

/** Root store state as used by App.store.getState(). */
export interface RootStateLike {
  ui: UiStateLike;
  config: ConfigStateLike;
  runtime: RuntimeStateLike;
  mode: ModeStateLike;
  meta: RootMetaStateLike;

  /**
   * Extra keys exist in some builds/tools during migration.
   * Keep them typed as unknown to prevent `any` bleed.
   */
  [k: string]: unknown;
}

/** Known slice keys of the root store. */
// NOTE: RootStateLike keeps an index signature for incremental migration.
// That would otherwise widen `keyof RootStateLike`
// to include `string | number | symbol`.
// We want a stable *string-literal* union of the core slices.
export type RootSliceKey = 'ui' | 'config' | 'runtime' | 'mode' | 'meta';
