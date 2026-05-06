import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  addVisualsContentsOutlines,
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  resolveShowHanger,
  type AppAwareAddRealisticHangerFn,
} from './visuals_contents_shared.js';

export const addRealisticHanger: AppAwareAddRealisticHangerFn = (
  App,
  rodX,
  rodY,
  rodZ,
  parentGroup,
  moduleWidth,
  enabledOverride
) => {
  App = ensureVisualsContentsApp(App);
  const THREE = ensureVisualsContentsTHREE(App);
  const addOutlines = (mesh: unknown) => addVisualsContentsOutlines(mesh, App);

  if (enabledOverride === false) return;
  if (enabledOverride !== true && !resolveShowHanger(App)) return;

  const dims = CONTENT_VISUAL_DIMENSIONS.hanger;
  const hangerGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xeaddcf, roughness: 0.7, metalness: 0.1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.9 });

  const hookGeo = new THREE.TorusGeometry(
    dims.hookRadiusM,
    dims.hookTubeRadiusM,
    dims.hookRadialSegments,
    dims.hookTubularSegments,
    Math.PI * dims.hookArcMultiplier
  );
  const hook = new THREE.Mesh(hookGeo, metalMat);
  hook.rotation.y = Math.PI;
  hook.position.set(0, dims.hookYOffsetM, 0);
  hangerGroup.add(hook);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(dims.stemRadiusM, dims.stemRadiusM, dims.stemHeightM, 8),
    metalMat
  );
  stem.position.set(0, dims.stemYOffsetM, 0);
  hangerGroup.add(stem);

  const hangerShape = new THREE.Shape();
  const width = dims.halfWidthM;
  const shoulderHeight = dims.shoulderHeightM;
  const centerHeight = dims.centerHeightM;
  const bottomNeckY = dims.bottomNeckYM;

  hangerShape.moveTo(0, centerHeight);
  hangerShape.quadraticCurveTo(width / 2, centerHeight + dims.shoulderCurveLiftM, width, -shoulderHeight);
  hangerShape.lineTo(width, -shoulderHeight - dims.shoulderDropM);
  hangerShape.quadraticCurveTo(width / 2, -shoulderHeight + dims.shoulderCurveLiftM, 0, bottomNeckY);
  hangerShape.quadraticCurveTo(
    -width / 2,
    -shoulderHeight + dims.shoulderCurveLiftM,
    -width,
    -shoulderHeight - dims.shoulderDropM
  );
  hangerShape.lineTo(-width, -shoulderHeight);
  hangerShape.quadraticCurveTo(-width / 2, centerHeight + dims.shoulderCurveLiftM, 0, centerHeight);

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hangerShape, {
      steps: 2,
      depth: dims.bodyDepthM,
      bevelEnabled: true,
      bevelThickness: dims.bevelThicknessM,
      bevelSize: dims.bevelSizeM,
      bevelSegments: 2,
    }),
    woodMat
  );
  body.position.set(0, 0, -dims.bodyBackOffsetM);
  addOutlines(body);
  hangerGroup.add(body);

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(
      dims.barRadiusM,
      dims.barRadiusM,
      width * dims.barLengthHalfWidthMultiplier,
      8
    ),
    woodMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -shoulderHeight - dims.barYOffsetM, 0);
  hangerGroup.add(bar);

  const totalHangerWidth = width * 2;
  if (typeof moduleWidth === 'number') {
    const safeWidth = moduleWidth - dims.moduleWidthClearanceM;
    if (safeWidth < totalHangerWidth) {
      const scaleFactor = safeWidth / totalHangerWidth;
      hangerGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  hangerGroup.position.set(rodX, rodY - dims.rodYOffsetM, rodZ);
  hangerGroup.rotation.y = Math.PI / dims.rotationYDivisor;
  parentGroup.add(hangerGroup);
};
