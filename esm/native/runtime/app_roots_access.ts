import type {
  AppContainer,
  ActionsNamespaceLike,
  AppLayersRootLike,
  BootNamespace,
  BrowserNamespaceLike,
  LifecycleNamespace,
  PlatformNamespace,
  RegistriesNamespaceLike,
  UnknownRecord,
} from '../../../types';

import { asRecord, createNullRecord } from './record.js';

type AppRootHost = Partial<
  Pick<
    AppContainer,
    | 'actions'
    | 'boot'
    | 'browser'
    | 'config'
    | 'deps'
    | 'layers'
    | 'lifecycle'
    | 'platform'
    | 'registries'
    | 'render'
    | 'store'
  >
> &
  UnknownRecord;

type AppRootKey = keyof Pick<
  AppRootHost,
  | 'actions'
  | 'boot'
  | 'browser'
  | 'config'
  | 'deps'
  | 'layers'
  | 'lifecycle'
  | 'platform'
  | 'registries'
  | 'render'
  | 'store'
>;

type RootFactory<T extends UnknownRecord> = () => T;

function createNamespace<T extends UnknownRecord>(): T {
  return createNullRecord<T>();
}

function readAppRootHost(App: unknown): AppRootHost | null {
  return asRecord<AppRootHost>(App);
}

function readAppRootSlot<T extends UnknownRecord>(App: unknown, key: AppRootKey): T | null {
  const host = readAppRootHost(App);
  return host ? asRecord<T>(host[key]) : null;
}

function writeAppRootSlot(host: AppRootHost, key: AppRootKey, value: UnknownRecord): void {
  Reflect.set(host, key, value);
}

function ensureAppRootSlot<T extends UnknownRecord>(
  App: unknown,
  key: AppRootKey,
  makeRoot?: RootFactory<T>
): T {
  const host = readAppRootHost(App);
  const createRoot = makeRoot || createNamespace<T>;
  if (!host) return createRoot();
  const current = asRecord<T>(host[key]);
  if (current) return current;
  const next = createRoot();
  writeAppRootSlot(host, key, next);
  return next;
}

function isBootReadyRoot(boot: BootNamespace | null): boolean {
  try {
    return !!(boot && typeof boot.isReady === 'function' && boot.isReady());
  } catch {
    return false;
  }
}

export function getActionsRootMaybe(App: unknown): (ActionsNamespaceLike & UnknownRecord) | null {
  return readAppRootSlot<ActionsNamespaceLike & UnknownRecord>(App, 'actions');
}

export function ensureActionsRootSlot(App: unknown): ActionsNamespaceLike & UnknownRecord {
  return ensureAppRootSlot<ActionsNamespaceLike & UnknownRecord>(App, 'actions');
}

export function getBrowserRootMaybe(App: unknown): BrowserNamespaceLike | null {
  return readAppRootSlot<BrowserNamespaceLike>(App, 'browser');
}

export function ensureBrowserRoot(App: unknown): BrowserNamespaceLike {
  return ensureAppRootSlot<BrowserNamespaceLike>(App, 'browser');
}

export function getConfigRootMaybe<TConfig extends UnknownRecord = UnknownRecord>(
  App: unknown
): TConfig | null {
  return readAppRootSlot<TConfig>(App, 'config');
}

export function ensureConfigRoot<TConfig extends UnknownRecord = UnknownRecord>(
  App: unknown,
  makeRoot?: RootFactory<TConfig>
): TConfig {
  return ensureAppRootSlot<TConfig>(App, 'config', makeRoot);
}

export function getDepsRootSlotMaybe(App: unknown): UnknownRecord | null {
  return readAppRootSlot<UnknownRecord>(App, 'deps');
}

export function ensureDepsRootSlot(App: unknown): UnknownRecord {
  return ensureAppRootSlot<UnknownRecord>(App, 'deps');
}

export function getStoreRootMaybe<TStore extends UnknownRecord = UnknownRecord>(App: unknown): TStore | null {
  return readAppRootSlot<TStore>(App, 'store');
}

export function ensureStoreRoot<TStore extends UnknownRecord = UnknownRecord>(
  App: unknown,
  makeRoot?: RootFactory<TStore>
): TStore {
  return ensureAppRootSlot<TStore>(App, 'store', makeRoot);
}

export function getRenderRootMaybe<TRender extends UnknownRecord = UnknownRecord>(
  App: unknown
): TRender | null {
  return readAppRootSlot<TRender>(App, 'render');
}

export function ensureRenderRoot<TRender extends UnknownRecord = UnknownRecord>(
  App: unknown,
  makeRoot?: RootFactory<TRender>
): TRender {
  return ensureAppRootSlot<TRender>(App, 'render', makeRoot);
}

export function getPlatformRootMaybe(App: unknown): PlatformNamespace | null {
  return readAppRootSlot<PlatformNamespace>(App, 'platform');
}

export function ensurePlatformRoot(App: unknown): PlatformNamespace {
  return ensureAppRootSlot<PlatformNamespace>(App, 'platform');
}

export function getLayersRootMaybe(App: unknown): AppLayersRootLike | null {
  return readAppRootSlot<AppLayersRootLike>(App, 'layers');
}

export function ensureLayersRoot(App: unknown): AppLayersRootLike {
  return ensureAppRootSlot<AppLayersRootLike>(App, 'layers');
}

export function getBootRootMaybe(App: unknown): BootNamespace | null {
  return readAppRootSlot<BootNamespace>(App, 'boot');
}

export function ensureBootRoot(App: unknown): BootNamespace {
  return ensureAppRootSlot<BootNamespace>(App, 'boot');
}

export function getLifecycleRootMaybe(App: unknown): LifecycleNamespace | null {
  return readAppRootSlot<LifecycleNamespace>(App, 'lifecycle');
}

export function ensureLifecycleRoot(App: unknown): LifecycleNamespace {
  return ensureAppRootSlot<LifecycleNamespace>(App, 'lifecycle');
}

export function getRegistriesRootMaybe(App: unknown): RegistriesNamespaceLike | null {
  return readAppRootSlot<RegistriesNamespaceLike>(App, 'registries');
}

export function ensureRegistriesRoot(App: unknown): RegistriesNamespaceLike {
  return ensureAppRootSlot<RegistriesNamespaceLike>(App, 'registries');
}

export function isBootReady(App: unknown): boolean {
  return isBootReadyRoot(getBootRootMaybe(App));
}

export function isLifecycleBootReady(App: unknown): boolean {
  try {
    const lifecycle = getLifecycleRootMaybe(App);
    return !!(lifecycle && lifecycle.bootReady === true);
  } catch {
    return false;
  }
}

export function isLifecycleTabHidden(App: unknown): boolean {
  try {
    const lifecycle = getLifecycleRootMaybe(App);
    return !!(lifecycle && lifecycle.tabHidden === true);
  } catch {
    return false;
  }
}

export function setLifecycleTabHidden(App: unknown, value: boolean): boolean {
  try {
    const lifecycle = ensureLifecycleRoot(App);
    lifecycle.tabHidden = !!value;
    return true;
  } catch {
    return false;
  }
}
