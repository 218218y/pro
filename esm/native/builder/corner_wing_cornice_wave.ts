import type { CorniceCtxLike, CorniceLocalsLike } from './corner_wing_cornice_contracts.js';
import { getThreeCornice } from './corner_wing_cornice_contracts.js';

export function applyCornerWingWaveCornice(args: { ctx: CorniceCtxLike; locals: CorniceLocalsLike }): void {
  const { ctx, locals } = args;
  const {
    THREE,
    woodThick,
    startY,
    wingH,
    wingD,
    wingW,
    cornerConnectorEnabled,
    getCornerMat,
    bodyMat,
    addOutlines,
    __sketchMode,
    wingGroup,
  } = ctx;
  const { __wingBackPanelThick, __wingBackPanelCenterZ } = locals;
  // WAVE frame (same intent as core_pure.ts wave_frame):
  // - Front: vertical strip on the roof front edge, TOP is a wave cut (peaks at ends + center).
  // - Sides: vertical strips, straight top, run from front to back (NO back strip).
  // - No top cover (open from above).
  const topY = startY + wingH;
  const epsY = 0.0006; // tiny lift to avoid z-fighting with the roof boards
  const yPlace = topY + epsY;

  // Wing local Z is slightly shifted in this module (front is near z≈0.005).
  const zCenter = 0.005 - wingD / 2;
  const frontPlaneZ = zCenter + wingD / 2; // ≈ 0.005
  const backPlaneZ = zCenter - wingD / 2; // ≈ 0.005 - wingD
  // The masonite back panel sits a bit IN FRONT of backPlaneZ.
  // Trim the cornice depth so it doesn't extend past the masonite from the rear view.
  const backPanelOutsideZ = __wingBackPanelCenterZ - __wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);

  // Frame thickness (meters): use panel thickness, clamped.
  const frameT = Math.max(0.01, Math.min(0.028, woodThick || 0.018));

  // Heights (meters)
  const maxH = 0.095; // 9.5cm peak height
  const waveAmp = Math.min(Math.max(wingW * 0.03, 0.03), 0.06); // 3–6cm dip
  const waveCycles = 2; // peaks at ends + center

  // Material: allow both whole-cornice coloring ('corner_cornice') and per-part coloring
  // ('corner_cornice_front' / 'corner_cornice_side_left' / 'corner_cornice_side_right').
  const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
  const corniceMatFor = (pid: string) => getCornerMat(pid, baseCorniceMat);
  const threeCornice = getThreeCornice(THREE);

  // FRONT wavy strip (extrusion ends at the front plane; thickness goes inward)
  if (threeCornice) {
    // Avoid overlap with side strips so "paint by part" can treat each piece separately.
    // When the corner connector exists, the attach-side strip is omitted.
    const hasLeftSide = !cornerConnectorEnabled;
    const leftInset = hasLeftSide ? frameT : 0;
    const rightInset = frameT; // right outer side always exists

    const w = Math.max(0.02, wingW - leftInset - rightInset);
    const halfW = w / 2;

    // Sampling resolution: ~2cm, clamped.
    const samples = Math.max(24, Math.min(180, Math.round(w / 0.02)));

    const shape = new threeCornice.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);

    // Trace the top edge back to the left with a smooth cosine wave.
    for (let i = samples; i >= 0; i--) {
      const u = i / samples; // 0..1
      const xPos = -halfW + u * w;
      const theta = 2 * Math.PI * waveCycles * u;
      const dip = (waveAmp * (1 - Math.cos(theta))) / 2; // 0 at peaks, amp at trough
      const yTop = maxH - dip;
      shape.lineTo(xPos, yTop);
    }

    shape.lineTo(-halfW, 0);

    const geo = new threeCornice.ExtrudeGeometry(shape, { depth: frameT, bevelEnabled: false, steps: 1 });
    geo.computeVertexNormals();

    const mesh = new threeCornice.Mesh(geo, corniceMatFor('corner_cornice_front'));
    const xCenter = leftInset + w / 2;
    mesh.position.set(xCenter, yPlace, frontPlaneZ - frameT);
    mesh.userData = { partId: 'corner_cornice_front' };
    if (!__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    wingGroup.add(mesh);
  }

  // SIDE strips (straight top), run full depth, no back strip.
  const sideH = maxH;
  const sideStartZ = backTrimZ;
  const sideEndZ = frontPlaneZ;
  const sideDepth = Math.max(0.001, sideEndZ - sideStartZ);
  const sideZ = (sideStartZ + sideEndZ) / 2;
  const sideY = yPlace + sideH / 2;

  const addSide = (xCenter: number, pid: string) => {
    if (!threeCornice) return;
    const geo = new threeCornice.BoxGeometry(frameT, sideH, sideDepth);
    const mesh = new threeCornice.Mesh(geo, corniceMatFor(pid));
    mesh.position.set(xCenter, sideY, sideZ);
    mesh.userData = { partId: pid };
    if (!__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    wingGroup.add(mesh);
  };

  // Omit the "attach side" piece when the corner connector (pentagon) exists.
  if (!cornerConnectorEnabled) addSide(frameT / 2, 'corner_cornice_side_left');
  addSide(wingW - frameT / 2, 'corner_cornice_side_right');
}
