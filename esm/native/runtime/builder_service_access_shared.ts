import type {
  AppContainer,
  BuilderServiceLike,
  BuildRequestOptsLike,
  UiSnapshotLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export type BuilderBagLike = BuilderServiceLike;
export type BuildRequestMeta = BuildRequestOptsLike & UnknownRecord & { source?: string };
export type BuilderCallable = (state?: unknown) => unknown;
export type RequestBuildCallable = (uiOverride?: UiSnapshotLike | null, opts?: BuildRequestMeta) => unknown;
export type BoundBuilderMethod<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Result;

export function bindBuilderMethod<Args extends unknown[], Result>(
  owner: unknown,
  key: string
): BoundBuilderMethod<Args, Result> | null {
  const rec = asRecord<UnknownRecord>(owner);
  const fn = rec?.[key];
  if (typeof fn !== 'function') return null;
  return (...args: Args): Result => Reflect.apply(fn, rec, args);
}

export function requireBuilderMethod<Args extends unknown[], Result>(
  owner: unknown,
  key: string,
  message: string
): BoundBuilderMethod<Args, Result> {
  const fn = bindBuilderMethod<Args, Result>(owner, key);
  if (!fn) throw new ReferenceError(message);
  return fn;
}

export function cloneBuilderRequestMeta(meta?: UnknownRecord): BuildRequestMeta {
  const next: BuildRequestMeta = meta ? { ...meta } : {};
  if (!next.reason && typeof next.source === 'string' && next.source) next.reason = next.source;
  if (typeof next.immediate !== 'boolean') next.immediate = true;
  if (typeof next.force !== 'boolean') next.force = true;
  return next;
}

export function didBuilderRequestAccept(result: unknown): boolean {
  return result !== false;
}

export function asBuilderService(value: unknown): BuilderBagLike | null {
  return asRecord<BuilderBagLike>(value);
}

export function readBuilderRecord<T extends UnknownRecord>(
  builder: BuilderBagLike | null,
  key: keyof BuilderServiceLike & string
): T | null {
  return builder ? asRecord<T>(builder[key]) : null;
}

export function ensureBuilderService(
  App: AppContainer,
  label = 'runtime/builder_service_access.ensure'
): BuilderServiceLike {
  const builder = asBuilderService(ensureServiceSlot<BuilderBagLike>(App, 'builder'));
  if (!builder) throw new Error(`[WardrobePro] App missing (${label})`);
  return builder;
}

export function getBuilderService(App: unknown): BuilderServiceLike | null {
  return asBuilderService(getServiceSlotMaybe<BuilderBagLike>(App, 'builder'));
}

export function requireBuilderService(
  App: AppContainer,
  label = 'runtime/builder_service_access'
): BuilderServiceLike {
  const builder = getBuilderService(App);
  if (!builder) {
    throw new Error(`[WardrobePro] Builder service missing (${label}): expected App.services.builder`);
  }
  return builder;
}
