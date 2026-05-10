import type {
  AppContainer,
  BuilderContentsSurfaceLike,
  BuilderCorePureServiceLike,
  BuilderHandlesServiceLike,
  BuilderMaterialsServiceLike,
  BuilderModulesSurfaceLike,
  BuilderPlanServiceLike,
  BuilderRegistryLike,
  BuilderRenderAdapterServiceLike,
  BuilderSchedulerPublicLike,
  RenderOpsLike,
} from '../../../types';

import { reportError } from './errors.js';
import { getBuilderService, readBuilderRecord } from './builder_service_access_shared.js';

export function getBuilderHandlesService(App: unknown): BuilderHandlesServiceLike | null {
  return readBuilderRecord<BuilderHandlesServiceLike>(getBuilderService(App), 'handles');
}

export function getBuilderRenderOps(App: unknown): RenderOpsLike | null {
  return readBuilderRecord<RenderOpsLike>(getBuilderService(App), 'renderOps');
}

export function requireBuilderRenderOps(
  App: AppContainer,
  label = 'runtime/builder_service_access.renderOps'
): RenderOpsLike {
  const renderOps = getBuilderRenderOps(App);
  if (!renderOps) {
    throw new Error(
      `[WardrobePro] Builder renderOps missing (${label}): expected App.services.builder.renderOps`
    );
  }
  return renderOps;
}

export function getBuilderRegistry(App: unknown): BuilderRegistryLike | null {
  return readBuilderRecord<BuilderRegistryLike>(getBuilderService(App), 'registry');
}

export function requireBuilderRegistry(
  App: AppContainer,
  label = 'runtime/builder_service_access.registry'
): BuilderRegistryLike {
  const registry = getBuilderRegistry(App);
  if (!registry) {
    throw new Error(
      `[WardrobePro] Builder registry missing (${label}): expected App.services.builder.registry`
    );
  }
  return registry;
}

export function finalizeBuilderRegistry(App: unknown): boolean {
  try {
    const registry = getBuilderRegistry(App);
    const fn = registry && typeof registry.finalize === 'function' ? registry.finalize : null;
    if (!fn) return false;
    fn.call(registry);
    return true;
  } catch (error) {
    reportError(App, error, {
      where: 'native/runtime/builder_service_access',
      op: 'builder.registry.finalize.ownerRejected',
      fatal: false,
    });
    return false;
  }
}

export function getBuilderPlanService(App: unknown): BuilderPlanServiceLike | null {
  return readBuilderRecord<BuilderPlanServiceLike>(getBuilderService(App), 'plan');
}

export function getBuilderRenderAdapterService(App: unknown): BuilderRenderAdapterServiceLike | null {
  return readBuilderRecord<BuilderRenderAdapterServiceLike>(getBuilderService(App), 'renderAdapter');
}

export function requireBuilderRenderAdapterService(
  App: AppContainer,
  label = 'runtime/builder_service_access.renderAdapter'
): BuilderRenderAdapterServiceLike {
  const adapter = getBuilderRenderAdapterService(App);
  if (!adapter) {
    throw new Error(
      `[WardrobePro] Builder renderAdapter missing (${label}): expected App.services.builder.renderAdapter`
    );
  }
  return adapter;
}

export function getBuilderCorePureService(App: unknown): BuilderCorePureServiceLike | null {
  return readBuilderRecord<BuilderCorePureServiceLike>(getBuilderService(App), 'corePure');
}

export function getBuilderMaterialsService(App: unknown): BuilderMaterialsServiceLike | null {
  return readBuilderRecord<BuilderMaterialsServiceLike>(getBuilderService(App), 'materials');
}

export function requireBuilderMaterialsService(
  App: AppContainer,
  label = 'runtime/builder_service_access.materials'
): BuilderMaterialsServiceLike {
  const mats = getBuilderMaterialsService(App);
  if (!mats) {
    throw new Error(
      `[WardrobePro] Builder materials missing (${label}): expected App.services.builder.materials`
    );
  }
  return mats;
}

export function getBuilderModulesService(App: unknown): BuilderModulesSurfaceLike | null {
  return readBuilderRecord<BuilderModulesSurfaceLike>(getBuilderService(App), 'modules');
}

export function requireBuilderModulesService(
  App: AppContainer,
  label = 'runtime/builder_service_access.modules'
): BuilderModulesSurfaceLike {
  const modules = getBuilderModulesService(App);
  if (!modules) {
    throw new Error(
      `[WardrobePro] Builder modules missing (${label}): expected App.services.builder.modules`
    );
  }
  return modules;
}

export function getBuilderContentsService(App: unknown): BuilderContentsSurfaceLike | null {
  return readBuilderRecord<BuilderContentsSurfaceLike>(getBuilderService(App), 'contents');
}

export function requireBuilderContentsService(
  App: AppContainer,
  label = 'runtime/builder_service_access.contents'
): BuilderContentsSurfaceLike {
  const contents = getBuilderContentsService(App);
  if (!contents) {
    throw new Error(
      `[WardrobePro] Builder contents missing (${label}): expected App.services.builder.contents`
    );
  }
  return contents;
}

export function getBuilderScheduler(App: unknown): BuilderSchedulerPublicLike | null {
  return readBuilderRecord<BuilderSchedulerPublicLike>(getBuilderService(App), '__scheduler');
}
