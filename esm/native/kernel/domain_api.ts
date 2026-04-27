import type { AppContainer, ModulesStructureItemLike, UnknownRecord } from '../../../types';

import { assertApp } from '../runtime/api.js';
import { calculateModuleStructure as calculateModuleStructurePure } from '../features/modules_configuration/calc_module_structure.js';
import { getActions as getActionsRoot } from '../runtime/actions_access_core.js';
import { ensureDomainApiNamespaces } from './actions_root.js';
import { installDomainApiColorsSection } from './domain_api_colors_section.js';
import { installDomainApiModulesCorner } from './domain_api_modules_corner.js';
import { installDomainApiRoomSection } from './domain_api_room_section.js';
import { installDomainApiSurfaceSections } from './domain_api_surface_sections.js';
import {
  asActionMeta,
  asDomainObject,
  ensureDomainNamespace,
  ensureDomainRecord,
  isDomainRecord,
  markDelegatesStackPatch,
  metaNoBuild,
  metaNoBuildNoHistory,
  readNumberOrNull,
} from './domain_api_shared.js';
import {
  createDomainSelectSurface,
  ensureDomainApiInstallState,
  isDomainApiInstalled,
} from './domain_api_install_state.js';
import { createDomainApiInstallHelpers } from './domain_api_install_helpers.js';
import { isStateApiInstalled } from './state_api.js';

type ModulesStructureItem = ModulesStructureItemLike;

export { isDomainApiInstalled } from './domain_api_install_state.js';

function hasInstalledDomainApiSurface(app: AppContainer): boolean {
  const {
    map: mapActions,
    doors: doorsActions,
    drawers: drawersActions,
    dividers: dividersActions,
    view: viewActions,
    flags: flagsActions,
    room: roomActions,
    colors: colorsActions,
    modules: modulesActions,
    corner: cornerActions,
    textures: texturesActions,
  } = ensureDomainApiNamespaces(app);

  return (
    typeof mapActions.setKey === 'function' &&
    typeof doorsActions.setOpen === 'function' &&
    typeof doorsActions.setRemoved === 'function' &&
    typeof drawersActions.setOpenId === 'function' &&
    typeof dividersActions.toggle === 'function' &&
    typeof viewActions.setExplode === 'function' &&
    typeof flagsActions.set === 'function' &&
    typeof roomActions.setFloorType === 'function' &&
    typeof colorsActions.setSavedColors === 'function' &&
    typeof modulesActions.recompute === 'function' &&
    typeof cornerActions.patch === 'function' &&
    typeof texturesActions.setCustomUploadedDataURL === 'function'
  );
}

export function installDomainApi(app: unknown): AppContainer {
  const App = assertApp(app, 'domain_api');
  if (!isStateApiInstalled(App)) {
    throw new Error('[WardrobePro][domain_api] installDomainApi requires installStateApi(App) first.');
  }
  if (isDomainApiInstalled(App) && hasInstalledDomainApiSurface(App)) return App;

  const select = createDomainSelectSurface();
  const {
    actions,
    config: configActions,
    map: mapActions,
    doors: doorsActions,
    drawers: drawersActions,
    dividers: dividersActions,
    view: viewActions,
    flags: flagsActions,
    room: roomActions,
    colors: colorsActions,
    grooves: groovesActions,
    curtains: curtainsActions,
    modules: modulesActions,
    corner: cornerActions,
    textures: texturesActions,
  } = ensureDomainApiNamespaces(App);

  void dividersActions;
  void groovesActions;

  const {
    readConfig,
    readUi,
    readRuntime,
    captureConfigSnapshot,
    createMeta,
    readMapSnapshot,
    patchConfigMapValue,
    reportNonFatal,
  } = createDomainApiInstallHelpers({ App, configActions });

  installDomainApiModulesCorner({
    App,
    select: {
      modules: ensureDomainNamespace(select, 'modules'),
      corner: ensureDomainNamespace(select, 'corner'),
    },
    modulesActions,
    cornerActions,
    configActions,
    _cfg: readConfig,
    _ui: readUi,
    _ensureObj: ensureDomainRecord,
    _isRecord: isDomainRecord,
    _asMeta: asActionMeta,
    _meta: createMeta,
    _domainApiReportNonFatal: (app0, op, error, opts) => reportNonFatal(op, error, opts),
    _markDelegatesStackPatch: markDelegatesStackPatch,
  });

  installDomainApiSurfaceSections({
    App,
    select,
    mapActions,
    doorsActions,
    drawersActions,
    dividersActions,
    viewActions,
    flagsActions,
    texturesActions,
    groovesActions,
    curtainsActions,
    _cfg: readConfig,
    _ui: readUi,
    _rt: readRuntime,
    _meta: createMeta,
    _map: readMapSnapshot,
    _num: readNumberOrNull,
    _cfgMapPatch: patchConfigMapValue,
  });

  installDomainApiRoomSection({
    App,
    select: { room: ensureDomainNamespace(select, 'room') },
    actions,
    roomActions,
    modulesActions,
    _cfg: readConfig,
    _ui: readUi,
    _rt: readRuntime,
    _captureConfigSnapshot: captureConfigSnapshot,
    _ensureObj: ensureDomainRecord,
    _meta: createMeta,
    _metaNoBuild: metaNoBuild,
    _metaNoBuildNoHistory: metaNoBuildNoHistory,
    _domainApiReportNonFatal: (app0, op, error, opts) => reportNonFatal(op, error, opts),
  });

  installDomainApiColorsSection({
    App,
    select,
    colorsActions,
    configActions,
    _cfg: readConfig,
    _map: readMapSnapshot,
    _meta: createMeta,
    _cfgMapPatch: patchConfigMapValue,
  });

  try {
    markDelegatesStackPatch(cornerActions.patch);
    markDelegatesStackPatch(cornerActions.patchLower);
    markDelegatesStackPatch(cornerActions.patchCellAt);
    markDelegatesStackPatch(cornerActions.patchLowerCellAt);
  } catch {
    // ignore optional delegate marks
  }

  ensureDomainApiInstallState(App).installed = true;
  return App;
}

export function getActions(app: unknown): UnknownRecord | null {
  const App = assertApp(app, 'domain_api');
  return asDomainObject(getActionsRoot(App));
}

export function calculateModuleStructure(
  doorsCount: unknown,
  singlePos: unknown,
  structureSelectValue: unknown,
  wardrobeType: unknown,
  _app?: unknown
): ModulesStructureItem[] {
  try {
    return calculateModuleStructurePure(doorsCount, singlePos, structureSelectValue, wardrobeType);
  } catch {
    return [];
  }
}
