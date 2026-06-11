import {
  addVisualsContentsOutlines,
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  getRandomClothColor,
  getVisualsContentsBuildUI,
  resolveShowContents,
  seededRandom,
  type AppAwareAddHangingClothesFn,
} from './visuals_contents_shared.js';

export const addHangingClothes: AppAwareAddHangingClothesFn = (
  App,
  rodX,
  rodY,
  rodZ,
  width,
  parentGroup,
  maxHeight,
  isRestrictedDepth = false,
  showContentsOverride,
  doorStyleOverride
) => {
  App = ensureVisualsContentsApp(App);
  const THREE = ensureVisualsContentsTHREE(App);
  const addOutlines = (mesh: unknown) => addVisualsContentsOutlines(mesh, App);
  if (maxHeight < 0.5) return;

  const buildUI = getVisualsContentsBuildUI(App);
  if (!resolveShowContents(buildUI, showContentsOverride)) return;

  const seedVal = Math.floor(rodX * 1000 + rodY * 1000 + rodZ * 1000 + width * 1000);
  seededRandom.setSeed(Math.abs(seedVal) + 1);

  const count = Math.floor(width / 0.04);
  const currentStyle =
    typeof doorStyleOverride !== 'undefined' && doorStyleOverride !== null
      ? String(doorStyleOverride)
      : buildUI && buildUI.doorStyle != null
        ? String(buildUI.doorStyle)
        : '';

  let baseClothDepth = 0.45;
  if (currentStyle === 'profile' || currentStyle === 'tom') baseClothDepth = 0.38;
  if (typeof isRestrictedDepth === 'number' && Number.isFinite(isRestrictedDepth) && isRestrictedDepth > 0) {
    baseClothDepth = Math.min(baseClothDepth, Math.max(0.12, isRestrictedDepth));
  } else if (isRestrictedDepth) {
    baseClothDepth = Math.min(baseClothDepth, 0.3);
  }

  for (let i = 0; i < count; i++) {
    const xPos = rodX - width / 2 + i * 0.04 + 0.02;

    const hangerGeo = new THREE.TorusGeometry(0.015, 0.002, 4, 12, Math.PI);
    const hanger = new THREE.Mesh(
      hangerGeo,
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.2 })
    );
    hanger.position.set(xPos, rodY + 0.01, rodZ);
    parentGroup.add(hanger);

    const isCoat = seededRandom.random() > 0.7;
    let clothHeight = isCoat ? 1.1 : 0.7;

    if (clothHeight > maxHeight - 0.05) clothHeight = maxHeight - 0.05;
    if (clothHeight <= 0.1) continue;

    const clothWidth = 0.03;
    const clothGeo = new THREE.BoxGeometry(clothWidth, clothHeight, baseClothDepth);
    const clothMat = new THREE.MeshStandardMaterial({
      color: getRandomClothColor(),
      roughness: 0.9,
      metalness: 0.0,
    });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(xPos, rodY - clothHeight / 2 - 0.02, rodZ);
    cloth.rotation.y = (seededRandom.random() - 0.5) * 0.15;
    addOutlines(cloth);
    parentGroup.add(cloth);
  }
};
