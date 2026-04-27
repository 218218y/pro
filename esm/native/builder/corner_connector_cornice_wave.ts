import type {
  CornerConnectorCorniceCtx,
  CornerConnectorCorniceLocals,
} from './corner_connector_cornice_shared.js';
import { hasCorniceExtrusionSupport } from './corner_connector_cornice_shared.js';

export function applyCornerConnectorWaveCornice(args: {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
}): void {
  const { ctx, locals } = args;
  const { THREE, woodThick, startY, wingH, bodyMat, addOutlines, getCornerMat, __sketchMode } = ctx;
  const { pts, cornerGroup, interiorX, interiorZ } = locals;

  // WAVE fascia on the visible front diagonal only:
  // - bottom sits on the roof plane
  // - inner face flush to the diagonal cabinet front
  // - only the TOP edge is wavy (peaks at ends + center)
  const topY = startY + wingH;
  const epsY = 0.0006;
  const yPlace = topY + epsY;

  const frameT = Math.max(0.01, Math.min(0.028, woodThick || 0.018));
  const maxH = 0.095;
  const cycles = 2;

  // Visible diagonal edge (doors face): pts[2] -> pts[3]
  const a = pts[2];
  const b = pts[3];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const segLen = Math.sqrt(dx * dx + dz * dz);
  if (Number.isFinite(segLen) && segLen > 0.02) {
    const ang = Math.atan2(dz, dx);
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;

    const amp = Math.min(Math.max(segLen * 0.03, 0.03), 0.06);
    const halfL = segLen / 2;

    // Sampling resolution: ~2cm, clamped.
    const samples = Math.max(24, Math.min(180, Math.round(segLen / 0.02)));

    if (hasCorniceExtrusionSupport(THREE)) {
      const shape = new THREE.Shape();
      shape.moveTo(-halfL, 0);
      shape.lineTo(halfL, 0);

      // Trace the top edge back to the left with a smooth cosine wave.
      for (let i = samples; i >= 0; i--) {
        const u = i / samples; // 0..1
        const xPos = -halfL + u * segLen;
        const theta = 2 * Math.PI * cycles * u;
        const dip = (amp * (1 - Math.cos(theta))) / 2; // 0 at peaks, amp at trough
        const yTop = maxH - dip;
        shape.lineTo(xPos, yTop);
      }

      shape.lineTo(-halfL, 0);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: frameT, bevelEnabled: false, steps: 1 });
      if (typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals();

      const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
      const corniceMat = getCornerMat('corner_cornice_front', baseCorniceMat);
      const m = new THREE.Mesh(geo, corniceMat);

      // Align EXACTLY like the pentagon doors mount:
      // - local +X along the diagonal
      // - local Z is the diagonal normal (sign decided below)
      // NOTE: we avoid setRotationFromMatrix with a possibly left-handed basis
      // (can collapse to a wrong yaw on some diagonals).
      m.rotation.y = -ang;

      // Decide which side is outside (toward the room) using the known interior point.
      let outwardZSign: 1 | -1 = 1;
      const plusZVec = new THREE.Vector3(0, 0, 1);
      if (typeof plusZVec.applyEuler === 'function') plusZVec.applyEuler(m.rotation);
      if (typeof plusZVec.normalize === 'function') plusZVec.normalize();
      const insideV = new THREE.Vector3(interiorX - midX, 0, interiorZ - midZ);
      if (
        typeof insideV.lengthSq === 'function' &&
        insideV.lengthSq() > 1e-6 &&
        typeof insideV.normalize === 'function'
      )
        insideV.normalize();

      const n1 = new THREE.Vector3(-dz / segLen, 0, dx / segLen);
      const n2 = new THREE.Vector3(dz / segLen, 0, -dx / segLen);
      const d1 = typeof n1.dot === 'function' ? n1.dot(insideV) : 0;
      const d2 = typeof n2.dot === 'function' ? n2.dot(insideV) : 0;
      const outwardN = d1 <= d2 ? n1 : n2;
      if (typeof outwardN.normalize === 'function') outwardN.normalize();
      outwardZSign = typeof plusZVec.dot === 'function' && plusZVec.dot(outwardN) >= 0 ? 1 : -1;

      // Thickness must go INSIDE the cabinet (not outward):
      // - if mount-local +Z is outward => shift geometry to z in [-frameT, 0]
      // - if mount-local +Z is inward  => keep geometry at z in [0, frameT]
      const zShift = outwardZSign === 1 ? -frameT : 0;

      // Tiny inward inset to avoid z-fighting with the diagonal face.
      const zInset = 0.0004;
      const zInsetSigned = (outwardZSign === 1 ? -1 : 1) * zInset;

      m.position.set(midX, yPlace, midZ);
      // Apply local-Z shift in PARENT coordinates (diagonal normal), not on world Z.
      const zLocal = zShift + zInsetSigned;
      m.position.x += plusZVec.x * zLocal;
      m.position.z += plusZVec.z * zLocal;

      m.userData = { partId: 'corner_cornice_front' };
      if (!__sketchMode) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      addOutlines(m);
      cornerGroup.add(m);
    }
  }
}
