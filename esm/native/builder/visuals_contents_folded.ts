import {
  addVisualsContentsOutlines,
  ensureVisualsContentsApp,
  ensureVisualsContentsTHREE,
  getRandomClothColor,
  getVisualsContentsBuildUI,
  readVisualsContentsSketchMode,
  resolveShowContents,
  seededRandom,
  type AppAwareAddFoldedClothesFn,
} from './visuals_contents_shared.js';

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
