import { CARCASS_BASE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getCfg } from './store_access.js';
import { getBaseLegColorHex, resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';

import type { ShapeInputLike, CornerConnectorSetup } from './corner_connector_emit_shared.js';
import type { CornerConnectorShellMetrics } from './corner_connector_emit_shell_metrics.js';

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;
const BASE_LEG_LAYOUT_DIMENSIONS = CARCASS_BASE_DIMENSIONS.legs;

export function createCornerConnectorPlinthShape(
  setup: CornerConnectorSetup,
  toeInset: number
): ShapeInputLike {
  const {
    THREE,
    mx,
    L,
    Dmain,
    ctx: { wingD },
  } = setup;

  const p2x = mx(-wingD);
  const p2z = L;
  const p3x = mx(-L);
  const p3z = Dmain;
  const dvx = p3x - p2x;
  const dvz = p3z - p2z;
  const diagLen = Math.sqrt(dvx * dvx + dvz * dvz);
  const maxToe = Math.max(0, Math.min(toeInset, diagLen * PLINTH_DIMENSIONS.connectorMaxToeRatio));
  const toeEndTrim = Math.max(0, Math.min(maxToe, PLINTH_DIMENSIONS.connectorToeEndTrimMaxM));
  const p2TrimX = (() => {
    if (toeEndTrim <= 1e-6) return p2x;
    const ex = p2x;
    const ez = p2z - L;
    const len = Math.sqrt(ex * ex + ez * ez);
    if (!Number.isFinite(len) || len <= 1e-6) return p2x;
    return p2x - (ex / len) * toeEndTrim;
  })();
  const p3TrimZ = (() => {
    if (toeEndTrim <= 1e-6) return p3z;
    const ex = p3x - mx(-L);
    const ez = p3z;
    const len = Math.sqrt(ex * ex + ez * ez);
    if (!Number.isFinite(len) || len <= 1e-6) return p3z;
    return p3z - (ez / len) * toeEndTrim;
  })();
  const plinthWallInsetX = PLINTH_DIMENSIONS.connectorWallInsetM;
  const plinthWallInsetZ = PLINTH_DIMENSIONS.connectorWallInsetM;

  const shape = new THREE.Shape();
  shape.moveTo(mx(-plinthWallInsetX), plinthWallInsetZ);
  shape.lineTo(mx(-plinthWallInsetX), L);
  shape.lineTo(p2TrimX, p2z);
  if (
    maxToe > PLINTH_DIMENSIONS.connectorTinyEpsilonM &&
    Number.isFinite(diagLen) &&
    diagLen > PLINTH_DIMENSIONS.segmentWidthEpsilonM
  ) {
    const nx1 = -dvz / diagLen;
    const nz1 = dvx / diagLen;
    const nx2 = dvz / diagLen;
    const nz2 = -dvx / diagLen;
    const midx = (p2x + p3x) / 2;
    const midz = (p2z + p3z) / 2;
    const dot1 = nx1 * -midx + nz1 * -midz;
    const dot2 = nx2 * -midx + nz2 * -midz;
    const nx = dot1 >= dot2 ? nx1 : nx2;
    const nz = dot1 >= dot2 ? nz1 : nz2;
    shape.lineTo(p2x + nx * maxToe, p2z + nz * maxToe);
    shape.lineTo(p3x + nx * maxToe, p3z + nz * maxToe);
  }
  shape.lineTo(p3x, p3TrimZ);
  shape.lineTo(mx(-L), plinthWallInsetZ);
  shape.lineTo(mx(-plinthWallInsetX), plinthWallInsetZ);
  return shape;
}

function appendCornerConnectorBase(setup: CornerConnectorSetup, metrics: CornerConnectorShellMetrics): void {
  const {
    THREE,
    mx,
    L,
    Dmain,
    plateShape,
    cornerGroup,
    ctx: {
      App,
      woodThick,
      startY,
      wingH,
      stackOffsetY,
      baseType,
      baseLegStyle,
      baseLegColor,
      baseLegWidthCm,
      baseH,
      bodyMat,
      __individualColors,
      getCornerMat,
      addOutlines,
      getMaterial,
    },
  } = setup;

  if (baseType === 'plinth' && baseH > 0.001) {
    let plinthMat = bodyMat;
    if (getCfg(App).isMultiColorMode && __individualColors['corner_pent_plinth']) {
      plinthMat = getCornerMat('corner_pent_plinth', bodyMat);
    }
    const plinth = new THREE.Mesh(
      new THREE.ExtrudeGeometry(
        createCornerConnectorPlinthShape(setup, PLINTH_DIMENSIONS.connectorShapeInsetM),
        {
          depth: baseH,
          bevelEnabled: false,
        }
      ),
      plinthMat
    );
    plinth.rotation.x = Math.PI / 2;
    plinth.position.y = stackOffsetY + baseH;
    plinth.userData = { partId: 'corner_pent_plinth' };
    addOutlines(plinth);
    cornerGroup.add(plinth);
  } else if (baseType === 'legs' && baseH > 0.001) {
    const legSpec = resolveBaseLegGeometrySpec(baseLegStyle, baseLegWidthCm);
    const legGeo =
      legSpec.shape === 'square'
        ? new THREE.BoxGeometry(legSpec.width, baseH, legSpec.depth)
        : new THREE.CylinderGeometry(legSpec.topRadius, legSpec.bottomRadius, baseH, legSpec.radialSegments);
    const legMat = getMaterial(getBaseLegColorHex(baseLegColor), 'metal');
    const inset = BASE_LEG_LAYOUT_DIMENSIONS.connectorInsetM;
    const legPts = [
      { x: mx(-inset), z: inset },
      { x: mx(-inset), z: Math.max(inset, L - inset) },
      { x: mx(Math.min(-inset, -setup.ctx.wingD + inset)), z: Math.max(inset, L - inset) },
      {
        x: mx(Math.max(-L + inset, -inset - BASE_LEG_LAYOUT_DIMENSIONS.connectorBackInsetM)),
        z: Math.max(inset, Dmain + inset),
      },
      { x: mx(Math.max(-L + inset, -inset - BASE_LEG_LAYOUT_DIMENSIONS.connectorBackInsetM)), z: inset },
    ];
    for (const point of legPts) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(point.x, stackOffsetY + baseH / 2, point.z);
      cornerGroup.add(leg);
    }
  }

  const appendPlate = (partId: string, y: number, shp: ShapeInputLike = setup.shape): void => {
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shp, { depth: woodThick, bevelEnabled: false }),
      getCornerMat(partId, bodyMat)
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y + woodThick;
    mesh.userData = { partId };
    addOutlines(mesh);
    cornerGroup.add(mesh);
  };

  appendPlate('corner_pent_floor', startY, plateShape);
  appendPlate('corner_pent_ceil', startY + wingH - woodThick, plateShape);

  void metrics;
}

export function applyCornerConnectorShellBase(
  setup: CornerConnectorSetup,
  metrics: CornerConnectorShellMetrics
): void {
  appendCornerConnectorBase(setup, metrics);
}
