import type { ServicesNamespace, UnknownRecord } from '../../../types';

import { asRecord, createNullRecord } from './record.js';

type ServicesHostLike = UnknownRecord & {
  services?: unknown;
};

function createRecord<T extends object>(): T {
  return createNullRecord<T>();
}

function readServicesHost(App: unknown): ServicesHostLike | null {
  return asRecord<ServicesHostLike>(App);
}

export function getServicesRootMaybe(App: unknown): ServicesNamespace | null {
  const host = readServicesHost(App);
  return host ? asRecord<ServicesNamespace>(host.services) : null;
}

export function ensureServicesRoot(App: unknown): ServicesNamespace {
  const host = readServicesHost(App);
  if (!host) return createRecord<ServicesNamespace>();
  const current = asRecord<ServicesNamespace>(host.services);
  if (current) return current;
  const next = createRecord<ServicesNamespace>();
  host.services = next;
  return next;
}

export function getServiceSlotMaybe<T extends object = UnknownRecord>(App: unknown, key: string): T | null {
  const services = getServicesRootMaybe(App);
  return services ? asRecord<T>(services[key]) : null;
}

export function ensureServiceSlot<T extends object = UnknownRecord>(App: unknown, key: string): T {
  const services = ensureServicesRoot(App);
  const current = asRecord<T>(services[key]);
  if (current) return current;
  const next = createRecord<T>();
  services[key] = next;
  return next;
}
