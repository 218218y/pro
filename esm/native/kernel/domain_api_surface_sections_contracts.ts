import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  CurtainsActionsLike,
  DividersActionsLike,
  DoorsActionsLike,
  DrawersActionsLike,
  FlagsActionsLike,
  GroovesActionsLike,
  RuntimeStateLike,
  TexturesActionsLike,
  UiStateLike,
  UnknownRecord,
  ViewActionsLike,
} from '../../../types';
import type {
  DomainCurtainsSelect,
  DomainDividersSelect,
  DomainDoorsSelect,
  DomainDrawersSelect,
  DomainFlagsSelect,
  DomainGroovesSelect,
  DomainSelectSurface,
  DomainTexturesSelect,
  DomainViewSelect,
} from './domain_api_shared.js';

export interface DomainApiSurfaceSectionsContext {
  App: AppContainer;
  select: DomainSelectSurface;
  mapActions: UnknownRecord;
  doorsActions: DoorsActionsLike;
  drawersActions: DrawersActionsLike;
  dividersActions: DividersActionsLike;
  viewActions: ViewActionsLike;
  flagsActions: FlagsActionsLike;
  texturesActions: TexturesActionsLike;
  groovesActions: GroovesActionsLike;
  curtainsActions: CurtainsActionsLike;
  _cfg: () => ConfigStateLike;
  _ui: () => UiStateLike;
  _rt: () => RuntimeStateLike;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  _map: (mapName: unknown) => UnknownRecord;
  _num: (value: unknown) => number | null;
  _cfgMapPatch: (mapName: unknown, key: unknown, val: unknown, meta?: ActionMetaLike) => unknown;
}

export interface DomainApiSurfaceSectionsState extends DomainApiSurfaceSectionsContext {
  selectRoot: UnknownRecord;
  doorsSelect: DomainDoorsSelect;
  drawersSelect: DomainDrawersSelect;
  dividersSelect: DomainDividersSelect;
  viewSelect: DomainViewSelect;
  flagsSelect: DomainFlagsSelect;
  groovesSelect: DomainGroovesSelect;
  curtainsSelect: DomainCurtainsSelect;
  texturesSelect: DomainTexturesSelect;
  readDoorsRemovedMap: () => UnknownRecord;
  readDoorsSplitMap: () => UnknownRecord;
  readDoorsSplitBottomMap: () => UnknownRecord;
  readDoorsHingeMap: () => UnknownRecord;
  readDoorsHandlesMap: () => UnknownRecord;
  readDoorsIsOpen: () => boolean;
  readDividersMap: () => UnknownRecord;
  readDividerIsOn: (dividerKey: unknown) => boolean;
  readGroovesMap: () => UnknownRecord;
  readGrooveIsOn: (partIdOrKey: unknown) => boolean;
  readCurtainsMap: () => UnknownRecord;
  readSplitFlag: (doorBaseId: unknown) => boolean;
  readSplitBottomFlag: (doorBaseId: unknown) => boolean;
  readGrooveFlag: (partIdOrKey: unknown) => boolean;
  patchCanonicalMapFallback: (
    mapName: string,
    canonicalKey: string,
    value: unknown,
    meta?: ActionMetaLike,
    aliasesToClear?: Array<string | null | undefined>
  ) => unknown;
}

export const DOMAIN_API_SECTION_KEYS = [
  'selectRoot',
  'mapActions',
  'doorsSelect',
  'doorsActions',
  'drawersSelect',
  'drawersActions',
  'dividersSelect',
  'dividersActions',
  'viewSelect',
  'viewActions',
  'flagsSelect',
  'flagsActions',
  'texturesSelect',
  'texturesActions',
  'groovesSelect',
  'groovesActions',
  'curtainsSelect',
  'curtainsActions',
] as const;

export type DomainApiSurfaceSectionKey = (typeof DOMAIN_API_SECTION_KEYS)[number];
export type DomainApiSurfaceSectionBag = Record<DomainApiSurfaceSectionKey, UnknownRecord>;
export type DomainApiSurfaceSectionBindingFactory = (
  state: DomainApiSurfaceSectionsState
) => DomainApiSurfaceSectionBag[DomainApiSurfaceSectionKey];
export type DomainApiSurfaceSectionBindings = DomainApiSurfaceSectionBag;
export type DomainApiSurfaceSectionSurfaces = DomainApiSurfaceSectionBag;

export interface DomainApiSurfaceSectionsOwner {
  state: DomainApiSurfaceSectionsState;
  bindings: DomainApiSurfaceSectionBindings;
  surfaces: DomainApiSurfaceSectionSurfaces;
}

export function uniqueSurfaceTargets(surfaces: Array<UnknownRecord | null | undefined>): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  const seen = new Set<UnknownRecord>();
  for (const surface of surfaces) {
    if (!surface || typeof surface !== 'object') continue;
    if (seen.has(surface)) continue;
    seen.add(surface);
    out.push(surface);
  }
  return out;
}
