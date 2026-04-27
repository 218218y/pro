import type { BuildInfoServiceLike, UnknownRecord } from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

type BuildTagsRecord = UnknownRecord & {
  builderCore?: unknown;
  projectIO?: unknown;
  kernel?: unknown;
  platform?: unknown;
  core?: unknown;
};

type BuildInfoRuntimeService = BuildInfoServiceLike & {
  tags?: BuildTagsRecord | null;
  slidingDoorsFixTag?: unknown;
};

function asBuildInfoService(value: unknown): BuildInfoRuntimeService | null {
  return asRecord<BuildInfoRuntimeService>(value);
}

function readBuildTags(value: unknown): BuildTagsRecord | null {
  return asRecord<BuildTagsRecord>(value);
}

function createBuildTags(): BuildTagsRecord {
  return createNullRecord<BuildTagsRecord>();
}

function ensureTags(service: BuildInfoRuntimeService): BuildTagsRecord {
  const current = readBuildTags(service.tags);
  if (current) return current;
  const next = createBuildTags();
  service.tags = next;
  return next;
}

export function getBuildInfoServiceMaybe(App: unknown): BuildInfoRuntimeService | null {
  try {
    return asBuildInfoService(getServiceSlotMaybe(App, 'buildInfo'));
  } catch {
    return null;
  }
}

export function ensureBuildInfoService(App: unknown): BuildInfoRuntimeService {
  const service = ensureServiceSlot<BuildInfoRuntimeService>(App, 'buildInfo');
  return asBuildInfoService(service) || service;
}

export function getBuildTagsSnapshot(App: unknown): BuildTagsRecord {
  const service = getBuildInfoServiceMaybe(App);
  const tags = readBuildTags(service?.tags);
  const out: BuildTagsRecord = tags ? { ...tags } : {};
  if (typeof service?.slidingDoorsFixTag !== 'undefined') {
    out.slidingDoorsFixTag = service.slidingDoorsFixTag;
  }
  return out;
}

export function setBuildTag(App: unknown, key: string, value: unknown): BuildTagsRecord {
  const service = ensureBuildInfoService(App);
  const tags = ensureTags(service);
  tags[String(key)] = value;
  return tags;
}

export function getSlidingDoorsFixTag(App: unknown): unknown {
  const service = getBuildInfoServiceMaybe(App);
  return typeof service?.slidingDoorsFixTag === 'undefined' ? undefined : service.slidingDoorsFixTag;
}

export function setSlidingDoorsFixTag(App: unknown, value: unknown): unknown {
  const service = ensureBuildInfoService(App);
  service.slidingDoorsFixTag = value;
  return service.slidingDoorsFixTag;
}
