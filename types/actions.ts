// Action envelope types used by the canonical store/action write surfaces.
//
// Goal: provide a *typed* action boundary without forcing the entire codebase
// into a full Redux-like rewrite. We start by typing the common envelope shape
// and the hot-path action types used across layers.

import type { UnknownRecord } from './common';
import type { ActionMetaLike } from './kernel';
import type { PatchPayload } from './patch_payload';

/** Generic action envelope used by the store dispatch boundary. */
export interface ActionEnvelope<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload?: TPayload;
  meta?: ActionMetaLike;
  // Allow extra fields during migration (legacy actions may carry additional keys).
  // This also prevents excess-property errors for object literals passed to dispatch.
  [k: string]: unknown;
}

/** Core action types we currently rely on cross-layer. */
export type WardrobeProActionType = 'PATCH' | 'SET';

/** Concrete PATCH action (preferred public write model). */
export type PatchAction = ActionEnvelope<'PATCH', PatchPayload>;

/** Preferred store-write envelope during migration to Zustand backend. */
export type PatchDispatchEnvelope = PatchAction;

/** Root replacement action (rare). */
export type SetAction = ActionEnvelope<'SET', UnknownRecord>;

/** Backend-supported action envelopes (current engine + planned Zustand adapter). */
export type StoreBackendAction = PatchAction | SetAction;

/** Union of the currently supported strongly-typed actions.
 *
 * NOTE: We still allow arbitrary action types during migration, but PATCH is the
 * preferred public write-path and should be used by App/actions helpers.
 */
export type WardrobeProAction = StoreBackendAction | ActionEnvelope<string, unknown>;

/** Optional dispatch options supported by some store implementations. */
export interface DispatchOptionsLike {
  immediate?: boolean;
  [k: string]: unknown;
}
