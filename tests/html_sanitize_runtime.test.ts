import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeHtmlByPolicy,
  setSanitizedElementHtmlIfChanged,
} from '../esm/native/ui/html_sanitize_runtime.ts';

test('html sanitize runtime keeps allowed order-pdf markers and drops executable content', () => {
  const html =
    '<div onclick="boom()"><span data-wp-auto="start" contenteditable="false"></span><font color="#ff0000" size="4" onmouseover="x">safe</font><script>alert(1)</script></div>';
  const sanitized = sanitizeHtmlByPolicy(null, html, 'order-pdf-rich');
  assert.equal(
    sanitized,
    '<div><span data-wp-auto="start" contenteditable="false"></span><font color="#ff0000" size="4">safe</font></div>'
  );
  assert.doesNotMatch(sanitized, /onclick|onmouseover|alert/u);
});

test('html sanitize runtime keeps safe overlay links and drops javascript hrefs', () => {
  const safe = sanitizeHtmlByPolicy(
    null,
    '<p><a href="https://example.com" target="_blank" rel="nofollow">open</a></p>',
    'overlay-help'
  );
  assert.equal(
    safe,
    '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">open</a></p>'
  );
  const unsafe = sanitizeHtmlByPolicy(
    null,
    '<p><a href="javascript:alert(1)" onclick="boom()">bad</a><img src=x></p>',
    'overlay-help'
  );
  assert.equal(unsafe, '<p><a>bad</a></p>');
});

test('html sanitize runtime drops SVG and MathML in the text-only fallback', () => {
  const sanitized = sanitizeHtmlByPolicy(
    null,
    '<svg><a href="https://example.com">svg</a></svg><math><mtext>math</mtext></math><p>kept</p>',
    'overlay-help'
  );
  assert.equal(sanitized, '<p>kept</p>');
});

test('html sanitize runtime writes innerHTML only when sanitized html actually changes', () => {
  const writes: string[] = [];
  const el = { innerHTML: '<div>safe</div>' } as Element & { innerHTML: string };
  const resultSame = setSanitizedElementHtmlIfChanged({
    el,
    html: '<div onclick="boom()">safe</div>',
    policy: 'order-pdf-rich',
  });
  if (resultSame.changed) writes.push(el.innerHTML);
  assert.equal(resultSame.changed, false);
  assert.equal(el.innerHTML, '<div>safe</div>');
  const resultChanged = setSanitizedElementHtmlIfChanged({
    el,
    html: '<div><font size="4">new</font></div>',
    policy: 'order-pdf-rich',
  });
  if (resultChanged.changed) writes.push(el.innerHTML);
  assert.equal(resultChanged.changed, true);
  assert.equal(el.innerHTML, '<div><font size="4">new</font></div>');
  assert.deepEqual(writes, ['<div><font size="4">new</font></div>']);
});
