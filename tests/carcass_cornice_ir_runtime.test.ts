import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';
import {
  collectCarcassCorniceIrViolations,
  isCarcassCornicePlan,
  type CarcassCornicePlan,
} from '../esm/native/builder/carcass_cornice_ir.ts';

const BASE = {
  totalW: 2.4,
  D: 0.6,
  H: 2.4,
  woodThick: 0.018,
  baseType: '',
  doorsCount: 4,
  hasCornice: true,
};

function moduleWidth(totalW: number, woodThick: number, count: number): number {
  return (totalW - (count + 1) * woodThick) / count;
}

function requireCornicePlan(input: unknown): CarcassCornicePlan {
  const plan = computeCarcassOps(input).cornice;
  assert.ok(plan, 'expected carcass cornice plan');
  assert.equal(isCarcassCornicePlan(plan), true);
  assert.deepEqual(collectCarcassCorniceIrViolations(plan), []);
  assert.ok(plan.segments.length > 0, 'typed cornice plan should contain renderable segments');
  return plan;
}

test('carcass cornice typed IR stays valid across the high-risk geometry matrix', () => {
  const w3 = moduleWidth(BASE.totalW, BASE.woodThick, 3);
  const cases = [
    {
      name: 'classic-default',
      input: { ...BASE, corniceType: 'classic' },
      mode: 'profile_open_back',
    },
    {
      name: 'wave-default',
      input: { ...BASE, corniceType: 'wave' },
      mode: 'wave_frame',
    },
    {
      name: 'classic-removed-left',
      input: {
        ...BASE,
        corniceType: 'classic',
        cfg: { removedDoorsMap: { removed_body_left: true } },
      },
      mode: 'profile_open_back',
    },
    {
      name: 'wave-removed-right',
      input: {
        ...BASE,
        corniceType: 'wave',
        cfg: { removedDoorsMap: { removed_body_right: true } },
      },
      mode: 'wave_frame',
    },
    {
      name: 'classic-height-depth-stepped',
      input: {
        ...BASE,
        H: 2.6,
        corniceType: 'classic',
        moduleInternalWidths: [w3, w3, w3],
        moduleHeightsTotal: [2.4, 2.6, 2.4],
        moduleDepthsTotal: [0.6, 0.78, 0.6],
      },
      mode: 'profile_open_back_segmented',
    },
    {
      name: 'wave-depth-stepped',
      input: {
        ...BASE,
        corniceType: 'wave',
        moduleInternalWidths: [w3, w3, w3],
        moduleHeightsTotal: [2.4, 2.4, 2.4],
        moduleDepthsTotal: [0.6, 0.78, 0.6],
      },
      mode: 'wave_frame_segmented',
    },
    {
      name: 'classic-hex-footprint',
      input: {
        ...BASE,
        totalW: 1,
        D: 0.6,
        corniceType: 'classic',
        moduleInternalWidths: [1 - BASE.woodThick * 2],
        moduleHeightsTotal: [2.4],
        moduleDepthsTotal: [0.5],
        moduleCfgList: [{ hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } }],
      },
      mode: 'profile_open_back_segmented',
    },
    {
      name: 'wave-hex-footprint',
      input: {
        ...BASE,
        totalW: 1,
        D: 0.6,
        corniceType: 'wave',
        moduleInternalWidths: [1 - BASE.woodThick * 2],
        moduleHeightsTotal: [2.4],
        moduleDepthsTotal: [0.5],
        moduleCfgList: [{ hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } }],
      },
      mode: 'wave_frame_segmented',
    },
  ] as const;

  for (const scenario of cases) {
    const plan = requireCornicePlan(scenario.input);
    assert.equal(plan.mode, scenario.mode, scenario.name);
    const waveMode = plan.mode.startsWith('wave_');
    assert.equal(
      plan.segments.every(segment =>
        waveMode
          ? segment.kind === 'cornice_wave_front' || segment.kind === 'cornice_wave_side'
          : segment.kind === 'cornice_profile_seg'
      ),
      true,
      `${scenario.name}: segment discriminants must match the envelope mode`
    );
  }
});

test('carcass cornice IR validator rejects semantic geometry corruption', () => {
  const profile = requireCornicePlan({ ...BASE, corniceType: 'classic' });
  const profileSegment = profile.segments.find(segment => segment.kind === 'cornice_profile_seg');
  assert.ok(profileSegment && profileSegment.kind === 'cornice_profile_seg');

  const modeMismatch = {
    ...profile,
    mode: 'wave_frame',
  };
  assert.equal(isCarcassCornicePlan(modeMismatch), false);
  assert.ok(collectCarcassCorniceIrViolations(modeMismatch).some(v => v.code === 'mode-segment-mismatch'));

  const invalidProfile = {
    ...profile,
    segments: [{ ...profileSegment, profile: [{ x: 0, y: Number.NaN }] }],
  };
  assert.equal(isCarcassCornicePlan(invalidProfile), false);
  assert.ok(collectCarcassCorniceIrViolations(invalidProfile).some(v => v.code === 'invalid-profile'));

  const wave = requireCornicePlan({ ...BASE, corniceType: 'wave' });
  const waveFront = wave.segments.find(segment => segment.kind === 'cornice_wave_front');
  assert.ok(waveFront && waveFront.kind === 'cornice_wave_front');

  const invalidWave = {
    ...wave,
    segments: [{ ...waveFront, width: 0, waveCycles: 1.5 }],
  };
  assert.equal(isCarcassCornicePlan(invalidWave), false);
  const waveViolations = collectCarcassCorniceIrViolations(invalidWave);
  assert.ok(waveViolations.some(v => v.path.endsWith('.width') && v.code === 'non-positive-number'));
  assert.ok(waveViolations.some(v => v.path.endsWith('.waveCycles') && v.code === 'invalid-wave-cycles'));
});
