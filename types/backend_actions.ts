// Backend-only action envelope types for the raw store boundary.
//
// Do not export this module from the public `types/index.ts` barrel. Public
// action dispatch must use PublicPatchAction/PatchDispatchEnvelope/WardrobeProAction.

import type { ActionEnvelope } from './actions';
import type { UnknownRecord } from './common';
import type { StorePatchPayload } from './backend_patch_payload';

/** Backend-only raw PATCH action used below the public action facade. */
export type StorePatchAction = ActionEnvelope<'PATCH', StorePatchPayload>;

/** Backend-only root replacement action. */
export type StoreSetAction = ActionEnvelope<'SET', UnknownRecord>;

/** Known backend store actions. Prefer this when unknown legacy envelopes are not needed. */
export type KnownStoreBackendAction = StorePatchAction | StoreSetAction;

/**
 * Explicit unknown legacy backend envelope.
 *
 * This intentionally accepts arbitrary migration/backend envelopes. Never use
 * it as a public action payload contract.
 */
export type UnknownLegacyStoreAction = ActionEnvelope<string, unknown> & UnknownRecord;

/** Backend-supported raw/legacy action envelopes. Not a public action payload contract. */
export type StoreBackendAction = KnownStoreBackendAction | UnknownLegacyStoreAction;

/** Explicit raw/backend action union for store internals and migration shims only. */
export type RawWardrobeProAction = StoreBackendAction;
