import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureBuildInfoService,
  getBuildInfoServiceMaybe,
  getBuildTagsSnapshot,
  setBuildTag,
  setSlidingDoorsFixTag,
} from '../esm/native/runtime/build_info_access.js';

test('build info service is canonical-only under services.buildInfo', () => {
  const App: Record<string, unknown> = { services: {} };

  const service = ensureBuildInfoService(App);
  service.tags = { kernel: 'kernel-tag', platform: 'platform-tag' };
  service.slidingDoorsFixTag = 'sliding-fix';

  assert.equal(service.tags?.kernel, 'kernel-tag');
  assert.equal(service.tags?.platform, 'platform-tag');
  assert.equal(service.slidingDoorsFixTag, 'sliding-fix');
  assert.equal('buildInfo' in (App.services as Record<string, unknown>), true);
  assert.equal('__buildTags' in App, false);
  assert.equal('__slidingDoorsFixTag' in App, false);
});

test('build info snapshot merges canonical tags and sliding doors fix tag', () => {
  const App: Record<string, unknown> = { services: {} };
  setBuildTag(App, 'core', 'core-tag');
  setBuildTag(App, 'builderCore', 'builder-tag');
  setSlidingDoorsFixTag(App, 'sliding-fix');

  const snapshot = getBuildTagsSnapshot(App);
  assert.deepEqual(snapshot, {
    core: 'core-tag',
    builderCore: 'builder-tag',
    slidingDoorsFixTag: 'sliding-fix',
  });
  assert.equal(getBuildInfoServiceMaybe(App)?.tags?.builderCore, 'builder-tag');
});

test('legacy root build-info aliases stay ignored when canonical service state exists', () => {
  const App: Record<string, unknown> = {
    services: {},
    __buildTags: { legacy: 'old-root-tag' },
    __slidingDoorsFixTag: 'old-root-fix',
  };

  setBuildTag(App, 'kernel', 'kernel-tag');
  setSlidingDoorsFixTag(App, 'canonical-fix');

  const snapshot = getBuildTagsSnapshot(App);
  assert.deepEqual(snapshot, {
    kernel: 'kernel-tag',
    slidingDoorsFixTag: 'canonical-fix',
  });
  assert.deepEqual((App as { __buildTags?: unknown }).__buildTags, { legacy: 'old-root-tag' });
  assert.equal((App as { __slidingDoorsFixTag?: unknown }).__slidingDoorsFixTag, 'old-root-fix');
  assert.equal(getBuildInfoServiceMaybe(App)?.tags?.legacy, undefined);
  assert.equal(getBuildInfoServiceMaybe(App)?.slidingDoorsFixTag, 'canonical-fix');
});
