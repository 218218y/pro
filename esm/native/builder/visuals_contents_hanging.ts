import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  addVisualsContentsOutlines,
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  getCachedBoxGeometry,
  getCachedCylinderGeometry,
  getCachedExtrudeGeometry,
  getCachedMeshStandardMaterial,
  getCachedTorusGeometry,
  getRandomClothColor,
  quantizeVisualContentMetric,
  getVisualsContentsBuildUI,
  resolveShowContents,
  seededRandom,
  type AppAwareAddHangingClothesFn,
} from './visuals_contents_shared.js';
import type { Object3DLike } from '../../../types/index.js';

type HangingGarmentVariant = 'shirt' | 'coat' | 'dress';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function adjustHexColor(color: number, amount: number): number {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, value));
  const r = clampChannel(((color >> 16) & 0xff) + amount);
  const g = clampChannel(((color >> 8) & 0xff) + amount);
  const b = clampChannel((color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

function selectGarmentVariant(): HangingGarmentVariant {
  const roll = seededRandom.random();
  if (roll > 0.72) return 'coat';
  if (roll > 0.4) return 'shirt';
  return 'dress';
}

function createGarmentShape(
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>,
  variant: HangingGarmentVariant,
  width: number,
  height: number
) {
  const halfWidth = width / 2;
  const topY = height / 2;
  const bottomY = -height / 2;
  const shape = new THREE.Shape();
  if (variant === 'coat') {
    const shoulderY = topY - height * 0.1;
    const sleeveY = topY - height * 0.34;
    const waistY = bottomY + height * 0.28;
    shape.moveTo(-halfWidth * 0.14, topY);
    shape.lineTo(-halfWidth * 0.36, shoulderY);
    shape.quadraticCurveTo(-halfWidth * 0.92, topY - height * 0.18, -halfWidth * 0.86, sleeveY);
    shape.lineTo(-halfWidth * 0.56, waistY);
    shape.quadraticCurveTo(-halfWidth * 0.62, bottomY + height * 0.02, -halfWidth * 0.48, bottomY);
    shape.lineTo(halfWidth * 0.48, bottomY);
    shape.quadraticCurveTo(halfWidth * 0.62, bottomY + height * 0.02, halfWidth * 0.56, waistY);
    shape.lineTo(halfWidth * 0.86, sleeveY);
    shape.quadraticCurveTo(halfWidth * 0.92, topY - height * 0.18, halfWidth * 0.36, shoulderY);
    shape.lineTo(halfWidth * 0.14, topY);
    shape.quadraticCurveTo(0, topY - height * 0.06, -halfWidth * 0.14, topY);
    return shape;
  }

  if (variant === 'dress') {
    const shoulderY = topY - height * 0.08;
    const sleeveY = topY - height * 0.24;
    const flareY = bottomY + height * 0.26;
    shape.moveTo(-halfWidth * 0.12, topY);
    shape.lineTo(-halfWidth * 0.24, shoulderY);
    shape.quadraticCurveTo(-halfWidth * 0.7, topY - height * 0.16, -halfWidth * 0.58, sleeveY);
    shape.lineTo(-halfWidth * 0.42, flareY);
    shape.quadraticCurveTo(-halfWidth * 0.52, bottomY + height * 0.08, -halfWidth * 0.6, bottomY);
    shape.lineTo(halfWidth * 0.6, bottomY);
    shape.quadraticCurveTo(halfWidth * 0.52, bottomY + height * 0.08, halfWidth * 0.42, flareY);
    shape.lineTo(halfWidth * 0.58, sleeveY);
    shape.quadraticCurveTo(halfWidth * 0.7, topY - height * 0.16, halfWidth * 0.24, shoulderY);
    shape.lineTo(halfWidth * 0.12, topY);
    shape.quadraticCurveTo(0, topY - height * 0.05, -halfWidth * 0.12, topY);
    return shape;
  }

  const shoulderY = topY - height * 0.09;
  const sleeveY = topY - height * 0.3;
  const underArmY = topY - height * 0.44;
  shape.moveTo(-halfWidth * 0.12, topY);
  shape.lineTo(-halfWidth * 0.3, shoulderY);
  shape.quadraticCurveTo(-halfWidth * 0.76, topY - height * 0.16, -halfWidth * 0.7, sleeveY);
  shape.lineTo(-halfWidth * 0.5, underArmY);
  shape.quadraticCurveTo(-halfWidth * 0.32, bottomY + height * 0.16, -halfWidth * 0.34, bottomY);
  shape.lineTo(halfWidth * 0.34, bottomY);
  shape.quadraticCurveTo(halfWidth * 0.32, bottomY + height * 0.16, halfWidth * 0.5, underArmY);
  shape.lineTo(halfWidth * 0.7, sleeveY);
  shape.quadraticCurveTo(halfWidth * 0.76, topY - height * 0.16, halfWidth * 0.3, shoulderY);
  shape.lineTo(halfWidth * 0.12, topY);
  shape.quadraticCurveTo(0, topY - height * 0.05, -halfWidth * 0.12, topY);
  return shape;
}

function addGarmentDetails(args: {
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>;
  garment: Object3DLike;
  variant: HangingGarmentVariant;
  color: number;
  width: number;
  height: number;
  depth: number;
}): void {
  const { THREE, garment, variant, color, width, height, depth } = args;
  const accentColor = adjustHexColor(color, 18);
  const shadowColor = adjustHexColor(color, -18);
  const accentMat = getCachedMeshStandardMaterial(THREE, `hanging-detail-accent:${accentColor}`, {
    color: accentColor,
    roughness: 0.92,
    metalness: 0.0,
  });
  const shadowMat = getCachedMeshStandardMaterial(THREE, `hanging-detail-shadow:${shadowColor}`, {
    color: shadowColor,
    roughness: 0.96,
    metalness: 0.0,
  });

  const placket = new THREE.Mesh(
    getCachedBoxGeometry(
      THREE,
      Math.max(width * 0.12, 0.004),
      Math.max(height * 0.42, 0.04),
      Math.max(depth * 0.08, 0.004)
    ),
    accentMat
  );
  placket.position.set(0, -height * 0.04, depth + Math.max(depth * 0.05, 0.003));
  placket.userData = placket.userData || {};
  placket.userData.__kind = 'hanging_cloth_placket';
  garment.add?.(placket);

  const collar = new THREE.Mesh(
    getCachedBoxGeometry(
      THREE,
      Math.max(width * 0.32, 0.008),
      Math.max(height * 0.06, 0.01),
      Math.max(depth * 0.1, 0.006)
    ),
    shadowMat
  );
  collar.position.set(0, height * 0.42, depth * 0.52);
  collar.userData = collar.userData || {};
  collar.userData.__kind = 'hanging_cloth_collar';
  garment.add?.(collar);

  if (variant === 'coat') {
    const cuffWidth = Math.max(width * 0.16, 0.005);
    const cuffHeight = Math.max(height * 0.08, 0.012);
    for (const side of [-1, 1]) {
      const cuff = new THREE.Mesh(
        getCachedBoxGeometry(THREE, cuffWidth, cuffHeight, Math.max(depth * 0.1, 0.006)),
        accentMat
      );
      cuff.position.set(side * width * 0.3, height * 0.02, depth * 0.48);
      cuff.userData = cuff.userData || {};
      cuff.userData.__kind = 'hanging_cloth_cuff';
      garment.add?.(cuff);
    }
  } else if (variant === 'dress') {
    const belt = new THREE.Mesh(
      getCachedBoxGeometry(
        THREE,
        Math.max(width * 0.78, 0.012),
        Math.max(height * 0.04, 0.009),
        Math.max(depth * 0.08, 0.004)
      ),
      accentMat
    );
    belt.position.set(0, -height * 0.06, depth * 0.52);
    belt.userData = belt.userData || {};
    belt.userData.__kind = 'hanging_cloth_belt';
    garment.add?.(belt);
  } else {
    for (const side of [-1, 1]) {
      const sleeveFold = new THREE.Mesh(
        getCachedBoxGeometry(
          THREE,
          Math.max(width * 0.18, 0.005),
          Math.max(height * 0.09, 0.012),
          Math.max(depth * 0.08, 0.004)
        ),
        shadowMat
      );
      sleeveFold.position.set(side * width * 0.22, height * 0.06, depth * 0.48);
      sleeveFold.userData = sleeveFold.userData || {};
      sleeveFold.userData.__kind = 'hanging_cloth_sleeve_fold';
      garment.add?.(sleeveFold);
    }
  }
}

function createStyledHanger(args: {
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>;
  dims: typeof CONTENT_VISUAL_DIMENSIONS.hangingClothes;
  xPos: number;
  rodY: number;
  rodZ: number;
}) {
  const { THREE, dims, xPos, rodY, rodZ } = args;
  const hook = new THREE.Mesh(
    getCachedTorusGeometry(
      THREE,
      dims.hangerRadiusM,
      dims.hangerTubeRadiusM,
      dims.hangerRadialSegments,
      dims.hangerTubularSegments,
      Math.PI
    ),
    getCachedMeshStandardMaterial(THREE, 'hanging-hanger-metal', {
      color: 0xbdc3c7,
      metalness: 0.82,
      roughness: 0.24,
    })
  );
  hook.position.set(xPos, rodY + dims.hangerYOffsetM, rodZ);
  hook.userData = hook.userData || {};
  hook.userData.__kind = 'hanging_hanger';

  const stem = new THREE.Mesh(
    getCachedCylinderGeometry(
      THREE,
      dims.hangerTubeRadiusM * 1.2,
      dims.hangerTubeRadiusM * 1.2,
      dims.hangerRadiusM * 1.15,
      6
    ),
    getCachedMeshStandardMaterial(THREE, 'hanging-hanger-metal', {
      color: 0xbdc3c7,
      metalness: 0.82,
      roughness: 0.24,
    })
  );
  stem.position.set(0, -dims.hangerRadiusM * 0.58, 0);
  hook.add?.(stem);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      getCachedCylinderGeometry(
        THREE,
        dims.hangerTubeRadiusM * 1.25,
        dims.hangerTubeRadiusM * 1.55,
        dims.spacingM * 0.58,
        6
      ),
      getCachedMeshStandardMaterial(THREE, 'hanging-hanger-wood', {
        color: 0xe3d5c3,
        metalness: 0.08,
        roughness: 0.72,
      })
    );
    shoulder.rotation.z = side * (Math.PI / 3.25);
    shoulder.position.set(side * dims.spacingM * 0.13, -dims.hangerRadiusM * 1.1, 0);
    shoulder.userData = shoulder.userData || {};
    shoulder.userData.__kind = 'hanging_hanger_shoulder';
    hook.add?.(shoulder);
  }

  return hook;
}

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

  const count = Math.max(1, Math.floor(width / dims.spacingM));
  const currentStyle =
    typeof doorStyleOverride !== 'undefined' && doorStyleOverride !== null
      ? String(doorStyleOverride)
      : buildUI && buildUI.doorStyle != null
        ? String(buildUI.doorStyle)
        : '';

  let baseClothDepth: number = dims.defaultDepthM;
  if (currentStyle === 'profile' || currentStyle === 'double_profile') baseClothDepth = dims.framedDoorDepthM;
  if (typeof isRestrictedDepth === 'number' && Number.isFinite(isRestrictedDepth) && isRestrictedDepth > 0) {
    baseClothDepth = Math.min(baseClothDepth, Math.max(dims.restrictedDepthMinM, isRestrictedDepth));
  } else if (isRestrictedDepth) {
    baseClothDepth = Math.min(baseClothDepth, dims.restrictedDepthDefaultM);
  }

  for (let i = 0; i < count; i++) {
    const xPos = rodX - width / 2 + i * dims.spacingM + dims.xOffsetM;
    const hanger = createStyledHanger({ THREE, dims, xPos, rodY, rodZ });
    parentGroup.add(hanger);

    const variant = selectGarmentVariant();
    let clothHeight =
      variant === 'coat'
        ? dims.coatHeightM
        : variant === 'dress'
          ? dims.coatHeightM * 0.92
          : dims.shirtHeightM;
    clothHeight = clamp(
      clothHeight,
      dims.minRenderableHeightM,
      Math.max(dims.minRenderableHeightM, maxHeight - dims.bottomClearanceM)
    );
    if (clothHeight <= dims.minRenderableHeightM) continue;

    const clothWidth = dims.clothWidthM * (0.92 + seededRandom.random() * 0.18);
    const clothColor = getRandomClothColor();
    const bevel = Math.min(0.004, baseClothDepth * 0.05);
    const clothGeo = getCachedExtrudeGeometry(
      THREE,
      `hanging-cloth:${variant}:${quantizeVisualContentMetric(clothWidth)}:${quantizeVisualContentMetric(clothHeight)}:${quantizeVisualContentMetric(baseClothDepth)}:${quantizeVisualContentMetric(bevel)}`,
      () => createGarmentShape(THREE, variant, clothWidth, clothHeight),
      {
        steps: 1,
        depth: baseClothDepth,
        curveSegments: 10,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
      }
    );
    const clothMat = getCachedMeshStandardMaterial(THREE, `hanging-cloth:${clothColor}`, {
      color: clothColor,
      roughness: 0.93,
      metalness: 0.0,
    });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(xPos, rodY - clothHeight / 2 - dims.clothYOffsetM, rodZ - baseClothDepth / 2);
    cloth.rotation.y = (seededRandom.random() - 0.5) * dims.clothRotationYRangeRad;
    cloth.userData = cloth.userData || {};
    cloth.userData.__kind = 'hanging_cloth';
    cloth.userData.__variant = variant;
    addGarmentDetails({
      THREE,
      garment: cloth,
      variant,
      color: clothColor,
      width: clothWidth,
      height: clothHeight,
      depth: baseClothDepth,
    });
    addOutlines(cloth);
    parentGroup.add(cloth);
  }
};
