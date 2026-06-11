import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKnownMapSnapshot } from '../esm/native/runtime/maps_access_normalizers.ts';

test('maps access normalizers keep hinge entries detached and door trim ids stable across normalizations', () => {
  const hingeNested = { inner: { side: 'left' } };
  const hingeMap = normalizeKnownMapSnapshot('hingeMap', {
    d1: { dir: 'left', nested: hingeNested },
  });

  assert.deepEqual(hingeMap.d1, { dir: 'left', nested: { inner: { side: 'left' } } });
  assert.notEqual(hingeMap.d1, null);
  const hingeRec = hingeMap.d1 as Record<string, unknown>;
  assert.notEqual(hingeRec.nested, hingeNested);
  assert.notEqual((hingeRec.nested as Record<string, unknown>).inner, hingeNested.inner);

  const rawTrim = {
    axis: 'vertical',
    color: 'gold',
    span: 'custom',
    sizeCm: '17',
    crossSizeCm: '6.5',
    centerXNorm: '0.25',
    centerYNorm: '0.75',
  };
  const trimMapA = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });
  const trimMapB = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });

  assert.equal(trimMapA.d1?.[0]?.id, trimMapB.d1?.[0]?.id);
  assert.equal(trimMapA.d1?.[0]?.axis, 'vertical');
  assert.equal(trimMapA.d1?.[0]?.color, 'gold');
  assert.equal(trimMapA.d1?.[0]?.sizeCm, 17);
  assert.equal(trimMapA.d1?.[0]?.crossSizeCm, 6.5);

  const firstId = trimMapA.d1?.[0]?.id;
  trimMapA.d1?.[0] && (trimMapA.d1[0].color = 'black');
  const trimMapC = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });
  assert.equal(trimMapC.d1?.[0]?.id, firstId);
  assert.equal(trimMapC.d1?.[0]?.color, 'gold');

  const mirrorMap = normalizeKnownMapSnapshot('mirrorLayoutMap', {
    d1: [{ widthCm: '45', heightCm: 75, faceSign: -1 }, { widthCm: 0 }],
    d2: [{ faceSign: -1 }],
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(mirrorMap).map(([key, list]) => [key, list.map(entry => ({ ...entry }))])
    ),
    {
      d1: [{ widthCm: 45, heightCm: 75, faceSign: -1 }],
      d2: [{ faceSign: -1 }],
    }
  );
});
