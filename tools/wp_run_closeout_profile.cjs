'use strict';

const { spawnSync } = require('node:child_process');

const ALLOWED_PROFILES = Object.freeze([
  'verify-core',
  'order-pdf',
  'sketch',
  'cloud-sync',
  'e2e',
  'verify',
  'default',
]);

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function normalizeProfile(value) {
  return String(value || '').trim();
}

function createCloseoutArgs({ profile, appendState = true, stopOnFail = false, logDir = '.artifacts/closeout-logs' }) {
  const normalizedProfile = normalizeProfile(profile);
  if (!ALLOWED_PROFILES.includes(normalizedProfile)) {
    throw new Error(
      `[closeout-profile] Invalid profile: ${normalizedProfile || '(empty)'}\n` +
        `[closeout-profile] Allowed profiles: ${ALLOWED_PROFILES.join(', ')}`
    );
  }

  const args = [
    'tools/wp_verify_closeout.cjs',
    '--profile',
    normalizedProfile,
    '--write',
    '--log-dir',
    logDir,
  ];

  if (normalizeBoolean(appendState)) args.push('--append-state');
  if (normalizeBoolean(stopOnFail)) args.push('--stop-on-fail');

  return args;
}

function runCloseoutProfile(options) {
  const args = createCloseoutArgs(options);
  return spawnSync(process.execPath, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

function main(argv = process.argv.slice(2), env = process.env) {
  const profile = argv[0] || env.CLOSEOUT_PROFILE || 'verify-core';
  const appendState = env.CLOSEOUT_APPEND_STATE === undefined ? true : env.CLOSEOUT_APPEND_STATE;
  const stopOnFail = env.CLOSEOUT_STOP_ON_FAIL || false;

  let result;
  try {
    result = runCloseoutProfile({ profile, appendState, stopOnFail });
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    return 2;
  }

  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return typeof result.status === 'number' ? result.status : 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  ALLOWED_PROFILES,
  createCloseoutArgs,
  main,
  normalizeBoolean,
  normalizeProfile,
};
