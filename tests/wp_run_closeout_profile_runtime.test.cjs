'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_PROFILES,
  createCloseoutArgs,
  normalizeBoolean,
  normalizeProfile,
} = require('../tools/wp_run_closeout_profile.cjs');

test('closeout profile runner exposes the supported manual profiles', () => {
  assert.deepEqual(ALLOWED_PROFILES, [
    'verify-core',
    'control-plane',
    'order-pdf',
    'sketch',
    'cloud-sync',
    'e2e',
    'browser-evidence',
    'verify',
    'default',
  ]);
});

test('closeout profile runner builds canonical arguments for safe workflow usage', () => {
  assert.deepEqual(createCloseoutArgs({ profile: 'order-pdf' }), [
    'tools/wp_verify_closeout.cjs',
    '--profile',
    'order-pdf',
    '--log-dir',
    '.artifacts/closeout-logs',
    '--append-state',
  ]);
  assert.deepEqual(
    createCloseoutArgs({
      profile: 'sketch',
      appendState: false,
      stopOnFail: true,
      logDir: '.artifacts/custom-closeout-logs',
    }),
    [
      'tools/wp_verify_closeout.cjs',
      '--profile',
      'sketch',
      '--log-dir',
      '.artifacts/custom-closeout-logs',
      '--stop-on-fail',
    ]
  );
});

test('closeout profile runner writes a final report only for the complete default profile', () => {
  const args = createCloseoutArgs({ profile: 'default' });
  assert.equal(args.includes('--write-final'), true);
  assert.equal(args.includes('--write'), false);

  const focusedArgs = createCloseoutArgs({ profile: 'browser-evidence' });
  assert.equal(focusedArgs.includes('--write-final'), false);
  assert.equal(focusedArgs.includes('--write'), false);
});

test('closeout profile runner rejects invalid profiles instead of falling back to default', () => {
  assert.throws(() => createCloseoutArgs({ profile: 'typo-profile' }), /Invalid profile: typo-profile/);
  assert.throws(() => createCloseoutArgs({ profile: '' }), /Invalid profile: \(empty\)/);
});

test('closeout profile runner normalizes booleans and profile strings', () => {
  assert.equal(normalizeBoolean(true), true);
  assert.equal(normalizeBoolean('true'), true);
  assert.equal(normalizeBoolean('1'), true);
  assert.equal(normalizeBoolean('yes'), true);
  assert.equal(normalizeBoolean(false), false);
  assert.equal(normalizeBoolean('false'), false);
  assert.equal(normalizeProfile('  cloud-sync  '), 'cloud-sync');
});
