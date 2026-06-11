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
  const depthMargin = 0.018;
  const sideMargin = 0.035;
  const topSafety = 0.014;
  const minBookHeight = 0.07;
  const minStackHeight = 0.012;
  const resolvedMaxDepth =
    typeof maxDepth === 'number' && Number.isFinite(maxDepth) && maxDepth > 0 ? Number(maxDepth) : 0.38;
  const bookDepth = Math.min(0.2, Math.max(0.08, resolvedMaxDepth - depthMargin * 2));
  const availableHeight = Math.max(0, Number(maxHeight) - topSafety);
  if (!(width > sideMargin * 2) || !(availableHeight >= minBookHeight) || !(bookDepth > 0.06)) return;

  const backEdgeZ = shelfZ - resolvedMaxDepth / 2;
  const minZ = backEdgeZ + depthMargin + bookDepth / 2;
  const rowZ = Number.isFinite(minZ) ? minZ : shelfZ;
  const minX = shelfX - width / 2 + sideMargin;
  const maxX = shelfX + width / 2 - sideMargin;
  let cursorX = minX;
  let bookIndex = 0;

  while (cursorX < maxX - 0.018 && bookIndex < 96) {
    const bookWidth = 0.022 + seededRandom.random() * 0.026;
    const gap = 0.003 + seededRandom.random() * 0.006;
    const remaining = maxX - cursorX;
    if (remaining < 0.018) break;
    const actualW = Math.min(bookWidth, remaining);
    const bookAngleZ = (seededRandom.random() - 0.5) * 0.045;
    const angleCos = Math.max(0.001, Math.abs(Math.cos(bookAngleZ)));
    const angleSin = Math.abs(Math.sin(bookAngleZ));
    const maxRotatedBookHeight = Math.max(0, (availableHeight - actualW * angleSin) / angleCos);
    const bookHeight = Math.min(maxRotatedBookHeight, 0.16 + seededRandom.random() * 0.18);
    if (!(actualW > 0.01) || !(bookHeight >= minBookHeight)) break;
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

    if (seededRandom.random() > 0.78 && cursorX + actualW + 0.04 < maxX) {
      const maxStackTopY = shelfY + availableHeight;
      let stackY = shelfY;
      for (let s = 0; s < 3; s += 1) {
        const stackW = Math.min(0.07 + seededRandom.random() * 0.035, maxX - cursorX - actualW - 0.012);
        if (!(stackW > 0.035)) break;
        const stackH = 0.014 + seededRandom.random() * 0.008;
        if (stackY + stackH > maxStackTopY || stackH < minStackHeight) break;
        const stackGeo = new THREE.BoxGeometry(
          stackW,
          stackH,
          bookDepth * (0.88 + seededRandom.random() * 0.12)
        );
        const stackMat = new THREE.MeshStandardMaterial({
          color: getRandomBookColor(),
          roughness: 0.76,
          metalness: 0.0,
        });
        const stackedBook = new THREE.Mesh(stackGeo, stackMat);
        stackedBook.position.set(cursorX + actualW + 0.014 + stackW / 2, stackY + stackH / 2, rowZ);
        stackedBook.rotation.y = (seededRandom.random() - 0.5) * 0.04;
        stackedBook.userData = stackedBook.userData || {};
        stackedBook.userData.__kind = 'library_book_stack';
        if (isSketch) addOutlines(stackedBook);
        parentGroup.add?.(stackedBook);
        stackY += stackH;
      }
      cursorX += actualW + 0.035 + gap;
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
  if (typeof maxHeight === 'undefined' || maxHeight === null) maxHeight = 0.5;

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

  const baseItemDepth = 0.36;
  const depthMargin = 0.015;
  const resolvedMaxDepth =
    typeof maxDepth === 'number' && Number.isFinite(maxDepth) && maxDepth > 0 ? Number(maxDepth) : null;
  const maxItemDepth =
    resolvedMaxDepth != null ? Math.max(0, resolvedMaxDepth - depthMargin * 2) : baseItemDepth;
  const itemDepth = resolvedMaxDepth != null ? Math.min(baseItemDepth, maxItemDepth) : baseItemDepth;
  if (resolvedMaxDepth != null && itemDepth < 0.12) return;

  const backEdgeZ = resolvedMaxDepth != null ? shelfZ - resolvedMaxDepth / 2 : null;
  const frontEdgeZ = resolvedMaxDepth != null ? shelfZ + resolvedMaxDepth / 2 : null;
  const minZ = resolvedMaxDepth != null && backEdgeZ != null ? backEdgeZ + depthMargin + itemDepth / 2 : null;
  const maxZ =
    resolvedMaxDepth != null && frontEdgeZ != null ? frontEdgeZ - depthMargin - itemDepth / 2 : null;
  const clamp = (value: number, a: number, b: number) => (value < a ? a : value > b ? b : value);
  const zRoom = resolvedMaxDepth != null && maxZ != null && minZ != null ? Math.max(0, maxZ - minZ) : 0;
  const zSpread = resolvedMaxDepth != null ? Math.min(0.015, zRoom * 0.35) : 0.015;

  const itemHeight = 0.025;
  const maxItemsAllowed = Math.floor((maxHeight - 0.03) / itemHeight);
  const stacks = Math.floor(width / 0.3);

  for (let i = 0; i < stacks; i++) {
    const xPos = shelfX - width / 2 + 0.15 + i * 0.3;
    let itemsInStack = Math.floor(seededRandom.random() * 4) + 4;
    if (itemsInStack > maxItemsAllowed) itemsInStack = maxItemsAllowed;
    if (itemsInStack < 1 && maxHeight > 0.06) itemsInStack = 1;
    if (itemsInStack < 0) itemsInStack = 0;

    let currentY = shelfY;
    for (let j = 0; j < itemsInStack; j++) {
      const itemWidth = 0.26;
      const geometry =
        typeof THREE.RoundedBoxGeometry !== 'undefined'
          ? new THREE.RoundedBoxGeometry(itemWidth, itemHeight, itemDepth, 4, 0.008)
          : new THREE.BoxGeometry(itemWidth, itemHeight, itemDepth);
      const item = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: getRandomClothColor(), roughness: 0.9, flatShading: false })
      );

      const randomOffsetX = (seededRandom.random() - 0.5) * 0.015;
      const randomOffsetZ = (seededRandom.random() - 0.5) * zSpread;
      let zPos = shelfZ + randomOffsetZ;
      if (resolvedMaxDepth != null && minZ != null && maxZ != null) {
        if (maxZ < minZ) break;
        zPos = clamp(zPos, minZ, maxZ);
      }

      item.position.set(xPos + randomOffsetX, currentY + itemHeight / 2, zPos);
      item.rotation.y = (seededRandom.random() - 0.5) * 0.08;
      if (isSketch) addOutlines(item);
      parentGroup.add(item);
      currentY += itemHeight;
    }
  }
};
