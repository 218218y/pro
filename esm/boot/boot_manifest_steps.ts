import { assertBrowserDocument, assertStateKernel, assertStore } from '../native/runtime/api.js';

import { installBrowserSurfaceAdapter } from '../native/adapters/browser/install.js';

import {
  installPlatform,
  installCachePruning,
  ensureGeometryCachesInstalled,
  installThreeGeometryCachePatch,
  installThreeCleanup,
  installPickingPrimitives,
  CONFIG_DEFAULTS,
  applyConfigDefaults,
  initRenderState,
  installRenderScheduler,
  installLifecycleVisibility,
  installBootMain,
  installRenderLoopImpl,
  installSmokeChecks,
} from '../native/platform/install.js';

import {
  installCfgMeta,
  installSplitDoorsNormalizers,
  installKernel,
  installStateApi,
  installDomainApi,
  installMapsApi,
} from '../native/kernel/install.js';

import {
  seedUiEphemeralDefaults,
  installHistoryService,
  installEditStateService,
  installAutosaveService,
  installModelsService,
  installCloudSyncService,
  installAppStartService,
  installBootFinalizers,
  installBootSeedsPart02,
  installConfigCompoundsService,
  installCoreLayerSurface,
} from '../native/core/install.js';

import {
  installTexturesCacheService,
  installCameraService,
  installSceneViewService,
  installViewportRuntimeService,
  installBuildReactionsService,
  installDoorsRuntimeService,
  installCanvasPickingService,
  installEngineLayerSurface,
} from '../native/engine/install.js';

import { installErrorsSurface, installNotesService } from '../native/ui/install.js';

import { installRoomDesign, provideBuilder, installBuilderCore } from '../native/builder/install.js';
import { installProjectIo } from '../native/io/project_io.js';

import {
  type BootStep,
  assertCanonicalKernelActions,
  installActiveElementIdReaderStep,
  installErrorsStep,
  installPresetModels,
  installUiLateModulesStep,
  installUiMainModulesStep,
  requireBootInstaller,
} from './boot_manifest_shared.js';

export const BOOT_STEPS: BootStep[] = [
  {
    id: 'adapters.browser.surface',
    phase: 'adapters',
    run: requireBootInstaller(installBrowserSurfaceAdapter, 'adapters.browser.surface'),
  },
  {
    id: 'adapters.browser.activeElementIdReader',
    phase: 'adapters',
    run: installActiveElementIdReaderStep,
  },
  {
    id: 'platform.install',
    phase: 'platform',
    run: requireBootInstaller(installPlatform, 'platform.install'),
  },
  { id: 'platform.assertStore', phase: 'platform', run: app => assertStore(app, 'bootSequence:platform') },
  {
    id: 'platform.applyConfigDefaults',
    phase: 'platform',
    run: app => applyConfigDefaults(app, CONFIG_DEFAULTS),
  },
  {
    id: 'platform.initRenderState',
    phase: 'platform',
    run: requireBootInstaller(initRenderState, 'platform.initRenderState'),
  },
  {
    id: 'platform.renderScheduler',
    phase: 'platform',
    run: requireBootInstaller(installRenderScheduler, 'platform.renderScheduler'),
  },
  {
    id: 'platform.lifecycleVisibility',
    phase: 'platform',
    run: requireBootInstaller(installLifecycleVisibility, 'platform.lifecycleVisibility'),
  },
  {
    id: 'ui.errorsSurface',
    phase: 'platform',
    run: requireBootInstaller(installErrorsSurface, 'ui.errorsSurface'),
  },
  {
    id: 'ui.errorsInstall',
    phase: 'platform',
    run: installErrorsStep,
  },
  {
    id: 'platform.cachePruning',
    phase: 'platform',
    run: requireBootInstaller(installCachePruning, 'platform.cachePruning'),
  },
  {
    id: 'platform.ensureGeometryCaches',
    phase: 'platform',
    run: requireBootInstaller(ensureGeometryCachesInstalled, 'platform.ensureGeometryCaches'),
  },
  {
    id: 'platform.threeGeometryCachePatch',
    phase: 'platform',
    run: requireBootInstaller(installThreeGeometryCachePatch, 'platform.threeGeometryCachePatch'),
  },
  { id: 'kernel.cfgMeta', phase: 'kernel', run: requireBootInstaller(installCfgMeta, 'kernel.cfgMeta') },
  {
    id: 'kernel.splitDoorNormalizers',
    phase: 'kernel',
    run: requireBootInstaller(installSplitDoorsNormalizers, 'kernel.splitDoorNormalizers'),
  },
  { id: 'kernel.install', phase: 'kernel', run: requireBootInstaller(installKernel, 'kernel.install') },
  {
    id: 'kernel.assertStateKernel',
    phase: 'kernel',
    run: app => assertStateKernel(app, 'bootSequence:kernel'),
  },
  { id: 'kernel.stateApi', phase: 'kernel', run: requireBootInstaller(installStateApi, 'kernel.stateApi') },
  {
    id: 'kernel.assertCanonicalActions',
    phase: 'kernel',
    run: assertCanonicalKernelActions,
  },
  {
    id: 'kernel.domainApi',
    phase: 'kernel',
    run: requireBootInstaller(installDomainApi, 'kernel.domainApi'),
  },
  { id: 'kernel.mapsApi', phase: 'kernel', run: requireBootInstaller(installMapsApi, 'kernel.mapsApi') },
  { id: 'builder.provide', phase: 'builder', run: requireBootInstaller(provideBuilder, 'builder.provide') },
  {
    id: 'services.seedUiEphemeralDefaults',
    phase: 'services',
    run: requireBootInstaller(seedUiEphemeralDefaults, 'services.seedUiEphemeralDefaults'),
  },
  {
    id: 'services.history',
    phase: 'services',
    run: requireBootInstaller(installHistoryService, 'services.history'),
  },
  {
    id: 'services.editState',
    phase: 'services',
    run: requireBootInstaller(installEditStateService, 'services.editState'),
  },
  {
    id: 'services.notes',
    phase: 'services',
    run: requireBootInstaller(installNotesService, 'services.notes'),
  },
  {
    id: 'services.autosave',
    phase: 'services',
    run: requireBootInstaller(installAutosaveService, 'services.autosave'),
  },
  {
    id: 'services.models',
    phase: 'services',
    run: requireBootInstaller(installModelsService, 'services.models'),
  },
  {
    id: 'services.cloudSync',
    phase: 'services',
    run: requireBootInstaller(installCloudSyncService, 'services.cloudSync'),
  },
  {
    id: 'services.appStart',
    phase: 'services',
    run: requireBootInstaller(installAppStartService, 'services.appStart'),
  },
  {
    id: 'services.texturesCache',
    phase: 'services',
    run: requireBootInstaller(installTexturesCacheService, 'services.texturesCache'),
  },
  {
    id: 'services.camera',
    phase: 'services',
    run: requireBootInstaller(installCameraService, 'services.camera'),
  },
  {
    id: 'services.sceneView',
    phase: 'services',
    run: requireBootInstaller(installSceneViewService, 'services.sceneView'),
  },
  {
    id: 'services.viewport',
    phase: 'services',
    run: requireBootInstaller(installViewportRuntimeService, 'services.viewport'),
  },
  {
    id: 'services.buildReactions',
    phase: 'services',
    run: requireBootInstaller(installBuildReactionsService, 'services.buildReactions'),
  },
  {
    id: 'services.doorsRuntime',
    phase: 'services',
    run: requireBootInstaller(installDoorsRuntimeService, 'services.doorsRuntime'),
  },
  {
    id: 'builder.roomDesign',
    phase: 'builder',
    run: requireBootInstaller(installRoomDesign, 'builder.roomDesign'),
  },
  { id: 'ui.assertDocument', phase: 'ui', run: app => assertBrowserDocument(app, 'bootSequence:ui') },
  { id: 'ui.modules.main', phase: 'ui', run: installUiMainModulesStep },
  {
    id: 'platform.threeCleanup',
    phase: 'final',
    run: requireBootInstaller(installThreeCleanup, 'platform.threeCleanup'),
  },
  {
    id: 'services.bootFinalizers',
    phase: 'final',
    run: requireBootInstaller(installBootFinalizers, 'services.bootFinalizers'),
  },
  {
    id: 'services.bootSeedsPart02',
    phase: 'final',
    run: requireBootInstaller(installBootSeedsPart02, 'services.bootSeedsPart02'),
  },
  {
    id: 'services.configCompounds',
    phase: 'final',
    run: requireBootInstaller(installConfigCompoundsService, 'services.configCompounds'),
  },
  {
    id: 'data.presetModels',
    phase: 'final',
    run: requireBootInstaller(installPresetModels, 'data.presetModels'),
  },
  {
    id: 'platform.pickingPrimitives',
    phase: 'final',
    run: requireBootInstaller(installPickingPrimitives, 'platform.pickingPrimitives'),
  },
  {
    id: 'platform.bootMain',
    phase: 'final',
    run: requireBootInstaller(installBootMain, 'platform.bootMain'),
  },
  {
    id: 'layers.core',
    phase: 'final',
    run: requireBootInstaller(installCoreLayerSurface, 'layers.core'),
  },
  {
    id: 'layers.engine',
    phase: 'final',
    run: requireBootInstaller(installEngineLayerSurface, 'layers.engine'),
  },
  {
    id: 'services.canvasPicking',
    phase: 'final',
    run: requireBootInstaller(installCanvasPickingService, 'services.canvasPicking'),
  },
  {
    id: 'platform.renderLoop',
    phase: 'final',
    run: requireBootInstaller(installRenderLoopImpl, 'platform.renderLoop'),
  },
  {
    id: 'builder.provide.refresh',
    phase: 'addons',
    run: requireBootInstaller(provideBuilder, 'builder.provide.refresh'),
  },
  {
    id: 'builder.coreBrowserCompat',
    phase: 'addons',
    run: requireBootInstaller(installBuilderCore, 'builder.coreBrowserCompat'),
  },
  {
    id: 'io.projectIo',
    phase: 'addons',
    run: requireBootInstaller(installProjectIo, 'io.projectIo'),
  },
  { id: 'ui.modules.late', phase: 'ui', run: installUiLateModulesStep },
  { id: 'platform.smokeChecks', phase: 'smoke', run: app => installSmokeChecks(app, { autoRun: true }) },
];

export const BOOT_PHASES: readonly BootStep['phase'][] = [
  'adapters',
  'platform',
  'kernel',
  'builder',
  'services',
  'ui',
  'final',
  'addons',
  'smoke',
];
