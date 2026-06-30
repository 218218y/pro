import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  getCachedBoxGeometry,
  getCachedMeshStandardMaterial,
  getCachedRoundedBoxGeometry,
  getBookSetColor,
  getRandomBookSetPalette,
  getRandomBookSpineBandColor,
  getRandomClothColor,
  quantizeVisualContentMetric,
  resolveContentsOutline,
  resolveLibraryContents,
  resolveShowContents,
  seededRandom,
  type AppAwareAddFoldedClothesFn,
} from './visuals_contents_shared.js';
import type { Object3DLike } from '../../../types/index.js';

type ShelfBookRun = {
  remaining: number;
  palette: readonly number[];
  height: number;
  widthBase: number;
  widthRange: number;
  gapBase: number;
  gapRange: number;
  tiltRange: number;
  volumeIndex: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextInteger(min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.max(low, Math.floor(max));
  return low + Math.floor(seededRandom.random() * (high - low + 1));
}

function resolveBackAlignedZ(args: {
  shelfZ: number;
  backEdgeZ: number;
  depthMargin: number;
  depth: number;
}): number {
  const { shelfZ, backEdgeZ, depthMargin, depth } = args;
  const z = backEdgeZ + depthMargin + quantizeVisualContentMetric(depth) / 2;
  return Number.isFinite(z) ? z : shelfZ;
}

function resolveBookDepth(baseDepth: number): number {
  const dims = CONTENT_VISUAL_DIMENSIONS.books;
  const trimRange = Math.min(dims.depthRandomTrimRangeM, Math.max(0, baseDepth - dims.depthMinM));
  const randomizedDepth = baseDepth - seededRandom.random() * trimRange;
  return clamp(randomizedDepth, dims.depthMinM, baseDepth);
}

function readVisualContentRuntimeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveVisualContentRuntimeNumber(value: unknown): number | null {
  const n = readVisualContentRuntimeNumber(value);
  return n != null && n > 0 ? n : null;
}

function resolveRotatedBookFootprintWidth(width: number, height: number, angleZ: number): number {
  const angleCos = Math.abs(Math.cos(angleZ));
  const angleSin = Math.abs(Math.sin(angleZ));
  return width * angleCos + height * angleSin;
}

function createShelfBookRun(args: {
  baseHeight: number;
  availableHeight: number;
  minBookHeight: number;
  edgeRun: boolean;
}): ShelfBookRun {
  const dims = CONTENT_VISUAL_DIMENSIONS.books;
  const { baseHeight, availableHeight, minBookHeight, edgeRun } = args;
  const roll = seededRandom.random();
  const isTalmudSet = roll < dims.talmudSetChance;
  const isNarrowSet = !isTalmudSet && roll < dims.talmudSetChance + dims.narrowSetChance;
  const isShortMixedRun = !isTalmudSet && !isNarrowSet && seededRandom.random() > dims.setChance;
  const count = isShortMixedRun
    ? nextInteger(dims.shortRunMinVolumes, dims.shortRunMaxVolumes)
    : nextInteger(dims.setMinVolumes, dims.setMaxVolumes);
  const setVariation = (seededRandom.random() - 0.5) * dims.setHeightVariationM;
  const edgeVariation = edgeRun ? (seededRandom.random() - 0.5) * dims.edgeHeightVariationM : 0;
  const runHeight = clamp(
    baseHeight +
      (isTalmudSet ? dims.talmudHeightBoostM : 0) -
      (isNarrowSet ? dims.narrowSetHeightTrimM : 0) +
      setVariation +
      edgeVariation,
    minBookHeight,
    availableHeight
  );

  return {
    remaining: count,
    palette: getRandomBookSetPalette(),
    height: runHeight,
    widthBase: isTalmudSet
      ? dims.talmudSetWidthBaseM
      : isNarrowSet
        ? dims.narrowSetWidthBaseM
        : dims.setWidthBaseM,
    widthRange: isTalmudSet
      ? dims.talmudSetWidthRandomRangeM
      : isNarrowSet
        ? dims.narrowSetWidthRandomRangeM
        : dims.setWidthRandomRangeM,
    gapBase: isShortMixedRun ? dims.gapBaseM : dims.setGapBaseM,
    gapRange: isShortMixedRun ? dims.gapRandomRangeM : dims.setGapRandomRangeM,
    tiltRange: edgeRun ? dims.edgeTiltZRangeRad : dims.setTiltZRangeRad,
    volumeIndex: 0,
  };
}

function addBookSpineBands(args: {
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>;
  book: Object3DLike;
  width: number;
  height: number;
  depth: number;
}): void {
  const { THREE, book, width, height, depth } = args;
  const dims = CONTENT_VISUAL_DIMENSIONS.books;
  if (!(width > dims.widthMinM * 1.5) || !(height > dims.minHeightM * 1.45)) return;
  if (seededRandom.random() > dims.spineBandChance) return;

  const bandWidth = Math.max(dims.widthMinM, width * (1 - dims.spineBandWidthInsetRatio));
  const bandHeight = Math.min(dims.spineBandHeightM, height * 0.12);
  const bandDepth = dims.spineBandThicknessM;
  const bandZ = depth / 2 + bandDepth / 2;
  const bandColor = getRandomBookSpineBandColor();
  const bandMaterial = getCachedMeshStandardMaterial(THREE, `book-spine-band:${bandColor}`, {
    color: bandColor,
    roughness: 0.62,
    metalness: 0.05,
  });
  const bandGeometry = getCachedBoxGeometry(THREE, bandWidth, bandHeight, bandDepth);

  for (const yRatio of [dims.spineBandYOffsetRatioA, dims.spineBandYOffsetRatioB]) {
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.set(0, height * yRatio, bandZ);
    band.userData = band.userData || {};
    band.userData.__kind = 'library_book_spine_band';
    book.add?.(band);
  }
}

function addShelfBooks(args: {
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>;
  shelfX: number;
  shelfY: number;
  shelfZ: number;
  width: number;
  parentGroup: Object3DLike;
  maxHeight: number;
  maxDepth?: number;
  addOutlines: (mesh: unknown) => unknown;
  isSketch: boolean;
}): void {
  const { THREE, shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth, addOutlines, isSketch } =
    args;
  const dims = CONTENT_VISUAL_DIMENSIONS.books;
  const depthMargin = dims.depthMarginM;
  const sideMargin = dims.sideMarginM;
  const topSafety = dims.topSafetyM;
  const minBookHeight = dims.minHeightM;
  const resolvedMaxDepth = readPositiveVisualContentRuntimeNumber(maxDepth) ?? dims.defaultMaxDepthM;
  const maxBookDepth = Math.min(dims.depthMaxM, Math.max(dims.depthMinM, resolvedMaxDepth - depthMargin * 2));
  const availableHeight = Math.max(0, (readVisualContentRuntimeNumber(maxHeight) ?? 0) - topSafety);
  if (
    !(width > sideMargin * 2) ||
    !(availableHeight >= minBookHeight) ||
    !(maxBookDepth > dims.depthViabilityMinM)
  )
    return;

  const backEdgeZ = shelfZ - resolvedMaxDepth / 2;
  const minX = shelfX - width / 2 + sideMargin;
  const maxX = shelfX + width / 2 - sideMargin;
  const shelfSpan = Math.max(0, maxX - minX);
  const edgeZoneWidth = Math.min(dims.edgeZoneMaxM, shelfSpan * dims.edgeZoneRatio);
  const baseHeight = clamp(
    availableHeight * (dims.alignedHeightRatioBase + seededRandom.random() * dims.alignedHeightRatioRange),
    minBookHeight,
    availableHeight
  );
  let cursorX = minX;
  let bookIndex = 0;
  let run: ShelfBookRun | null = null;

  while (cursorX < maxX - dims.cursorEndGapM && bookIndex < dims.maxCount) {
    const remaining = maxX - cursorX;
    if (remaining < dims.cursorEndGapM) break;
    const edgeRun = cursorX - minX < edgeZoneWidth || maxX - cursorX < edgeZoneWidth;
    if (!run || run.remaining <= 0) {
      run = createShelfBookRun({ baseHeight, availableHeight, minBookHeight, edgeRun });
    }

    const bookWidth = run.widthBase + seededRandom.random() * run.widthRange;
    const gap = run.gapBase + seededRandom.random() * run.gapRange;
    const actualW = Math.min(bookWidth, remaining);
    const localVariation = edgeRun ? (seededRandom.random() - 0.5) * dims.edgeHeightVariationM : 0;
    let bookAngleZ = (seededRandom.random() - 0.5) * run.tiltRange;
    let angleCos = Math.max(dims.angleCosMin, Math.abs(Math.cos(bookAngleZ)));
    let angleSin = Math.abs(Math.sin(bookAngleZ));
    let maxRotatedBookHeight = Math.max(0, (availableHeight - actualW * angleSin) / angleCos);
    let bookHeight = Math.min(
      maxRotatedBookHeight,
      clamp(run.height + localVariation, minBookHeight, availableHeight)
    );
    if (!(actualW > dims.widthMinM) || !(bookHeight >= minBookHeight)) break;
    let rotatedBookHeight = bookHeight * angleCos + actualW * angleSin;
    let occupiedBookWidth = resolveRotatedBookFootprintWidth(actualW, bookHeight, bookAngleZ);
    if (occupiedBookWidth > remaining) {
      bookAngleZ = 0;
      angleCos = 1;
      angleSin = 0;
      maxRotatedBookHeight = availableHeight;
      bookHeight = Math.min(
        maxRotatedBookHeight,
        clamp(run.height + localVariation, minBookHeight, availableHeight)
      );
      rotatedBookHeight = bookHeight;
      occupiedBookWidth = actualW;
    }

    const bookDepth = resolveBookDepth(maxBookDepth);
    const rowZ = resolveBackAlignedZ({ shelfZ, backEdgeZ, depthMargin, depth: bookDepth });
    const geometry = getCachedBoxGeometry(THREE, actualW, bookHeight, bookDepth);
    const bookColor = getBookSetColor(run.palette, run.volumeIndex);
    const mat = getCachedMeshStandardMaterial(THREE, `library-book:${bookColor}`, {
      color: bookColor,
      roughness: 0.72,
      metalness: 0.0,
    });
    const book = new THREE.Mesh(geometry, mat);
    book.position.set(cursorX + occupiedBookWidth / 2, shelfY + rotatedBookHeight / 2, rowZ);
    book.rotation.z = bookAngleZ;
    book.userData = book.userData || {};
    book.userData.__kind = 'library_book';
    book.userData.__setVolume = run.volumeIndex;
    addBookSpineBands({ THREE, book, width: actualW, height: bookHeight, depth: bookDepth });
    if (isSketch) addOutlines(book);
    parentGroup.add?.(book);

    cursorX += occupiedBookWidth + (run.remaining <= 1 ? dims.setTrailingGapM : 0) + gap;
    run.remaining -= 1;
    run.volumeIndex += 1;
    bookIndex += 1;
  }
}

function adjustHexColor(color: number, amount: number): number {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, value));
  const r = clampChannel(((color >> 16) & 0xff) + amount);
  const g = clampChannel(((color >> 8) & 0xff) + amount);
  const b = clampChannel((color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

function createFoldedClothGeometry(
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>,
  width: number,
  height: number,
  depth: number
) {
  return getCachedRoundedBoxGeometry(
    THREE,
    width,
    height,
    depth,
    4,
    Math.min(0.008, Math.max(0.002, Math.min(width, height, depth) * 0.28))
  );
}

function addFoldedGarmentDetails(args: {
  THREE: ReturnType<typeof ensureVisualsContentsTHREE>;
  item: Object3DLike;
  itemWidth: number;
  itemHeight: number;
  itemDepth: number;
  color: number;
  stackIndex: number;
  itemIndex: number;
}): void {
  const { THREE, item, itemWidth, itemHeight, itemDepth, color, stackIndex, itemIndex } = args;
  const variantSelector = (stackIndex + itemIndex) % 3;
  const accentColor = adjustHexColor(color, 18);
  const shadowColor = adjustHexColor(color, -14);
  const accentMat = getCachedMeshStandardMaterial(THREE, `folded-detail-accent:${accentColor}`, {
    color: accentColor,
    roughness: 0.94,
    metalness: 0.0,
  });
  const shadowMat = getCachedMeshStandardMaterial(THREE, `folded-detail-shadow:${shadowColor}`, {
    color: shadowColor,
    roughness: 0.97,
    metalness: 0.0,
  });
  const topPanel = new THREE.Mesh(
    createFoldedClothGeometry(THREE, itemWidth * 0.74, itemHeight * 0.2, itemDepth * 0.38),
    accentMat
  );
  topPanel.position.set(0, itemHeight * 0.16, itemDepth * 0.18);
  topPanel.userData = topPanel.userData || {};
  topPanel.userData.__kind = 'folded_cloth_top_panel';
  item.add?.(topPanel);

  const frontFold = new THREE.Mesh(
    createFoldedClothGeometry(THREE, itemWidth * 0.7, itemHeight * 0.12, itemDepth * 0.24),
    shadowMat
  );
  frontFold.position.set(0, -itemHeight * 0.06, itemDepth * 0.28);
  frontFold.userData = frontFold.userData || {};
  frontFold.userData.__kind = 'folded_cloth_front_fold';
  item.add?.(frontFold);

  if (variantSelector === 0) {
    const collar = new THREE.Mesh(
      createFoldedClothGeometry(THREE, itemWidth * 0.24, itemHeight * 0.1, itemDepth * 0.2),
      shadowMat
    );
    collar.position.set(0, itemHeight * 0.24, itemDepth * 0.08);
    collar.userData = collar.userData || {};
    collar.userData.__kind = 'folded_cloth_collar';
    item.add?.(collar);
  } else if (variantSelector === 1) {
    for (const side of [-1, 1]) {
      const sleeveFold = new THREE.Mesh(
        createFoldedClothGeometry(THREE, itemWidth * 0.18, itemHeight * 0.12, itemDepth * 0.18),
        accentMat
      );
      sleeveFold.position.set(side * itemWidth * 0.22, itemHeight * 0.08, itemDepth * 0.04);
      sleeveFold.userData = sleeveFold.userData || {};
      sleeveFold.userData.__kind = 'folded_cloth_sleeve_fold';
      item.add?.(sleeveFold);
    }
  } else {
    const crease = new THREE.Mesh(
      getCachedBoxGeometry(
        THREE,
        Math.max(itemWidth * 0.07, 0.006),
        itemHeight * 0.44,
        Math.max(itemDepth * 0.07, 0.004)
      ),
      accentMat
    );
    crease.position.set(0, 0, itemDepth * 0.22);
    crease.userData = crease.userData || {};
    crease.userData.__kind = 'folded_cloth_crease';
    item.add?.(crease);
  }
}

export const addFoldedClothes: AppAwareAddFoldedClothesFn = (
  App,
  shelfX,
  shelfY,
  shelfZ,
  width,
  parentGroup,
  maxHeight,
  maxDepth,
  policy
) => {
  App = ensureVisualsContentsApp(App);
  const THREE = ensureVisualsContentsTHREE(App);
  if (typeof maxHeight === 'undefined' || maxHeight === null) {
    maxHeight = CONTENT_VISUAL_DIMENSIONS.foldedClothes.defaultMaxHeightM;
  }
  const resolvedMaxHeight = readVisualContentRuntimeNumber(maxHeight) ?? 0;

  const isLibraryContents = resolveLibraryContents(policy);
  if (!resolveShowContents(policy)) return;
  const outline = resolveContentsOutline(policy);
  const addOutlines = (mesh: unknown) => outline?.(mesh);
  const isSketch = policy.sketchMode;

  const seedVal = Math.floor(shelfX * 123 + shelfY * 456 + shelfZ * 789 + width * 1000);
  seededRandom.setSeed(Math.abs(seedVal) + 55);

  if (isLibraryContents) {
    addShelfBooks({
      THREE,
      shelfX,
      shelfY,
      shelfZ,
      width,
      parentGroup,
      maxHeight: resolvedMaxHeight,
      maxDepth,
      addOutlines,
      isSketch,
    });
    return;
  }

  const dims = CONTENT_VISUAL_DIMENSIONS.foldedClothes;
  const baseItemDepth = dims.baseItemDepthM;
  const depthMargin = dims.depthMarginM;
  const resolvedMaxDepth = readPositiveVisualContentRuntimeNumber(maxDepth);
  const maxItemDepth =
    resolvedMaxDepth != null ? Math.max(0, resolvedMaxDepth - depthMargin * 2) : baseItemDepth;
  const itemDepth = resolvedMaxDepth != null ? Math.min(baseItemDepth, maxItemDepth) : baseItemDepth;
  if (resolvedMaxDepth != null && itemDepth < dims.minItemDepthM) return;

  const backEdgeZ = resolvedMaxDepth != null ? shelfZ - resolvedMaxDepth / 2 : null;
  const frontEdgeZ = resolvedMaxDepth != null ? shelfZ + resolvedMaxDepth / 2 : null;
  const minZ = resolvedMaxDepth != null && backEdgeZ != null ? backEdgeZ + depthMargin + itemDepth / 2 : null;
  const maxZ =
    resolvedMaxDepth != null && frontEdgeZ != null ? frontEdgeZ - depthMargin - itemDepth / 2 : null;
  const clamp = (value: number, a: number, b: number) => (value < a ? a : value > b ? b : value);
  const zRoom = resolvedMaxDepth != null && maxZ != null && minZ != null ? Math.max(0, maxZ - minZ) : 0;
  const zSpread =
    resolvedMaxDepth != null ? Math.min(dims.zSpreadMaxM, zRoom * dims.zSpreadRatio) : dims.zSpreadMaxM;

  const itemHeight = dims.itemHeightM;
  const maxItemsAllowed = Math.floor((resolvedMaxHeight - dims.heightHeadroomM) / itemHeight);
  const stacks = Math.floor(width / dims.stackPitchM);

  for (let i = 0; i < stacks; i++) {
    const xPos = shelfX - width / 2 + dims.stackXInsetM + i * dims.stackPitchM;
    let itemsInStack = Math.floor(seededRandom.random() * dims.randomItemsRange) + dims.stackBaseItems;
    if (itemsInStack > maxItemsAllowed) itemsInStack = maxItemsAllowed;
    if (itemsInStack < 1 && resolvedMaxHeight > dims.minHeightForSingleItemM) itemsInStack = 1;
    if (itemsInStack < 0) itemsInStack = 0;

    let currentY = shelfY;
    const stackColor = getRandomClothColor();
    for (let j = 0; j < itemsInStack; j++) {
      const widthScale = 0.92 + seededRandom.random() * 0.12;
      const depthScale = 0.9 + seededRandom.random() * 0.1;
      const itemWidth = dims.itemWidthM * widthScale;
      const actualDepth = itemDepth * depthScale;
      const geometry = createFoldedClothGeometry(THREE, itemWidth, itemHeight, actualDepth);
      const item = new THREE.Mesh(
        geometry,
        getCachedMeshStandardMaterial(THREE, `folded-cloth:${stackColor}`, {
          color: stackColor,
          roughness: 0.94,
          metalness: 0.0,
          flatShading: false,
        })
      );

      const randomOffsetX = (seededRandom.random() - 0.5) * dims.randomOffsetXM;
      const randomOffsetZ = (seededRandom.random() - 0.5) * zSpread;
      let zPos = shelfZ + randomOffsetZ;
      if (resolvedMaxDepth != null && minZ != null && maxZ != null) {
        if (maxZ < minZ) break;
        const halfDepth = actualDepth / 2;
        zPos = clamp(zPos, minZ + halfDepth - itemDepth / 2, maxZ - halfDepth + itemDepth / 2);
      }

      item.position.set(xPos + randomOffsetX, currentY + itemHeight / 2, zPos);
      item.rotation.y = (seededRandom.random() - 0.5) * Math.min(dims.rotationYRangeRad, 0.035);
      item.userData = item.userData || {};
      item.userData.__kind = 'folded_cloth_item';
      addFoldedGarmentDetails({
        THREE,
        item,
        itemWidth,
        itemHeight,
        itemDepth: actualDepth,
        color: stackColor,
        stackIndex: i,
        itemIndex: j,
      });
      if (isSketch) addOutlines(item);
      parentGroup.add(item);
      currentY += itemHeight;
    }
  }
};
