import type {
  ActionsNamespaceLike,
  MetaSlicePatch,
  ModeSlicePatch,
  ModulesGeometrySnapshotLike,
  PublicConfigPatch,
  PublicPatchPayload,
  PublicStoreLike,
  PublicWardrobeProAction,
  PatchDispatchEnvelope,
  RuntimeSlicePatch,
  UiSlicePatch,
  WardrobeProAction,
} from '../../types';
import type { StoreBackendAction, StorePatchAction, StoreSetAction } from '../../types/backend_actions';
import type { StoreLike } from '../../types/backend_store';

// This fixture is typechecked by tsconfig.type-contracts.json and may also be discovered
// by the generic runtime test runner. Keep value-level assertions inside an uncalled
// function so the type contracts are checked without executing declared test values.
declare const actions: ActionsNamespaceLike;
declare const backendStore: StoreLike;
declare const publicStore: PublicStoreLike;

function assertActionsRootPatchTypeContracts() {
  // Public actions.patch is an exact, non-map mutation contract.
  actions.patch?.({ config: { isManualWidth: true, boardMaterial: 'melamine' } });
  actions.patch?.({ ui: { activeTab: 'design', raw: { width: 120 } }, runtime: { sketchMode: true } });
  actions.patch?.({ mode: { primary: 'design', opts: { source: 'fixture' } }, meta: { dirty: true } });

  // Unknown root/config keys and backend replacement metadata are compile-time errors.
  // @ts-expect-error root patch keys are closed
  actions.patch?.({ mysterySlice: {} });

  // @ts-expect-error wardrobe dimensions are ui.raw.*, not config fields
  actions.patch?.({ config: { width: 120 } });

  // @ts-expect-error backend replacement metadata is not part of the public config patch contract
  actions.patch?.({ config: { __replace: { isManualWidth: true } } });

  // @ts-expect-error backend snapshot metadata is not part of the public config patch contract
  actions.patch?.({ config: { __snapshot: true } });

  // Public root/action patch boundaries must not accept known config maps.
  // @ts-expect-error known config maps are backend-only raw patches, not public action patches
  actions.patch?.({ config: { handlesMap: { d1_full: 'rail' } } });

  // Public UI/runtime/mode/meta slices are closed too.
  // @ts-expect-error public UI patch cannot carry snapshot protocol metadata
  actions.patch?.({ ui: { __snapshot: true } });

  // @ts-expect-error ui.raw keys are closed
  actions.patch?.({ ui: { raw: { imaginaryDimension: 10 } } });

  // @ts-expect-error ui.raw numeric values must be finite-number/null typed values at call sites
  actions.patch?.({ ui: { raw: { width: '120' } } });

  // @ts-expect-error runtime patch keys are closed
  actions.patch?.({ runtime: { mysteryRuntimeFlag: true } });

  // @ts-expect-error mode patch keys are closed
  actions.patch?.({ mode: { version: 2 } });

  // @ts-expect-error meta patch exposes dirty only
  actions.patch?.({ meta: { version: 2 } });

  // Scalar action writers expose named canonical keys rather than string+unknown escape hatches.
  actions.setCfgScalar?.('roomArchitecture', {
    backWall: { enabled: true, widthCm: 300, heightCm: 260, wardrobeOffsetLeftCm: 0 },
    leftWall: { enabled: false, depthCm: 300, heightCm: 260 },
    rightWall: { enabled: false, depthCm: 300, heightCm: 260 },
    column: {
      enabled: false,
      offsetLeftCm: 0,
      widthCm: 40,
      depthCm: 40,
      heightCm: 260,
      bottomOffsetCm: 0,
    },
    openings: [],
    wallColor: '#ffffff',
    surfacesHidden: false,
  });
  actions.runtime?.setScalar?.('paintColor', '#fff');
  actions.ui?.setRawScalar?.('width', 240);

  // @ts-expect-error config scalar writer rejects arbitrary or wrong-domain keys
  actions.setCfgScalar?.('width', 120);

  // @ts-expect-error runtime scalar writer rejects arbitrary keys
  actions.runtime?.setScalar?.('mysteryRuntimeFlag', true);

  // @ts-expect-error raw scalar writer is intentionally numeric/boolean only
  actions.ui?.setRawScalar?.('structureSelect', 'custom');

  const okPatch: PatchDispatchEnvelope = {
    type: 'PATCH',
    payload: { config: { isManualWidth: true } },
  };

  const badEnvelope: PatchDispatchEnvelope = {
    type: 'PATCH',
    payload: { config: { isManualWidth: true } },
    // @ts-expect-error action envelopes reject undeclared top-level fields
    legacyExtra: true,
  };

  const badPatch: PatchDispatchEnvelope = {
    type: 'PATCH',
    // @ts-expect-error public patch envelope rejects raw config maps
    payload: { config: { handlesMap: { d1_full: 'rail' } } },
  };

  const badPublicAction: PublicWardrobeProAction = {
    type: 'PATCH',
    // @ts-expect-error public action rejects raw config maps
    payload: { config: { handlesMap: { d1_full: 'rail' } } },
  };

  const badWardrobeAction: WardrobeProAction = {
    type: 'PATCH',
    // @ts-expect-error public wardrobe action rejects raw config maps
    payload: { config: { handlesMap: { d1_full: 'rail' } } },
  };

  // The raw/backend store boundary remains intentionally capable of owner-only map/root writes.
  backendStore.patch({ config: { handlesMap: { d1_full: 'rail' } } });
  const rawStoreAction: StorePatchAction = {
    type: 'PATCH',
    payload: { config: { handlesMap: { d1_full: 'rail' } } },
  };
  const rawSetAction: StoreSetAction = { type: 'SET', payload: { config: { internal: true } } };
  const rawBackendAction: StoreBackendAction = rawSetAction;

  // Internal/backend slice patch shapes can still carry snapshot protocol metadata.
  const uiPatch: UiSlicePatch = { __snapshot: true };
  const runtimePatch: RuntimeSlicePatch = { paintColor: 'red' };
  const modePatch: ModeSlicePatch = { primary: 'design' };
  const metaPatch: MetaSlicePatch = { dirty: true };

  const okPayload: PublicPatchPayload = { config: { isManualWidth: true } };
  const okConfig: PublicConfigPatch = { boardMaterial: 'sandwich' };

  // @ts-expect-error public patch payload aliases reject unknown config keys
  const badPayload: PublicPatchPayload = { config: { width: 120 } };

  // @ts-expect-error public config patch aliases reject backend replacement metadata
  const badReplaceConfig: PublicConfigPatch = { __replace: { boardMaterial: true } };

  // @ts-expect-error public config patch aliases reject known config maps
  const badConfig: PublicConfigPatch = { handlesMap: { d1_full: 'rail' } };

  const geometrySnapshot: ModulesGeometrySnapshotLike = {
    modulesConfiguration: [],
    width: 240,
    height: 220,
    depth: 60,
  };

  const badGeometrySnapshot: ModulesGeometrySnapshotLike = {
    modulesConfiguration: [],
    // @ts-expect-error modules geometry snapshot is a closed semantic command contract
    wardrobeWidth: 240,
  };

  // Public store surface stays readable/subscribable only. Raw writers are backend-only.
  publicStore.getState();

  // @ts-expect-error public store surface must not expose backend patch writer
  publicStore.patch({ config: { handlesMap: { d1_full: 'rail' } } });

  // @ts-expect-error public store surface must not expose backend config writer
  publicStore.setConfig?.({ handlesMap: { d1_full: 'rail' } });

  // @ts-expect-error public store surface must not expose backend root writer
  publicStore.setRoot?.({ config: {} });

  void okPatch;
  void badEnvelope;
  void badPatch;
  void badPublicAction;
  void badWardrobeAction;
  void rawStoreAction;
  void rawSetAction;
  void rawBackendAction;
  void uiPatch;
  void runtimePatch;
  void modePatch;
  void metaPatch;
  void okPayload;
  void badPayload;
  void okConfig;
  void badReplaceConfig;
  void badConfig;
  void geometrySnapshot;
  void badGeometrySnapshot;
}

void assertActionsRootPatchTypeContracts;

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

// @ts-expect-error backend SET action types are not public-barrel exports
import type { StoreSetAction as PublicStoreSetAction } from '../../types';

// @ts-expect-error public action surface no longer exposes a SET root-replacement action
import type { SetAction } from '../../types';

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
  | PublicStoreSetAction
  | SetAction
  | RawWardrobeProAction
  | PublicStoreLikeAlias
  | RootStoreLike
  | BackendStoreLike;

function assertPublicBarrelLeakSentinel(_: PublicBarrelLeakSentinel) {}
void assertPublicBarrelLeakSentinel;

// The shared patch_payload module only exposes non-config slice patch contracts.
// @ts-expect-error raw root/config payload aliases are not exported by the shared patch module
import type { PatchPayload as SharedPatchPayload } from '../../types/patch_payload';

// @ts-expect-error raw config patch aliases are not exported by the shared patch module
import type { ConfigSlicePatch as SharedConfigSlicePatch } from '../../types/patch_payload';

type SharedPatchLeakSentinel = SharedPatchPayload | SharedConfigSlicePatch;
function assertSharedPatchLeakSentinel(_: SharedPatchLeakSentinel) {}
void assertSharedPatchLeakSentinel;
