import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  const dims = CONTENT_VISUAL_DIMENSIONS.hangingClothes;
  if (maxHeight < dims.minAvailableHeightM) return;

  const buildUI = getVisualsContentsBuildUI(App);
  if (!resolveShowContents(buildUI, showContentsOverride)) return;

  const seedVal = Math.floor(rodX * 1000 + rodY * 1000 + rodZ * 1000 + width * 1000);
  seededRandom.setSeed(Math.abs(seedVal) + 1);

  const count = Math.floor(width / dims.spacingM);
  const currentStyle =
    typeof doorStyleOverride !== 'undefined' && doorStyleOverride !== null
      ? String(doorStyleOverride)
      : buildUI && buildUI.doorStyle != null
        ? String(buildUI.doorStyle)
        : '';

  let baseClothDepth: number = dims.defaultDepthM;
  if (currentStyle === 'profile' || currentStyle === 'tom') baseClothDepth = dims.framedDoorDepthM;
  if (typeof isRestrictedDepth === 'number' && Number.isFinite(isRestrictedDepth) && isRestrictedDepth > 0) {
    baseClothDepth = Math.min(baseClothDepth, Math.max(dims.restrictedDepthMinM, isRestrictedDepth));
  } else if (isRestrictedDepth) {
    baseClothDepth = Math.min(baseClothDepth, dims.restrictedDepthDefaultM);
  }

  for (let i = 0; i < count; i++) {
    const xPos = rodX - width / 2 + i * dims.spacingM + dims.xOffsetM;

    const hangerGeo = new THREE.TorusGeometry(
      dims.hangerRadiusM,
      dims.hangerTubeRadiusM,
      dims.hangerRadialSegments,
      dims.hangerTubularSegments,
      Math.PI
    );
    const hanger = new THREE.Mesh(
      hangerGeo,
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.2 })
    );
    hanger.position.set(xPos, rodY + dims.hangerYOffsetM, rodZ);
    parentGroup.add(hanger);

    const isCoat = seededRandom.random() > dims.coatProbabilityThreshold;
    let clothHeight = isCoat ? dims.coatHeightM : dims.shirtHeightM;

    if (clothHeight > maxHeight - dims.bottomClearanceM) clothHeight = maxHeight - dims.bottomClearanceM;
    if (clothHeight <= dims.minRenderableHeightM) continue;

    const clothWidth = dims.clothWidthM;
    const clothGeo = new THREE.BoxGeometry(clothWidth, clothHeight, baseClothDepth);
    const clothMat = new THREE.MeshStandardMaterial({
      color: getRandomClothColor(),
      roughness: 0.9,
      metalness: 0.0,
    });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(xPos, rodY - clothHeight / 2 - dims.clothYOffsetM, rodZ);
    cloth.rotation.y = (seededRandom.random() - 0.5) * dims.clothRotationYRangeRad;
    addOutlines(cloth);
    parentGroup.add(cloth);
  }
};
