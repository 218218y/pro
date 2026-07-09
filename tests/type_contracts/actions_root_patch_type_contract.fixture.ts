import type {
  ActionsNamespaceLike,
  MetaSlicePatch,
  ModeSlicePatch,
  PublicConfigPatch,
  PublicPatchPayload,
  PublicStoreLike,
  PublicWardrobeProAction,
  PatchDispatchEnvelope,
  RuntimeSlicePatch,
  UiSlicePatch,
  WardrobeProAction,
} from '../../types';
import type { StoreBackendAction, StorePatchAction } from '../../types/backend_actions';
import type { StoreLike } from '../../types/backend_store';

// Public actions.patch accepts normal scalar config patches.
declare const actions: ActionsNamespaceLike;
declare const backendStore: StoreLike;

actions.patch?.({ config: { width: 120 } });
actions.patch?.({ config: { width: 130, __replace: { width: true } } });

// The raw/backend store patch boundary remains intentionally permissive for owner commits.
backendStore.patch({ config: { handlesMap: { d1_full: 'rail' } } });

// Public root/action patch boundaries must not accept known config maps.
// @ts-expect-error known config maps are backend-only raw patches, not public action patches
actions.patch?.({ config: { handlesMap: { d1_full: 'rail' } } });

// @ts-expect-error replacing known config maps is backend-only raw patch behavior
actions.patch?.({ config: { __replace: { handlesMap: true } } });

const okPatch: PatchDispatchEnvelope = { type: 'PATCH', payload: { config: { width: 120 } } };

const badPatch: PatchDispatchEnvelope = {
  type: 'PATCH',
  // @ts-expect-error public patch envelope rejects raw config maps
  payload: { config: { handlesMap: { d1_full: 'rail' } } },
};

// @ts-expect-error public action rejects raw config maps
const badPublicAction: PublicWardrobeProAction = {
  type: 'PATCH',
  payload: { config: { handlesMap: { d1_full: 'rail' } } },
};

// @ts-expect-error public wardrobe action rejects raw config maps
const badWardrobeAction: WardrobeProAction = {
  type: 'PATCH',
  payload: { config: { handlesMap: { d1_full: 'rail' } } },
};

const rawStoreAction: StorePatchAction = {
  type: 'PATCH',
  payload: { config: { handlesMap: { d1_full: 'rail' } } },
};
const rawBackendAction: StoreBackendAction = {
  type: 'PATCH',
  payload: { config: { handlesMap: { d1_full: 'rail' } } },
};

void okPatch;
void badPatch;
void badPublicAction;
void badWardrobeAction;
void rawStoreAction;
void rawBackendAction;

// The public barrel must not export backend/raw store patch internals.
// @ts-expect-error backend raw payload types are not public-barrel exports
import type { StorePatchPayload } from '../../types';

// @ts-expect-error backend raw payload types are not public-barrel exports
import type { PatchPayload } from '../../types';

// @ts-expect-error backend raw payload types are not public-barrel exports
import type { ConfigSlicePatch } from '../../types';

// @ts-expect-error backend raw payload types are not public-barrel exports
import type { RawPatchPayload } from '../../types';

// @ts-expect-error backend raw payload types are not public-barrel exports
import type { RawConfigSlicePatch } from '../../types';

// @ts-expect-error backend raw action types are not public-barrel exports
import type { StorePatchAction as PublicStorePatchAction } from '../../types';

// @ts-expect-error backend raw action types are not public-barrel exports
import type { StoreBackendAction as PublicStoreBackendAction } from '../../types';

// @ts-expect-error backend raw action types are not public-barrel exports
import type { RawWardrobeProAction } from '../../types';

// @ts-expect-error backend store writer types are not public-barrel exports
import type { StoreLike as PublicStoreLikeAlias } from '../../types';

// @ts-expect-error backend store writer types are not public-barrel exports
import type { RootStoreLike } from '../../types';

// @ts-expect-error backend store writer types are not public-barrel exports
import type { BackendStoreLike } from '../../types';

type PublicBarrelLeakSentinel =
  | StorePatchPayload
  | PatchPayload
  | ConfigSlicePatch
  | RawPatchPayload
  | RawConfigSlicePatch
  | PublicStorePatchAction
  | PublicStoreBackendAction
  | RawWardrobeProAction
  | PublicStoreLikeAlias
  | RootStoreLike
  | BackendStoreLike;

declare const publicBarrelLeakSentinel: PublicBarrelLeakSentinel;
void publicBarrelLeakSentinel;

// The shared patch_payload module only exposes non-config slice patch contracts.
// @ts-expect-error raw root/config payload aliases are not exported by the shared patch module
import type { PatchPayload as SharedPatchPayload } from '../../types/patch_payload';

// @ts-expect-error raw config patch aliases are not exported by the shared patch module
import type { ConfigSlicePatch as SharedConfigSlicePatch } from '../../types/patch_payload';

const uiPatch: UiSlicePatch = { __snapshot: true };
const runtimePatch: RuntimeSlicePatch = { paintColor: 'red' };
const modePatch: ModeSlicePatch = { primary: 'design' };
const metaPatch: MetaSlicePatch = { dirty: true };

type SharedPatchLeakSentinel = SharedPatchPayload | SharedConfigSlicePatch;
declare const sharedPatchLeakSentinel: SharedPatchLeakSentinel;
void uiPatch;
void runtimePatch;
void modePatch;
void metaPatch;
void sharedPatchLeakSentinel;

const okPayload: PublicPatchPayload = { config: { width: 120 } };
const okReplacePayload: PublicPatchPayload = { config: { width: 130, __replace: { width: true } } };

// @ts-expect-error public patch payload aliases reject known config maps
const badPayload: PublicPatchPayload = { config: { handlesMap: { d1_full: 'rail' } } };

// @ts-expect-error public patch payload aliases reject known config map replacements
const badReplacePayload: PublicPatchPayload = { config: { __replace: { handlesMap: true } } };

const okConfig: PublicConfigPatch = { width: 120 };
const okReplaceConfig: PublicConfigPatch = { width: 130, __replace: { width: true } };

// @ts-expect-error public config patch aliases reject known config maps
const badConfig: PublicConfigPatch = { handlesMap: { d1_full: 'rail' } };

// @ts-expect-error public config patch aliases reject known config map replacements
const badReplaceConfig: PublicConfigPatch = { __replace: { handlesMap: true } };

void okPayload;
void okReplacePayload;
void badPayload;
void badReplacePayload;
void okConfig;
void okReplaceConfig;
void badConfig;
void badReplaceConfig;

// Public store surface stays readable/subscribable only. Raw writers are backend-only.
declare const publicStore: PublicStoreLike;
publicStore.getState();

// @ts-expect-error public store surface must not expose backend patch writer
publicStore.patch({ config: { handlesMap: { d1_full: 'rail' } } });

// @ts-expect-error public store surface must not expose backend config writer
publicStore.setConfig?.({ handlesMap: { d1_full: 'rail' } });

// @ts-expect-error public store surface must not expose backend root writer
publicStore.setRoot?.({ config: {} });
