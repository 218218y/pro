import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYWRIGHT_CRITICAL_MATRIX_PROFILES,
  getPlaywrightCriticalMatrixProfile,
} from '../tools/wp_playwright_matrix_profiles.js';

test('playwright critical matrix stays targeted, unique, and covers the intended browser dimensions', () => {
  assert.deepEqual(
    PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.map(profile => profile.name),
    [
      'matrix-desktop',
      'matrix-xs-portrait',
      'matrix-xs-landscape',
      'matrix-touch-dpr2',
      'matrix-reduced-motion',
    ]
  );

  assert.equal(new Set(PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.map(profile => profile.name)).size, 5);
  assert.ok(
    PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.some(profile => profile.viewport.height > profile.viewport.width),
    'matrix should include a portrait profile'
  );
  assert.ok(
    PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.some(
      profile => profile.viewport.width > profile.viewport.height && profile.viewport.height <= 400
    ),
    'matrix should include a compact landscape profile'
  );
  assert.ok(
    PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.some(profile => profile.hasTouch && profile.deviceScaleFactor === 2),
    'matrix should include touch with DPR2'
  );
  assert.ok(
    PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.some(profile => profile.reducedMotion === 'reduce'),
    'matrix should include reduced motion'
  );

  for (const profile of PLAYWRIGHT_CRITICAL_MATRIX_PROFILES) {
    assert.ok(profile.viewport.width > 0);
    assert.ok(profile.viewport.height > 0);
    assert.ok(profile.deviceScaleFactor >= 1);
    assert.equal(getPlaywrightCriticalMatrixProfile(profile.name), profile);
  }
  assert.equal(getPlaywrightCriticalMatrixProfile('unknown-profile'), null);
});
