// Action envelope types used by the canonical store/action write surfaces.
//
// Goal: provide a *typed* action boundary without forcing the entire codebase
// into a full Redux-like rewrite. We start by typing the common envelope shape
// and the hot-path action types used across layers.

import type { UnknownRecord } from './common';
import type { ActionMetaLike, ActionRootPatchPayload } from './kernel';
import type { StorePatchPayload } from './patch_payload';

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

/** Concrete public PATCH action (preferred public write model). */
export type PublicPatchAction = ActionEnvelope<'PATCH', ActionRootPatchPayload>;

/** Backward-compatible public PATCH alias. */
export type PatchAction = PublicPatchAction;

/** Preferred public root-action PATCH envelope. */
export type PatchDispatchEnvelope = PublicPatchAction;

/** Raw backend PATCH action used below the public action facade. */
export type StorePatchAction = ActionEnvelope<'PATCH', StorePatchPayload>;

/** Root replacement action (rare). */
export type SetAction = ActionEnvelope<'SET', UnknownRecord>;

/** Public action union. Raw PATCH payloads belong to StoreBackendAction, not here. */
export type PublicWardrobeProAction = PublicPatchAction | SetAction;

/** Backend-supported raw/legacy action envelopes. Not a public action payload contract. */
export type StoreBackendAction = StorePatchAction | SetAction | ActionEnvelope<string, unknown>;

/** Explicit raw/backend action union for store internals and migration shims. */
export type RawWardrobeProAction = StoreBackendAction;

/** Union of the currently supported public strongly-typed actions. */
export type WardrobeProAction = PublicWardrobeProAction;

/** Optional dispatch options supported by some store implementations. */
export interface DispatchOptionsLike {
  immediate?: boolean;
  [k: string]: unknown;
}
