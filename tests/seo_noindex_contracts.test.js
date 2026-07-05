import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSiteProfile, renderSiteReleaseTemplate } from '../tools/wp_site_profiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOINDEX_DIRECTIVE = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
const ROBOTS_META_RE = new RegExp(
  `<meta\\s+name=["']robots["']\\s+content=["']${NOINDEX_DIRECTIVE.replace(/ /g, '\\s*')}["']\\s*/?>`,
  'i'
);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assertHtmlNoindex(rel, html = read(rel)) {
  assert.match(html, ROBOTS_META_RE, `${rel} must include the canonical robots noindex meta tag`);
  assert.match(html, /<head[\s>]/i, `${rel} must keep a normal HTML head`);
}

test('[seo-noindex] root and release HTML templates opt out of search indexing', () => {
  for (const rel of [
    'index_pro.html',
    'index_pro_esm.html',
    'index_site2.html',
    'tools/index_release.html',
    'tools/index_release_bundle.html',
    'tools/index_release_bundle_site2.html',
  ]) {
    assertHtmlNoindex(rel);
  }
});

test('[seo-noindex] multi-store generated release templates inherit noindex', async () => {
  for (const store of ['bargig', 'store-1', 'store-2']) {
    const profile = await loadSiteProfile(ROOT, store);
    for (const variant of ['main', 'site2']) {
      assertHtmlNoindex(
        `${store}/${variant} generated release template`,
        renderSiteReleaseTemplate(ROOT, profile, variant)
      );
    }
  }
});

test('[seo-noindex] deploy headers and robots.txt keep pages accessible but non-indexable', () => {
  const publicHeaders = read('public/_headers');
  assert.match(
    publicHeaders,
    /\/\*\s+X-Robots-Tag:\s*noindex, nofollow, noarchive, nosnippet, noimageindex/i
  );

  const netlifyToml = read('netlify.toml');
  assert.match(netlifyToml, /for\s*=\s*"\/\*"/);
  assert.match(netlifyToml, /X-Robots-Tag\s*=\s*"noindex, nofollow, noarchive, nosnippet, noimageindex"/);

  const robots = read('public/robots.txt');
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.doesNotMatch(robots, /Disallow:\s*\//i, 'robots.txt must not block crawlers from seeing noindex');
});
