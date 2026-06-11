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

  const hangerGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xeaddcf, roughness: 0.7, metalness: 0.1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.9 });

  const hookGeo = new THREE.TorusGeometry(0.02, 0.0025, 8, 16, Math.PI * 1.5);
  const hook = new THREE.Mesh(hookGeo, metalMat);
  hook.rotation.y = Math.PI;
  hook.position.set(0, 0.045, 0);
  hangerGroup.add(hook);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.04, 8), metalMat);
  stem.position.set(0, 0.02, 0);
  hangerGroup.add(stem);

  const hangerShape = new THREE.Shape();
  const width = 0.22;
  const shoulderHeight = 0.15;
  const centerHeight = 0.015;
  const bottomNeckY = 0.002;

  hangerShape.moveTo(0, centerHeight);
  hangerShape.quadraticCurveTo(width / 2, centerHeight + 0.01, width, -shoulderHeight);
  hangerShape.lineTo(width, -shoulderHeight - 0.015);
  hangerShape.quadraticCurveTo(width / 2, -shoulderHeight + 0.01, 0, bottomNeckY);
  hangerShape.quadraticCurveTo(-width / 2, -shoulderHeight + 0.01, -width, -shoulderHeight - 0.015);
  hangerShape.lineTo(-width, -shoulderHeight);
  hangerShape.quadraticCurveTo(-width / 2, centerHeight + 0.01, 0, centerHeight);

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hangerShape, {
      steps: 2,
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    }),
    woodMat
  );
  body.position.set(0, 0, -0.006);
  addOutlines(body);
  hangerGroup.add(body);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, width * 1.8, 8), woodMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -shoulderHeight - 0.01, 0);
  hangerGroup.add(bar);

  const totalHangerWidth = width * 2;
  if (typeof moduleWidth === 'number') {
    const safeWidth = moduleWidth - 0.05;
    if (safeWidth < totalHangerWidth) {
      const scaleFactor = safeWidth / totalHangerWidth;
      hangerGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  hangerGroup.position.set(rodX, rodY - 0.055, rodZ);
  hangerGroup.rotation.y = Math.PI / 8;
  parentGroup.add(hangerGroup);
};
