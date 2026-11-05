import { CARCASS_CORNICE_STRAIGHT_POLICY } from '../../shared/dimensions/carcass_cornice_render_policy.js';

export function buildStraightCorniceProfile(): { x: number; y: number }[] {
  const { overhangM, depthM, heightM } = CARCASS_CORNICE_STRAIGHT_POLICY;
  const bearingM = depthM - overhangM;
  return [
    { x: -bearingM, y: 0 },
    { x: overhangM, y: 0 },
    { x: overhangM, y: heightM },
    { x: -bearingM, y: heightM },
  ];
}
