import type {
  AppContainer,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderBuildChestOnlyFn,
  BuilderBuildCornerWingFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderGetMaterialFactoryFn,
  BuilderMaterialSnapshotLike,
  BuilderOutlineBindingFactory,
  ThreeLike,
} from '../../../types';

import { bindBuilderMethod, requireBuilderMethod } from './builder_service_access_shared.js';
import { readRuntimeScalarOrDefaultFromApp } from './runtime_selectors.js';
import {
  getBuilderContentsService,
  getBuilderMaterialsService,
  getBuilderModulesService,
  getBuilderRenderOps,
  requireBuilderContentsService,
  requireBuilderMaterialsService,
  requireBuilderModulesService,
} from './builder_service_access_slots.js';

export type MirrorMaterialFactory = (args: {
  App: AppContainer;
  THREE: ThreeLike;
  materialSnapshot: BuilderMaterialSnapshotLike;
}) => unknown;

export function getBuilderCreateOutlineBinding(App: unknown): BuilderOutlineBindingFactory | null {
  return bindBuilderMethod<
    Parameters<BuilderOutlineBindingFactory>,
    ReturnType<BuilderOutlineBindingFactory>
  >(getBuilderRenderOps(App), 'createOutlineBinding');
}

export function captureBuilderOutlineBinding(App: unknown): ReturnType<BuilderOutlineBindingFactory> {
  const createOutlineBinding = getBuilderCreateOutlineBinding(App);
  if (!createOutlineBinding) {
    throw new Error(
      '[WardrobePro] createOutlineBinding is not available (expected App.services.builder.renderOps.createOutlineBinding).'
    );
  }
  const sketchMode = !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
  const binding = createOutlineBinding({ sketchMode });
  if (typeof binding !== 'function') {
    throw new TypeError('[WardrobePro] createOutlineBinding must return an outline function');
  }
  return binding;
}

export function getBuilderGetMaterial(App: unknown): BuilderGetMaterialFactoryFn | null {
  return bindBuilderMethod<Parameters<BuilderGetMaterialFactoryFn>, ReturnType<BuilderGetMaterialFactoryFn>>(
    getBuilderMaterialsService(App),
    'getMaterial'
  );
}

export function requireBuilderGetMaterial(
  App: AppContainer,
  label = 'runtime/builder_service_access.materials.getMaterial'
): BuilderGetMaterialFactoryFn {
  return requireBuilderMethod<
    Parameters<BuilderGetMaterialFactoryFn>,
    ReturnType<BuilderGetMaterialFactoryFn>
  >(
    requireBuilderMaterialsService(App, label),
    'getMaterial',
    `[WardrobePro] getMaterial is not available (expected App.services.builder.materials.getMaterial).`
  );
}

export function getBuilderMirrorMaterialFactory(App: unknown): MirrorMaterialFactory | null {
  const materialFactory = bindBuilderMethod<
    [{ THREE: ThreeLike; materialSnapshot: BuilderMaterialSnapshotLike }],
    unknown
  >(getBuilderMaterialsService(App), 'getMirrorMaterial');
  if (materialFactory) {
    return ({ App: _App, THREE, materialSnapshot }) => materialFactory({ THREE, materialSnapshot });
  }

  const renderFactory = bindBuilderMethod<
    [{ App: AppContainer; THREE: ThreeLike; materialSnapshot: BuilderMaterialSnapshotLike }],
    unknown
  >(getBuilderRenderOps(App), 'getMirrorMaterial');
  return renderFactory
    ? ({ App: currentApp, THREE, materialSnapshot }) =>
        renderFactory({ App: currentApp, THREE, materialSnapshot })
    : null;
}

export function resolveBuilderMirrorMaterial(
  App: AppContainer,
  THREE: ThreeLike,
  materialSnapshot: BuilderMaterialSnapshotLike,
  fallbackFactory?: (() => unknown) | null
): unknown {
  const getMirrorMaterial = getBuilderMirrorMaterialFactory(App);
  if (getMirrorMaterial) return getMirrorMaterial({ App, THREE, materialSnapshot });
  return typeof fallbackFactory === 'function' ? fallbackFactory() : null;
}

export function getBuilderCreateDoorVisual(App: unknown): BuilderCreateDoorVisualFn | null {
  return bindBuilderMethod<Parameters<BuilderCreateDoorVisualFn>, ReturnType<BuilderCreateDoorVisualFn>>(
    getBuilderModulesService(App),
    'createDoorVisual'
  );
}

export function requireBuilderCreateDoorVisual(
  App: AppContainer,
  label = 'runtime/builder_service_access.modules.createDoorVisual'
): BuilderCreateDoorVisualFn {
  requireBuilderModulesService(App, label);
  return requireBuilderMethod<Parameters<BuilderCreateDoorVisualFn>, ReturnType<BuilderCreateDoorVisualFn>>(
    getBuilderModulesService(App),
    'createDoorVisual',
    `[WardrobePro] createDoorVisual is not available (expected App.services.builder.modules.createDoorVisual).`
  );
}

export function getBuilderCreateInternalDrawerBox(App: unknown): BuilderCreateInternalDrawerBoxFn | null {
  return bindBuilderMethod<
    Parameters<BuilderCreateInternalDrawerBoxFn>,
    ReturnType<BuilderCreateInternalDrawerBoxFn>
  >(getBuilderModulesService(App), 'createInternalDrawerBox');
}

export function requireBuilderCreateInternalDrawerBox(
  App: AppContainer,
  label = 'runtime/builder_service_access.modules.createInternalDrawerBox'
): BuilderCreateInternalDrawerBoxFn {
  requireBuilderModulesService(App, label);
  return requireBuilderMethod<
    Parameters<BuilderCreateInternalDrawerBoxFn>,
    ReturnType<BuilderCreateInternalDrawerBoxFn>
  >(
    getBuilderModulesService(App),
    'createInternalDrawerBox',
    `[WardrobePro] createInternalDrawerBox is not available (expected App.services.builder.modules.createInternalDrawerBox).`
  );
}

export function getBuilderBuildChestOnly(App: unknown): BuilderBuildChestOnlyFn | null {
  return bindBuilderMethod<Parameters<BuilderBuildChestOnlyFn>, ReturnType<BuilderBuildChestOnlyFn>>(
    getBuilderModulesService(App),
    'buildChestOnly'
  );
}

export function getBuilderBuildCornerWing(App: unknown): BuilderBuildCornerWingFn | null {
  return bindBuilderMethod<Parameters<BuilderBuildCornerWingFn>, ReturnType<BuilderBuildCornerWingFn>>(
    getBuilderModulesService(App),
    'buildCornerWing'
  );
}

export function getBuilderAddRealisticHanger(App: unknown): BuilderAddRealisticHangerFn | null {
  return bindBuilderMethod<Parameters<BuilderAddRealisticHangerFn>, ReturnType<BuilderAddRealisticHangerFn>>(
    getBuilderContentsService(App),
    'addRealisticHanger'
  );
}

export function requireBuilderAddRealisticHanger(
  App: AppContainer,
  label = 'runtime/builder_service_access.contents.addRealisticHanger'
): BuilderAddRealisticHangerFn {
  requireBuilderContentsService(App, label);
  return requireBuilderMethod<
    Parameters<BuilderAddRealisticHangerFn>,
    ReturnType<BuilderAddRealisticHangerFn>
  >(
    getBuilderContentsService(App),
    'addRealisticHanger',
    `[WardrobePro] addRealisticHanger is not available (expected App.services.builder.contents.addRealisticHanger).`
  );
}

export function getBuilderAddHangingClothes(App: unknown): BuilderAddHangingClothesFn | null {
  return bindBuilderMethod<Parameters<BuilderAddHangingClothesFn>, ReturnType<BuilderAddHangingClothesFn>>(
    getBuilderContentsService(App),
    'addHangingClothes'
  );
}

export function requireBuilderAddHangingClothes(
  App: AppContainer,
  label = 'runtime/builder_service_access.contents.addHangingClothes'
): BuilderAddHangingClothesFn {
  requireBuilderContentsService(App, label);
  return requireBuilderMethod<Parameters<BuilderAddHangingClothesFn>, ReturnType<BuilderAddHangingClothesFn>>(
    getBuilderContentsService(App),
    'addHangingClothes',
    `[WardrobePro] addHangingClothes is not available (expected App.services.builder.contents.addHangingClothes).`
  );
}

export function getBuilderAddFoldedClothes(App: unknown): BuilderAddFoldedClothesFn | null {
  return bindBuilderMethod<Parameters<BuilderAddFoldedClothesFn>, ReturnType<BuilderAddFoldedClothesFn>>(
    getBuilderContentsService(App),
    'addFoldedClothes'
  );
}

export function requireBuilderAddFoldedClothes(
  App: AppContainer,
  label = 'runtime/builder_service_access.contents.addFoldedClothes'
): BuilderAddFoldedClothesFn {
  requireBuilderContentsService(App, label);
  return requireBuilderMethod<Parameters<BuilderAddFoldedClothesFn>, ReturnType<BuilderAddFoldedClothesFn>>(
    getBuilderContentsService(App),
    'addFoldedClothes',
    `[WardrobePro] addFoldedClothes is not available (expected App.services.builder.contents.addFoldedClothes).`
  );
}
