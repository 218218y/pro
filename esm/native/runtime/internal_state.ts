// Internal state helpers (Pure ESM)
//
// Purpose:
// - Hold non-functional, boot-time idempotency flags without polluting public App surface.
// - Replace legacy "stage" buckets like App.__stage4.*
//
// Notes:
// - Intentionally shallow plain objects.
// - Never throws; callers should treat missing data as "not installed".

import type { UnknownRecord } from '../../../types';
import { asRecord } from './record.js';

const INTERNAL_KEY = '__wpInternal';

type InternalRoot = UnknownRecord & {
  boot?: UnknownRecord;
};

type InternalOwner = UnknownRecord & {
  [INTERNAL_KEY]?: InternalRoot;
};

function readRecord(value: unknown): UnknownRecord | null {
  return asRecord(value);
}

function readInternalRoot(value: unknown): InternalRoot | null {
  return asRecord<InternalRoot>(value);
}

function readInternalOwner(value: unknown): InternalOwner | null {
  return asRecord<InternalOwner>(value);
}

function ensureInternalRoot(App: unknown): InternalRoot {
  const owner = readInternalOwner(App);
  if (!owner) return {};

  const cur = readInternalRoot(owner[INTERNAL_KEY]);
  if (cur) return cur;

  const next: InternalRoot = {};
  try {
    owner[INTERNAL_KEY] = next;
  } catch {
    // ignore
  }
  return next;
}

/** Returns the internal boot flags bucket (idempotency markers). */
export function getBootFlags(App: unknown): UnknownRecord {
  const root = ensureInternalRoot(App);
  const boot = readRecord(root.boot);
  if (boot) return boot;

  const next: UnknownRecord = {};
  try {
    root.boot = next;
  } catch {
    // ignore
  }
  return next;
}
