// Native Builder Corner Wing (ESM)
//
// The public owner stays intentionally thin and now delegates the remaining
// runtime/bootstrap details into focused seams:
// - corner_state_normalize.ts
// - corner_materials.ts
// - corner_wing_runtime.ts
// - corner_wing_shadows.ts
// - corner_wing_context.ts
// - corner_ops_emit.ts

import { assertApp } from '../runtime/api.js';

import { normalizeCornerWingState, type CornerBuildMeta } from './corner_state_normalize.js';
import { createCornerWingMaterials } from './corner_materials.js';
import { emitCornerConnector, emitCornerWingExtension } from './corner_ops_emit.js';
import { createCornerWingEmitContext } from './corner_wing_context.js';
import {
  createCornerConfigMapReader,
  createCornerCurtainReader,
  createCornerGrooveReader,
} from './corner_config_readers.js';
import {
  resolveCornerWingServices,
  resolveCornerWingTHREE,
  type CornerBuildCtx,
  type MaterialsLike,
} from './corner_wing_runtime.js';
import { createCornerWingStableShadowApplier } from './corner_wing_shadows.js';

import type { BuilderCornerBuildMetaLike } from '../../../types';

export const buildCornerWing = (
  mainW: number,
  mainH: number,
  mainD: number,
  woodThick: number,
  startY: number,
  materials: MaterialsLike,
  meta: BuilderCornerBuildMetaLike,
  ctxMaybe?: CornerBuildCtx | null | undefined
): void => {
  const ctx = ctxMaybe;

  const App = assertApp(ctx?.App ?? null, 'native/builder/corner_wing');
  const THREE = resolveCornerWingTHREE(App);
  const services = resolveCornerWingServices(App, meta.renderPolicy);

  const state = normalizeCornerWingState({
    App,
    mainW,
    mainH,
    mainD,
    woodThick,
    startY,
    meta: meta as CornerBuildMeta,
  });
  const readCornerMap = createCornerConfigMapReader(state.__cfg);

  const readers = {
    getMap: readCornerMap,
    getGroove: createCornerGrooveReader(state.__cfg),
    getCurtain: createCornerCurtainReader(state.__cfg),
  };

  const mats = createCornerWingMaterials({
    App,
    THREE,
    ro: services.ro,
    materials,
    getMaterial: services.getMaterial,
    cfgSnapshot: state.__cfg,
    readMap: readers.getMap,
    stackKey: state.__stackKey,
    stackSplitEnabled: state.__stackSplitEnabled,
    stackSplitUnifiedFrame: state.__stackSplitUnifiedFrame,
    stackScopePartKey: state.__stackScopePartKey,
  });

  const wingGroup = new THREE.Group();
  wingGroup.userData = {
    __wpCornerWing: true,
    __wpStack: state.__stackKey,
    __wpStackSplitUnifiedFrame: state.__stackSplitUnifiedFrame,
  };
  wingGroup.position.set(state.wingStartX, 0, state.wingStartZ + state.__stackOffsetZ);
  wingGroup.rotation.y = state.wingRotationY;
  wingGroup.scale.set(state.wingScaleX, 1, 1);

  const emitCtx = createCornerWingEmitContext({
    App,
    THREE,
    mainW,
    mainH,
    mainD,
    woodThick,
    startY,
    state,
    mats,
    readers,
    services: {
      ...services,
      __applyStableShadowsToModule: createCornerWingStableShadowApplier(state.__sketchMode),
    },
    wingGroup,
  });

  emitCornerConnector(emitCtx);
  emitCornerWingExtension(emitCtx);
};

export const builderCornerWing = { buildCornerWing };

// Install seam lives in ./corner_wing_install.js and is wired by provide.ts.
