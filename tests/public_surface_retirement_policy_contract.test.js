import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  publicSurfacePolicyViolations,
  retiredSurfaceDomains,
  retiredSurfacesForDomain,
} from '../tools/wp_public_surface_policy_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_public_surface_policy.json'), 'utf8'));

test('retired public surfaces use a validated multi-domain policy', () => {
  assert.equal(policy.version, 2);
  assert.equal(policy.effectiveStage, 'multi-domain-surface-retirement');
  assert.deepEqual(publicSurfacePolicyViolations(policy), []);
  assert.deepEqual(
    Object.fromEntries(
      [...retiredSurfaceDomains(policy).entries()].map(([domain, surfaces]) => [domain, surfaces.length])
    ),
    {
      dimensions: 2,
      'removable-parts': 1,
    }
  );
});

test('domain-scoped retirement queries cannot widen an unrelated contract', () => {
  assert.deepEqual(
    retiredSurfacesForDomain(policy, 'dimensions').map(surface => surface.path),
    ['esm/shared/wardrobe_dimension_tokens_shared.ts', 'esm/native/features/dimensions/index.ts']
  );
  assert.deepEqual(
    retiredSurfacesForDomain(policy, 'removable-parts').map(surface => surface.path),
    ['esm/native/features/removable_parts.ts']
  );
  assert.deepEqual(retiredSurfacesForDomain(policy, 'missing-domain'), []);
});

test('retirement policy validation rejects missing domains and duplicate paths', () => {
  const invalid = {
    version: 2,
    retiredSurfaces: [
      {
        path: 'esm/example.ts',
        domain: '',
        kind: 'retired-example',
        replacement: 'Use esm/replacement.ts.',
        reason: 'Example fixture.',
      },
      {
        path: 'esm/example.ts',
        domain: 'Invalid Domain',
        kind: 'retired-example',
        replacement: 'Use esm/replacement.ts.',
        reason: 'Duplicate fixture.',
      },
    ],
  };
  const violations = publicSurfacePolicyViolations(invalid);
  assert.equal(
    violations.some(value => value.includes('domain must be non-empty text')),
    true
  );
  assert.equal(
    violations.some(value => value.includes('path duplicates esm/example.ts')),
    true
  );
  assert.equal(
    violations.some(value => value.includes('lowercase kebab-case identifier')),
    true
  );
});
