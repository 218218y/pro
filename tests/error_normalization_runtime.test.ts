import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachErrorMessage,
  buildErrorResult,
  getNormalizedErrorHead,
  normalizeErrorReason,
  normalizeUnknownError,
  normalizeUnknownErrorInfo,
} from '../esm/native/runtime/error_normalization.ts';

test('error normalization preserves message across Error, string, and record-like inputs', () => {
  assert.deepEqual(normalizeUnknownError(new Error('boom')), { message: 'boom', name: 'Error' });
  assert.deepEqual(normalizeUnknownError('plain failure'), { message: 'plain failure' });
  assert.deepEqual(normalizeUnknownError({ message: 'record failure', name: 'CustomError' }), {
    message: 'record failure',
    name: 'CustomError',
  });
});

test('error normalization falls back for opaque values instead of returning an empty message', () => {
  assert.deepEqual(normalizeUnknownError({ detail: 123 }, 'fallback failed'), { message: '{"detail":123}' });
  assert.deepEqual(normalizeUnknownError(null, 'fallback failed'), { message: 'fallback failed' });
  assert.deepEqual(buildErrorResult('error', null, 'fallback failed'), {
    ok: false,
    reason: 'error',
    message: 'fallback failed',
  });
});

test('attachErrorMessage upgrades canonical failure payloads with normalized messages', () => {
  assert.deepEqual(attachErrorMessage({ ok: false, reason: 'error' }, 'string failure'), {
    ok: false,
    reason: 'error',
    message: 'string failure',
  });
  assert.deepEqual(attachErrorMessage({ ok: false, reason: 'error', message: 'existing' }, null), {
    ok: false,
    reason: 'error',
    message: 'existing',
  });
});

test('error normalization exposes canonical info and head without each caller re-reading stack/message', () => {
  const err = new Error('head boom');
  err.name = 'CustomBoom';
  err.stack = 'CustomBoom: head boom\n    at unit';

  assert.deepEqual(normalizeUnknownErrorInfo(err), {
    message: 'head boom',
    name: 'CustomBoom',
    stack: 'CustomBoom: head boom\n    at unit',
  });
  assert.equal(getNormalizedErrorHead(err), 'CustomBoom: head boom');
});

test('error normalization classifies explicit failure reasons without guessing from arbitrary text', () => {
  assert.equal(normalizeErrorReason({ reason: 'invalid-file' }), 'invalid');
  assert.equal(normalizeErrorReason({ code: 'AbortError' }), 'cancelled');
  assert.equal(normalizeErrorReason({ name: 'NotSupported' }), 'unavailable');
  assert.equal(normalizeErrorReason({ message: 'plain text only' }), 'error');
});
