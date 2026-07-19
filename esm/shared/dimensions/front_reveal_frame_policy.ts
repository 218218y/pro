import { SLIDING_DOOR_CONSTRUCTION_POLICY } from './door_system_policy.js';
import { EXTERNAL_DRAWER_FRONT_RENDER_POLICY } from './external_drawer_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const FRONT_REVEAL_GEOMETRY_POLICY = Object.freeze({
  zNudgeM: meters(0.0008),
  localLineInsetM: meters(0.0015),
  dualOuterZOffsetM: meters(0.00008),
  dualInnerInsetM: meters(0.0011),
  dualInnerZOffsetM: meters(0.00016),
});

export const FRONT_REVEAL_PRESENCE_POLICY = Object.freeze({
  frontZPresenceEpsilonM: meters(0.000001),
});

export const FRONT_REVEAL_THICKNESS_POLICY = Object.freeze({
  slidingFrontThicknessM: SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM,
  hingedFrontThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  drawerFrontThicknessM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
});

export const FRONT_REVEAL_FRAME_POLICY = Object.freeze({
  zNudgeM: FRONT_REVEAL_GEOMETRY_POLICY.zNudgeM,
  localLineInsetM: FRONT_REVEAL_GEOMETRY_POLICY.localLineInsetM,
  dualOuterZOffsetM: FRONT_REVEAL_GEOMETRY_POLICY.dualOuterZOffsetM,
  dualInnerInsetM: FRONT_REVEAL_GEOMETRY_POLICY.dualInnerInsetM,
  dualInnerZOffsetM: FRONT_REVEAL_GEOMETRY_POLICY.dualInnerZOffsetM,
  frontZPresenceEpsilonM: FRONT_REVEAL_PRESENCE_POLICY.frontZPresenceEpsilonM,
  slidingFrontThicknessM: FRONT_REVEAL_THICKNESS_POLICY.slidingFrontThicknessM,
  hingedFrontThicknessM: FRONT_REVEAL_THICKNESS_POLICY.hingedFrontThicknessM,
  drawerFrontThicknessM: FRONT_REVEAL_THICKNESS_POLICY.drawerFrontThicknessM,
});
