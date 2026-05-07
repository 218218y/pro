import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const styles = fs.readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../css/react_tokens.css', import.meta.url), 'utf8');

function normalizeShadowValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTokenizedShadow(value) {
  const normalized = normalizeShadowValue(value);
  if (normalized === 'none') return true;
  return /^var\(--(?:wp-r-shadow|shadow)-[^)]+\)$/i.test(normalized);
}

test('react stylesheet box-shadow declarations use shared shadow tokens', () => {
  const tokenless = [];
  for (const match of styles.matchAll(/box-shadow\s*:\s*([^;]+);/gi)) {
    const value = normalizeShadowValue(match[1]);
    if (!isTokenizedShadow(value)) tokenless.push(value);
  }

  assert.deepEqual(tokenless, []);
  assert.match(styles, /box-shadow:\s*var\(--wp-r-shadow-floating\);/);
  assert.match(styles, /box-shadow:\s*var\(--wp-r-shadow-pdf-sketch-card\);/);
});

test('react shadow token catalog does not accumulate unused tokens', () => {
  const shadowTokens = [...tokens.matchAll(/^\s*(--wp-r-shadow-[\w-]+)\s*:/gm)].map(match => match[1]);
  assert.ok(shadowTokens.length > 0, 'expected React shadow tokens to be defined');

  const unused = shadowTokens.filter(token => !styles.includes(`var(${token})`));
  assert.deepEqual(unused, []);
});
