import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  addVisualsContentsOutlines,
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  getRandomBookColor,
  getRandomClothColor,
  getVisualsContentsBuildUI,
  readVisualsContentsSketchMode,
  resolveLibraryContents,
  resolveShowContents,
  seededRandom,
  type AppAwareAddFoldedClothesFn,
} from './visuals_contents_shared.js';
import type { Object3DLike } from '../../../types/index.js';

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
  const minStackHeight = dims.minStackHeightM;
  const resolvedMaxDepth =
    typeof maxDepth === 'number' && Number.isFinite(maxDepth) && maxDepth > 0
      ? Number(maxDepth)
      : dims.defaultMaxDepthM;
  const bookDepth = Math.min(dims.depthMaxM, Math.max(dims.depthMinM, resolvedMaxDepth - depthMargin * 2));
  const availableHeight = Math.max(0, Number(maxHeight) - topSafety);
  if (
    !(width > sideMargin * 2) ||
    !(availableHeight >= minBookHeight) ||
    !(bookDepth > dims.depthViabilityMinM)
  )
    return;

  const backEdgeZ = shelfZ - resolvedMaxDepth / 2;
  const minZ = backEdgeZ + depthMargin + bookDepth / 2;
  const rowZ = Number.isFinite(minZ) ? minZ : shelfZ;
  const minX = shelfX - width / 2 + sideMargin;
  const maxX = shelfX + width / 2 - sideMargin;
  let cursorX = minX;
  let bookIndex = 0;

  while (cursorX < maxX - dims.cursorEndGapM && bookIndex < dims.maxCount) {
    const bookWidth = dims.widthBaseM + seededRandom.random() * dims.widthRandomRangeM;
    const gap = dims.gapBaseM + seededRandom.random() * dims.gapRandomRangeM;
    const remaining = maxX - cursorX;
    if (remaining < dims.cursorEndGapM) break;
    const actualW = Math.min(bookWidth, remaining);
    const bookAngleZ = (seededRandom.random() - 0.5) * dims.tiltZRangeRad;
    const angleCos = Math.max(dims.angleCosMin, Math.abs(Math.cos(bookAngleZ)));
    const angleSin = Math.abs(Math.sin(bookAngleZ));
    const maxRotatedBookHeight = Math.max(0, (availableHeight - actualW * angleSin) / angleCos);
    const bookHeight = Math.min(
      maxRotatedBookHeight,
      dims.heightBaseM + seededRandom.random() * dims.heightRandomRangeM
    );
    if (!(actualW > dims.widthMinM) || !(bookHeight >= minBookHeight)) break;
    const rotatedBookHeight = bookHeight * angleCos + actualW * angleSin;

    const geometry = new THREE.BoxGeometry(actualW, bookHeight, bookDepth);
    const mat = new THREE.MeshStandardMaterial({
      color: getRandomBookColor(),
      roughness: 0.72,
      metalness: 0.0,
    });
    const book = new THREE.Mesh(geometry, mat);
    book.position.set(cursorX + actualW / 2, shelfY + rotatedBookHeight / 2, rowZ);
    book.rotation.z = bookAngleZ;
    book.userData = book.userData || {};
    book.userData.__kind = 'library_book';
    if (isSketch) addOutlines(book);
    parentGroup.add?.(book);

    if (seededRandom.random() > 0.78 && cursorX + actualW + dims.stackLookaheadM < maxX) {
      const maxStackTopY = shelfY + availableHeight;
      let stackY = shelfY;
      for (let s = 0; s < dims.stackMaxItems; s += 1) {
        const stackW = Math.min(
          dims.stackWidthBaseM + seededRandom.random() * dims.stackWidthRandomRangeM,
          maxX - cursorX - actualW - dims.stackTrailingGapM
        );
        if (!(stackW > dims.stackWidthMinM)) break;
        const stackH = dims.stackHeightBaseM + seededRandom.random() * dims.stackHeightRandomRangeM;
        if (stackY + stackH > maxStackTopY || stackH < minStackHeight) break;
        const stackGeo = new THREE.BoxGeometry(
          stackW,
          stackH,
          bookDepth * (dims.stackDepthScaleBase + seededRandom.random() * dims.stackDepthScaleRange)
        );
        const stackMat = new THREE.MeshStandardMaterial({
          color: getRandomBookColor(),
          roughness: 0.76,
          metalness: 0.0,
        });
        const stackedBook = new THREE.Mesh(stackGeo, stackMat);
        stackedBook.position.set(
          cursorX + actualW + dims.stackXOffsetM + stackW / 2,
          stackY + stackH / 2,
          rowZ
        );
        stackedBook.rotation.y = (seededRandom.random() - 0.5) * dims.stackTiltYRangeRad;
        stackedBook.userData = stackedBook.userData || {};
        stackedBook.userData.__kind = 'library_book_stack';
        if (isSketch) addOutlines(stackedBook);
        parentGroup.add?.(stackedBook);
        stackY += stackH;
      }
      cursorX += actualW + dims.stackCursorAdvanceM + gap;
    } else {
      cursorX += actualW + gap;
    }
    bookIndex += 1;
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
  maxDepth
) => {
  App = ensureVisualsContentsApp(App);
  const THREE = ensureVisualsContentsTHREE(App);
  const addOutlines = (mesh: unknown) => addVisualsContentsOutlines(mesh, App);
  const isSketch = readVisualsContentsSketchMode(App);
  if (typeof maxHeight === 'undefined' || maxHeight === null) {
    maxHeight = CONTENT_VISUAL_DIMENSIONS.foldedClothes.defaultMaxHeightM;
  }

  const buildUI = getVisualsContentsBuildUI(App);
  if (!resolveShowContents(buildUI)) return;

  const seedVal = Math.floor(shelfX * 123 + shelfY * 456 + shelfZ * 789 + width * 1000);
  seededRandom.setSeed(Math.abs(seedVal) + 55);

  if (resolveLibraryContents(buildUI, App)) {
    addShelfBooks({
      THREE,
      shelfX,
      shelfY,
      shelfZ,
      width,
      parentGroup,
      maxHeight,
      maxDepth,
      addOutlines,
      isSketch,
    });
    return;
  }

  const dims = CONTENT_VISUAL_DIMENSIONS.foldedClothes;
  const baseItemDepth = dims.baseItemDepthM;
  const depthMargin = dims.depthMarginM;
  const resolvedMaxDepth =
    typeof maxDepth === 'number' && Number.isFinite(maxDepth) && maxDepth > 0 ? Number(maxDepth) : null;
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
  const maxItemsAllowed = Math.floor((maxHeight - dims.heightHeadroomM) / itemHeight);
  const stacks = Math.floor(width / dims.stackPitchM);

  for (let i = 0; i < stacks; i++) {
    const xPos = shelfX - width / 2 + dims.stackXInsetM + i * dims.stackPitchM;
    let itemsInStack = Math.floor(seededRandom.random() * dims.randomItemsRange) + dims.stackBaseItems;
    if (itemsInStack > maxItemsAllowed) itemsInStack = maxItemsAllowed;
    if (itemsInStack < 1 && maxHeight > dims.minHeightForSingleItemM) itemsInStack = 1;
    if (itemsInStack < 0) itemsInStack = 0;

    let currentY = shelfY;
    for (let j = 0; j < itemsInStack; j++) {
      const itemWidth = dims.itemWidthM;
      const geometry =
        typeof THREE.RoundedBoxGeometry !== 'undefined'
          ? new THREE.RoundedBoxGeometry(itemWidth, itemHeight, itemDepth, 4, dims.cornerRadiusM)
          : new THREE.BoxGeometry(itemWidth, itemHeight, itemDepth);
      const item = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: getRandomClothColor(), roughness: 0.9, flatShading: false })
      );

      const randomOffsetX = (seededRandom.random() - 0.5) * dims.randomOffsetXM;
      const randomOffsetZ = (seededRandom.random() - 0.5) * zSpread;
      let zPos = shelfZ + randomOffsetZ;
      if (resolvedMaxDepth != null && minZ != null && maxZ != null) {
        if (maxZ < minZ) break;
        zPos = clamp(zPos, minZ, maxZ);
      }

      item.position.set(xPos + randomOffsetX, currentY + itemHeight / 2, zPos);
      item.rotation.y = (seededRandom.random() - 0.5) * dims.rotationYRangeRad;
      if (isSketch) addOutlines(item);
      parentGroup.add(item);
      currentY += itemHeight;
    }
  }
};
