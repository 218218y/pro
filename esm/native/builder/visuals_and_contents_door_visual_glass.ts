import { __asBufferAttribute } from './visuals_and_contents_shared.js';
import { appendProfileDoorFrame } from './visuals_and_contents_door_visual_profile_frame.js';

import type { GlassDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

export function createGlassDoorVisual(args: GlassDoorVisualArgs) {
  const {
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    isSketch,
    w,
    h,
    thickness,
    mat,
    curtainType,
    zSign,
    forceCurtainFix,
  } = args;

  const layout = appendProfileDoorFrame({
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    isSketch,
    w,
    h,
    thickness,
    mat,
    zSign,
  });

  const glassW = layout.centerW;
  const glassH = layout.centerH;
  const glassDepth = 0.005;
  const glassFaceZ = layout.centerFaceZ;
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    roughness: 0.08,
    metalness: 0.0,
  });
  glassMat.depthWrite = false;
  glassMat.side = THREE.DoubleSide;
  try {
    glassMat.premultipliedAlpha = true;
  } catch {
    // ignore
  }

  const glassPane = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, glassDepth), glassMat);
  glassPane.userData = glassPane.userData || {};
  glassPane.userData.__keepMaterial = true;
  glassPane.renderOrder = 2;
  glassPane.position.set(0, 0, glassFaceZ - (glassDepth / 2) * zSign);
  tagDoorVisualPart(glassPane, 'door_glass_center_panel');
  visualGroup.add(glassPane);

  if (curtainType && curtainType !== 'none') {
    let curtainColor = 0xffffff;
    if (curtainType === 'pink') curtainColor = 0xfbcfe8;
    if (curtainType === 'purple') curtainColor = 0xe9d5ff;
    if (curtainType === 'white') curtainColor = 0xffffff;

    const curtainMat = new THREE.MeshStandardMaterial({
      color: curtainColor,
      roughness: 0.45,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
      transparent: true,
      opacity: 0.72,
    });
    curtainMat.depthWrite = false;
    try {
      curtainMat.premultipliedAlpha = true;
    } catch {
      // ignore
    }
    if (forceCurtainFix) {
      try {
        curtainMat.emissive = new THREE.Color(curtainColor);
        curtainMat.emissiveIntensity = 0.12;
      } catch {
        // ignore
      }
    }

    const curtainGeo = new THREE.PlaneGeometry(glassW, glassH, 256, 1);
    const posAttribute =
      curtainGeo.attributes && curtainGeo.attributes.position
        ? __asBufferAttribute(curtainGeo.attributes.position)
        : null;
    if (posAttribute) {
      for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const waveZ = 0.008 * Math.sin(x * 120);
        posAttribute.setZ(i, waveZ);
      }
    }
    curtainGeo.computeVertexNormals?.();
    const curtainMesh = new THREE.Mesh(curtainGeo, curtainMat);
    curtainMesh.userData = curtainMesh.userData || {};
    curtainMesh.userData.__keepMaterial = true;
    curtainMesh.renderOrder = 1;
    const curtainGap = forceCurtainFix ? 0.012 : 0.015;
    const curtainZ = glassPane.position.z - (glassDepth / 2 + curtainGap) * zSign;
    curtainMesh.position.set(0, 0, curtainZ);
    tagDoorVisualPart(curtainMesh, 'door_glass_curtain');
    visualGroup.add(curtainMesh);
  }

  return visualGroup;
}
