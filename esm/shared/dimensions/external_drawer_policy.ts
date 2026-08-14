import { HINGED_DOOR_MOUNT_POLICY } from './door_system_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';
import { STACK_SPLIT_POLICY } from './stack_split_policy.js';

export type ExternalDrawerGeometry = {
  zClosed: number;
  zOpen: number;
  visualW: number;
  visualT: number;
  visualH: number;
  boxW: number;
  boxH: number;
  boxD: number;
  boxOffsetZ: number;
  connectW: number;
  connectH: number;
  connectD: number;
  connectZ: number;
};

function finiteOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export const EXTERNAL_DRAWER_SIZE_POLICY = Object.freeze({
  shoeHeightM: meters(0.2),
  regularHeightM: meters(0.22),
});

export const EXTERNAL_DRAWER_MOTION_POLICY = Object.freeze({
  openOffsetZM: meters(0.35),
});

export const EXTERNAL_DRAWER_FRONT_RENDER_POLICY = Object.freeze({
  frontOffsetZM: meters(0.01),
  doorTopGapM: STACK_SPLIT_POLICY.seam.gapM,
  visualWidthClearanceM: meters(0.004),
  visualThicknessM: meters(0.02),
  visualHeightClearanceM: STACK_SPLIT_POLICY.seam.gapM,
});

export const EXTERNAL_DRAWER_BOX_POLICY = Object.freeze({
  boxWidthClearanceM: meters(0.044),
  boxHeightClearanceM: meters(0.04),
  boxDepthBackClearanceM: meters(0.1),
  boxOffsetZM: meters(0.005),
});

export const EXTERNAL_DRAWER_CONNECTOR_POLICY = Object.freeze({
  connectorDepthM: meters(0.03),
  connectorFrontZM: meters(-0.01),
  connectorBackInsetM: meters(0.003),
  connectorWidthClearanceM: meters(0.09),
  connectorHeightClearanceM: meters(0.06),
});

export const EXTERNAL_DRAWER_SEPARATOR_POLICY = Object.freeze({
  separatorBoardWidthClearanceM: meters(0.025),
});

export const EXTERNAL_DRAWER_CONTENTS_POLICY = Object.freeze({
  contentsBottomInsetM: meters(0.015),
  contentsWidthClearanceM: meters(0.05),
  contentsHeightClearanceM: meters(0.03),
});

export const EXTERNAL_DRAWER_POLICY = Object.freeze({
  shoeHeightM: EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM,
  regularHeightM: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM,
  frontOffsetZM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM,
  doorTopGapM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM,
  openOffsetZM: EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
  visualWidthClearanceM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
  visualThicknessM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
  visualHeightClearanceM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM,
  boxWidthClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
  boxHeightClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
  boxDepthBackClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM,
  boxOffsetZM: EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
  connectorDepthM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM,
  connectorFrontZM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorFrontZM,
  connectorBackInsetM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorBackInsetM,
  connectorWidthClearanceM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorWidthClearanceM,
  connectorHeightClearanceM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorHeightClearanceM,
  separatorBoardWidthClearanceM: EXTERNAL_DRAWER_SEPARATOR_POLICY.separatorBoardWidthClearanceM,
  contentsBottomInsetM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM,
  contentsWidthClearanceM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM,
  contentsHeightClearanceM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM,
});

export function resolveExternalDrawerGeometry(args?: {
  externalWidthM?: unknown;
  depthM?: unknown;
  woodThicknessM?: unknown;
  frontZM?: unknown;
  drawerHeightM?: unknown;
  doorMountMode?: unknown;
}): ExternalDrawerGeometry {
  const externalWidthM = finiteOr(args?.externalWidthM, 0);
  const depthM = finiteOr(args?.depthM, 0);
  const woodThicknessM = finiteOr(args?.woodThicknessM, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  const frontZM = finiteOr(args?.frontZM, depthM / 2);
  const drawerHeightM = finiteOr(args?.drawerHeightM, EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM);
  const connectD = EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM;
  const visualT = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
  const isInsetMount = args?.doorMountMode === 'inset';
  const insetRevealM = isInsetMount
    ? Math.min(HINGED_DOOR_MOUNT_POLICY.insetRevealM, Math.max(0, woodThicknessM / 3))
    : 0;
  const zClosed = isInsetMount
    ? frontZM - visualT / 2 - insetRevealM
    : frontZM + EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM;
  const zOpen = isInsetMount
    ? zClosed + EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM
    : frontZM + EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM;

  return {
    zClosed,
    zOpen,
    visualW: externalWidthM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
    visualT,
    visualH: drawerHeightM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM,
    boxW: externalWidthM - EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
    boxH: drawerHeightM - EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
    boxD: Math.max(woodThicknessM, depthM - EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM),
    boxOffsetZ: -depthM / 2 + EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
    connectW: externalWidthM - EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorWidthClearanceM,
    connectH: drawerHeightM - EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorHeightClearanceM,
    connectD,
    connectZ:
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorFrontZM -
      connectD / 2 -
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorBackInsetM,
  };
}
