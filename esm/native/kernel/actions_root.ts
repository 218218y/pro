// Canonical action namespace installation helpers.
//
// Why this exists:
// - state_api.ts and domain_api.ts both own action-surface installation
// - both modules must write onto the same mutable App.actions root
// - namespace creation should be explicit and shared rather than re-implemented
//
// Keep this helper tiny and dependency-light so it can stay at the kernel boundary
// without pulling in feature/domain behavior.

import type {
  AppContainer,
  UnknownRecord,
  ActionsNamespaceLike,
  BuilderActionsNamespaceLike,
  ColorsActionsLike,
  ConfigActionsNamespaceLike,
  CornerActionsLike,
  CurtainsActionsLike,
  DoorsActionsLike,
  DrawersActionsLike,
  DividersActionsLike,
  FlagsActionsLike,
  GroovesActionsLike,
  HistoryActionsNamespaceLike,
  MapsNamespaceLike,
  MetaActionsNamespaceLike,
  ModeActionsNamespaceLike,
  ModulesActionsLike,
  RuntimeActionsNamespaceLike,
  StoreActionsNamespaceLike,
  TexturesActionsLike,
  UiActionsNamespaceLike,
  ViewActionsLike,
  RoomActionsLike,
} from '../../../types';

import { ensureActionsRootSlot } from '../runtime/app_roots_access.js';
import { asRecord, createNullRecord } from '../runtime/record.js';

type MutableActionsRoot = ActionsNamespaceLike & UnknownRecord;

function createNamespace<T extends UnknownRecord>(): T {
  return createNullRecord<T>();
}

function asMutableNamespace<T extends UnknownRecord>(value: unknown): T | null {
  return asRecord<T>(value);
}

function ensureMutableNamespace<T extends UnknownRecord>(owner: UnknownRecord, key: string): T {
  const current = asMutableNamespace<T>(owner[key]);
  if (current) return current;
  const next = createNamespace<T>();
  owner[key] = next;
  return next;
}

function ensureActionsRecord(app: AppContainer): MutableActionsRoot {
  const current = asMutableNamespace<MutableActionsRoot>(ensureActionsRootSlot(app));
  if (current) return current;
  return createNamespace<MutableActionsRoot>();
}

export function ensureActionsRoot(app: AppContainer): ActionsNamespaceLike {
  return ensureActionsRecord(app);
}

export interface StateApiNamespaceBundle {
  actions: ActionsNamespaceLike;
  meta: MetaActionsNamespaceLike;
  runtime: RuntimeActionsNamespaceLike;
  ui: UiActionsNamespaceLike;
  config: ConfigActionsNamespaceLike;
  mode: ModeActionsNamespaceLike;
  builder: BuilderActionsNamespaceLike;
  modules: ModulesActionsLike;
  corner: CornerActionsLike;
  history: HistoryActionsNamespaceLike;
  store: StoreActionsNamespaceLike;
}

export function ensureStateApiNamespaces(app: AppContainer): StateApiNamespaceBundle {
  const actions = ensureActionsRecord(app);
  return {
    actions,
    meta: ensureMutableNamespace<MetaActionsNamespaceLike>(actions, 'meta'),
    runtime: ensureMutableNamespace<RuntimeActionsNamespaceLike>(actions, 'runtime'),
    ui: ensureMutableNamespace<UiActionsNamespaceLike>(actions, 'ui'),
    config: ensureMutableNamespace<ConfigActionsNamespaceLike>(actions, 'config'),
    mode: ensureMutableNamespace<ModeActionsNamespaceLike>(actions, 'mode'),
    builder: ensureMutableNamespace<BuilderActionsNamespaceLike>(actions, 'builder'),
    modules: ensureMutableNamespace<ModulesActionsLike>(actions, 'modules'),
    corner: ensureMutableNamespace<CornerActionsLike>(actions, 'corner'),
    history: ensureMutableNamespace<HistoryActionsNamespaceLike>(actions, 'history'),
    store: ensureMutableNamespace<StoreActionsNamespaceLike>(actions, 'store'),
  };
}

export interface DomainApiNamespaceBundle {
  actions: ActionsNamespaceLike;
  config: ConfigActionsNamespaceLike;
  map: MapsNamespaceLike;
  doors: DoorsActionsLike;
  drawers: DrawersActionsLike;
  dividers: DividersActionsLike;
  view: ViewActionsLike;
  flags: FlagsActionsLike;
  room: RoomActionsLike;
  colors: ColorsActionsLike;
  grooves: GroovesActionsLike;
  curtains: CurtainsActionsLike;
  modules: ModulesActionsLike;
  corner: CornerActionsLike;
  textures: TexturesActionsLike;
}

export function ensureDomainApiNamespaces(app: AppContainer): DomainApiNamespaceBundle {
  const actions = ensureActionsRecord(app);
  return {
    actions,
    config: ensureMutableNamespace<ConfigActionsNamespaceLike>(actions, 'config'),
    map: ensureMutableNamespace<MapsNamespaceLike>(actions, 'map'),
    doors: ensureMutableNamespace<DoorsActionsLike>(actions, 'doors'),
    drawers: ensureMutableNamespace<DrawersActionsLike>(actions, 'drawers'),
    dividers: ensureMutableNamespace<DividersActionsLike>(actions, 'dividers'),
    view: ensureMutableNamespace<ViewActionsLike>(actions, 'view'),
    flags: ensureMutableNamespace<FlagsActionsLike>(actions, 'flags'),
    room: ensureMutableNamespace<RoomActionsLike>(actions, 'room'),
    colors: ensureMutableNamespace<ColorsActionsLike>(actions, 'colors'),
    grooves: ensureMutableNamespace<GroovesActionsLike>(actions, 'grooves'),
    curtains: ensureMutableNamespace<CurtainsActionsLike>(actions, 'curtains'),
    modules: ensureMutableNamespace<ModulesActionsLike>(actions, 'modules'),
    corner: ensureMutableNamespace<CornerActionsLike>(actions, 'corner'),
    textures: ensureMutableNamespace<TexturesActionsLike>(actions, 'textures'),
  };
}
