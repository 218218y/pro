import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import { splitBottomKey, splitKey } from '../runtime/maps_access.js';
import type {
  DomainCurtainsSelect,
  DomainDividersSelect,
  DomainDoorsSelect,
  DomainDrawersSelect,
  DomainFlagsSelect,
  DomainGroovesSelect,
  DomainTexturesSelect,
  DomainViewSelect,
} from './domain_api_shared.js';
import { ensureDomainApiNamespaces } from './actions_root.js';
import { ensureDomainNamespace, safeMapFromReader } from './domain_api_shared.js';
import {
  DOMAIN_API_SECTION_KEYS,
  grooveMapSemantics,
  readPrefixedToggleMapFlag,
  splitDoorBottomMapSemantics,
  splitDoorMapSemantics,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionSurfaces,
  type DomainApiSurfaceSectionsContext,
  type DomainApiSurfaceSectionsState,
  patchCanonicalMapValue,
  uniqueSurfaceTargets,
} from './domain_api_surface_sections_shared.js';

export function installCanonicalBindings(surface: UnknownRecord, bindings: UnknownRecord): void {
  for (const [key, next] of Object.entries(bindings)) {
    if (typeof next === 'undefined') continue;
    if (surface[key] === next) continue;
    surface[key] = next;
  }
}

export function refreshDomainApiSurfaceSectionsState(
  target: DomainApiSurfaceSectionsState,
  next: DomainApiSurfaceSectionsState
): DomainApiSurfaceSectionsState {
  Object.assign(target, next);
  return target;
}

export function createDomainApiSurfaceSectionSurfaces(
  state: DomainApiSurfaceSectionsState
): DomainApiSurfaceSectionSurfaces {
  return {
    selectRoot: state.selectRoot,
    mapActions: state.mapActions,
    doorsSelect: state.doorsSelect,
    doorsActions: state.doorsActions,
    drawersSelect: state.drawersSelect,
    drawersActions: state.drawersActions,
    dividersSelect: state.dividersSelect,
    dividersActions: state.dividersActions,
    viewSelect: state.viewSelect,
    viewActions: state.viewActions,
    flagsSelect: state.flagsSelect,
    flagsActions: state.flagsActions,
    texturesSelect: state.texturesSelect,
    texturesActions: state.texturesActions,
    groovesSelect: state.groovesSelect,
    groovesActions: state.groovesActions,
    curtainsSelect: state.curtainsSelect,
    curtainsActions: state.curtainsActions,
  };
}

export function attachCanonicalSelectSurfaces(
  selectRoot: UnknownRecord,
  surfaces: Pick<
    DomainApiSurfaceSectionSurfaces,
    | 'doorsSelect'
    | 'drawersSelect'
    | 'dividersSelect'
    | 'viewSelect'
    | 'flagsSelect'
    | 'texturesSelect'
    | 'groovesSelect'
    | 'curtainsSelect'
  >
): void {
  selectRoot.doors = surfaces.doorsSelect;
  selectRoot.drawers = surfaces.drawersSelect;
  selectRoot.dividers = surfaces.dividersSelect;
  selectRoot.view = surfaces.viewSelect;
  selectRoot.flags = surfaces.flagsSelect;
  selectRoot.textures = surfaces.texturesSelect;
  selectRoot.grooves = surfaces.groovesSelect;
  selectRoot.curtains = surfaces.curtainsSelect;
}

export function attachCanonicalActionSurfaces(
  App: AppContainer,
  surfaces: Pick<
    DomainApiSurfaceSectionSurfaces,
    | 'mapActions'
    | 'doorsActions'
    | 'drawersActions'
    | 'dividersActions'
    | 'viewActions'
    | 'flagsActions'
    | 'texturesActions'
    | 'groovesActions'
    | 'curtainsActions'
  >
): void {
  const actionsRoot = ensureDomainApiNamespaces(App).actions;
  actionsRoot.map = surfaces.mapActions;
  actionsRoot.doors = surfaces.doorsActions;
  actionsRoot.drawers = surfaces.drawersActions;
  actionsRoot.dividers = surfaces.dividersActions;
  actionsRoot.view = surfaces.viewActions;
  actionsRoot.flags = surfaces.flagsActions;
  actionsRoot.textures = surfaces.texturesActions;
  actionsRoot.grooves = surfaces.groovesActions;
  actionsRoot.curtains = surfaces.curtainsActions;
}

export function prepareExistingDomainApiSurfaceSectionsContext(
  ctx: DomainApiSurfaceSectionsContext,
  surfaces: DomainApiSurfaceSectionSurfaces
): void {
  attachCanonicalSelectSurfaces(ctx.select, surfaces);
  attachCanonicalActionSurfaces(ctx.App, surfaces);
}

export function createDomainApiSurfaceSectionsState(
  ctx: DomainApiSurfaceSectionsContext,
  canonicalSurfaces?: DomainApiSurfaceSectionSurfaces
): DomainApiSurfaceSectionsState {
  const selectRoot: UnknownRecord = ctx.select;
  const doorsSelect: DomainDoorsSelect = ensureDomainNamespace(selectRoot, 'doors');
  const drawersSelect: DomainDrawersSelect = ensureDomainNamespace(selectRoot, 'drawers');
  const dividersSelect: DomainDividersSelect = ensureDomainNamespace(selectRoot, 'dividers');
  const viewSelect: DomainViewSelect = ensureDomainNamespace(selectRoot, 'view');
  const flagsSelect: DomainFlagsSelect = ensureDomainNamespace(selectRoot, 'flags');
  const groovesSelect: DomainGroovesSelect = ensureDomainNamespace(selectRoot, 'grooves');
  const curtainsSelect: DomainCurtainsSelect = ensureDomainNamespace(selectRoot, 'curtains');
  const texturesSelect: DomainTexturesSelect = ensureDomainNamespace(selectRoot, 'textures');
  const mapActions = canonicalSurfaces?.mapActions || ctx.mapActions;
  const doorsActions = canonicalSurfaces?.doorsActions || ctx.doorsActions;
  const drawersActions = canonicalSurfaces?.drawersActions || ctx.drawersActions;
  const dividersActions = canonicalSurfaces?.dividersActions || ctx.dividersActions;
  const viewActions = canonicalSurfaces?.viewActions || ctx.viewActions;
  const flagsActions = canonicalSurfaces?.flagsActions || ctx.flagsActions;
  const texturesActions = canonicalSurfaces?.texturesActions || ctx.texturesActions;
  const groovesActions = canonicalSurfaces?.groovesActions || ctx.groovesActions;
  const curtainsActions = canonicalSurfaces?.curtainsActions || ctx.curtainsActions;

  const safeMap = (reader: (() => UnknownRecord) | undefined): UnknownRecord => safeMapFromReader(reader);
  const readDoorsRemovedMap = (): UnknownRecord => safeMap(doorsSelect.removedMap);
  const readDoorsSplitMap = (): UnknownRecord => safeMap(doorsSelect.splitMap);
  const readDoorsSplitBottomMap = (): UnknownRecord => safeMap(doorsSelect.splitBottomMap);
  const readDoorsHingeMap = (): UnknownRecord => safeMap(doorsSelect.hingeMap);
  const readDoorsHandlesMap = (): UnknownRecord => safeMap(doorsSelect.handlesMap);
  const readDoorsIsOpen = (): boolean =>
    typeof doorsSelect.isOpen === 'function' ? !!doorsSelect.isOpen() : false;
  const readDividersMap = (): UnknownRecord => safeMap(dividersSelect.map);
  const readDividerIsOn = (dividerKey: unknown): boolean =>
    typeof dividersSelect.isOn === 'function' ? !!dividersSelect.isOn(dividerKey) : false;
  const readGroovesMap = (): UnknownRecord => safeMap(groovesSelect.map);
  const readGrooveIsOn = (partIdOrKey: unknown): boolean =>
    typeof groovesSelect.isOn === 'function' ? !!groovesSelect.isOn(partIdOrKey) : false;
  const readCurtainsMap = (): UnknownRecord => safeMap(curtainsSelect.map);
  const readSplitFlag = (doorBaseId: unknown): boolean =>
    readPrefixedToggleMapFlag(readDoorsSplitMap, doorBaseId, splitDoorMapSemantics, [splitKey(doorBaseId)]);
  const readSplitBottomFlag = (doorBaseId: unknown): boolean =>
    readPrefixedToggleMapFlag(readDoorsSplitBottomMap, doorBaseId, splitDoorBottomMapSemantics, [
      splitBottomKey(doorBaseId),
    ]);
  const readGrooveFlag = (partIdOrKey: unknown): boolean =>
    readPrefixedToggleMapFlag(readGroovesMap, partIdOrKey, grooveMapSemantics);
  const patchCanonicalMapFallback = (
    mapName: string,
    canonicalKey: string,
    value: unknown,
    meta?: ActionMetaLike,
    aliasesToClear?: Array<string | null | undefined>
  ) => patchCanonicalMapValue(ctx._cfgMapPatch, mapName, canonicalKey, value, meta, aliasesToClear);

  return {
    ...ctx,
    mapActions,
    doorsActions,
    drawersActions,
    dividersActions,
    viewActions,
    flagsActions,
    texturesActions,
    groovesActions,
    curtainsActions,
    selectRoot,
    doorsSelect,
    drawersSelect,
    dividersSelect,
    viewSelect,
    flagsSelect,
    groovesSelect,
    curtainsSelect,
    texturesSelect,
    readDoorsRemovedMap,
    readDoorsSplitMap,
    readDoorsSplitBottomMap,
    readDoorsHingeMap,
    readDoorsHandlesMap,
    readDoorsIsOpen,
    readDividersMap,
    readDividerIsOn,
    readGroovesMap,
    readGrooveIsOn,
    readCurtainsMap,
    readSplitFlag,
    readSplitBottomFlag,
    readGrooveFlag,
    patchCanonicalMapFallback,
  };
}

export function installDomainApiSurfaceSectionBindingsOnTargets(
  state: DomainApiSurfaceSectionsState,
  bindings: DomainApiSurfaceSectionBindings,
  surfaces: DomainApiSurfaceSectionSurfaces
): void {
  for (const key of DOMAIN_API_SECTION_KEYS) {
    const nextBindings = bindings[key];
    const targets = uniqueSurfaceTargets([surfaces[key], state[key]]);
    for (const surface of targets) installCanonicalBindings(surface, nextBindings);
  }
}
