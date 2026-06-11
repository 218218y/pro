import { countNeedles, countNeedlesByDir } from './wp_check_shared.js';
import { resolvePolicyNeedles } from './wp_check_state.js';

export function collectPolicyStats(mode, srcRoot, files) {
  const needles = resolvePolicyNeedles(mode);
  return {
    needles,
    totals: countNeedles(files, needles),
    byDir: countNeedlesByDir(srcRoot, files, needles),
  };
}

export function assertStrict(mode, totals) {
  if (mode !== 'esm') return { ok: true, failures: [] };
  const failures = Object.entries(totals).filter(([, value]) => value > 0);
  return { ok: failures.length === 0, failures };
}

export function assertGate(baseline, totals) {
  if (!baseline) {
    return {
      ok: false,
      missingBaseline: true,
      failures: [],
    };
  }
  const failures = [];
  for (const [needle, value] of Object.entries(totals)) {
    const baselineValue = baseline.totals?.[needle] ?? 0;
    if (value > baselineValue) failures.push([needle, value, baselineValue]);
  }
  return {
    ok: failures.length === 0,
    missingBaseline: false,
    failures,
  };
}
