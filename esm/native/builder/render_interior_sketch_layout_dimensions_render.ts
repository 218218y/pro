import {
  groupSketchFreeBoxDimensionEntries,
  mergeSketchFreeBoxDimensionSpans,
} from './render_interior_sketch_layout_dimensions_grouping.js';
import {
  type RenderSketchFreeBoxDimensionGroupArgs,
  type RenderSketchFreeBoxDimensionsArgs,
  type SketchFreeBoxDimensionEntry,
} from './render_interior_sketch_layout_dimensions_shared.js';

export const renderSketchFreeBoxDimensions = (args: RenderSketchFreeBoxDimensionsArgs) => {
  const THREE = args.THREE;
  const addDimensionLine = args.addDimensionLine;
  const width = Number(args.width);
  const height = Number(args.height);
  const depth = Number(args.depth);
  const centerX = Number(args.centerX);
  const centerY = Number(args.centerY);
  const centerZ = Number(args.centerZ);
  if (!(width > 0) || !(height > 0) || !(depth > 0)) return;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(centerZ)) return;

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const widthLineY = centerY + halfH + Math.max(0.08, Math.min(0.14, height * 0.18));
  const widthTextOffset = new THREE.Vector3(0, Math.max(0.06, Math.min(0.1, height * 0.16)), 0);

  const heightLineGap = Math.max(0.11, Math.min(0.18, width * 0.22));
  const heightLineX = centerX + halfW + heightLineGap;
  const heightTextOffset = new THREE.Vector3(Math.max(0.06, Math.min(0.11, width * 0.18)), 0, 0);

  const depthLineGap = Math.max(0.11, Math.min(0.18, width * 0.22));
  const depthLineX = centerX - halfW - depthLineGap;
  const depthLineY = centerY + Math.max(0.04, Math.min(0.1, height * 0.12));
  const depthTextOffset = new THREE.Vector3(-Math.max(0.12, Math.min(0.18, width * 0.24)), 0, 0);

  const widthLeftX = centerX - halfW;
  const widthRightX = centerX + halfW;
  const heightBottomY = centerY - halfH;
  const heightTopY = centerY + halfH;
  const backZ = centerZ - halfD;
  const frontZ = centerZ + halfD;
  const textScale = 0.78;

  addDimensionLine(
    new THREE.Vector3(widthLeftX, widthLineY, centerZ),
    new THREE.Vector3(widthRightX, widthLineY, centerZ),
    widthTextOffset,
    (width * 100).toFixed(0),
    textScale
  );

  addDimensionLine(
    new THREE.Vector3(heightLineX, heightBottomY, centerZ),
    new THREE.Vector3(heightLineX, heightTopY, centerZ),
    heightTextOffset,
    (height * 100).toFixed(0),
    textScale
  );

  addDimensionLine(
    new THREE.Vector3(depthLineX, depthLineY, frontZ),
    new THREE.Vector3(depthLineX, depthLineY, backZ),
    depthTextOffset,
    (depth * 100).toFixed(0),
    textScale
  );
};

export function renderSketchFreeBoxDimensionGroup(args: RenderSketchFreeBoxDimensionGroupArgs): void {
  const THREE = args.THREE;
  const addDimensionLine = args.addDimensionLine;
  const entries = args.entries;
  if (!entries.length) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minBottomY = Infinity;
  let maxTopY = -Infinity;
  let minBackZ = Infinity;
  let maxFrontZ = -Infinity;
  let minEntryHeight = Infinity;
  let maxEntryHeight = 0;
  let minEntryDepth = Infinity;
  let maxEntryDepth = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    if (entry.minX < minX) minX = entry.minX;
    if (entry.maxX > maxX) maxX = entry.maxX;
    if (entry.bottomY < minBottomY) minBottomY = entry.bottomY;
    if (entry.topY > maxTopY) maxTopY = entry.topY;
    if (entry.backZ < minBackZ) minBackZ = entry.backZ;
    if (entry.frontZ > maxFrontZ) maxFrontZ = entry.frontZ;
    if (entry.height < minEntryHeight) minEntryHeight = entry.height;
    if (entry.height > maxEntryHeight) maxEntryHeight = entry.height;
    if (entry.depth < minEntryDepth) minEntryDepth = entry.depth;
    if (entry.depth > maxEntryDepth) maxEntryDepth = entry.depth;
  }

  const totalWidth = Math.max(0, maxX - minX);
  const totalHeight = Math.max(0, maxTopY - minBottomY);
  const totalDepth = Math.max(0, maxFrontZ - minBackZ);
  if (!(totalWidth > 0) || !(totalHeight > 0) || !(totalDepth > 0)) return;

  const clusterCenterZ = (minBackZ + maxFrontZ) / 2;
  const textScale = 0.78;
  const widthLineY = maxTopY + Math.max(0.1, Math.min(0.16, totalHeight * 0.12));
  const widthTextOffset = new THREE.Vector3(0, Math.max(0.06, Math.min(0.1, totalHeight * 0.1)), 0);
  const widthSegmentsY = maxTopY + Math.max(0.04, Math.min(0.09, totalHeight * 0.06));

  addDimensionLine(
    new THREE.Vector3(minX, widthLineY, clusterCenterZ),
    new THREE.Vector3(maxX, widthLineY, clusterCenterZ),
    widthTextOffset,
    (totalWidth * 100).toFixed(0),
    textScale
  );

  const mergedWidthSpans = mergeSketchFreeBoxDimensionSpans(
    entries.map(entry => ({ min: entry.minX, max: entry.maxX }))
  );
  if (mergedWidthSpans.length >= 2) {
    const segmentTextOffset = new THREE.Vector3(0, Math.max(0.05, Math.min(0.08, totalHeight * 0.08)), 0);
    for (let i = 0; i < mergedWidthSpans.length; i++) {
      const span = mergedWidthSpans[i];
      const width = span.max - span.min;
      if (!(width > 0)) continue;
      addDimensionLine(
        new THREE.Vector3(span.min, widthSegmentsY, clusterCenterZ),
        new THREE.Vector3(span.max, widthSegmentsY, clusterCenterZ),
        segmentTextOffset,
        (width * 100).toFixed(0),
        textScale
      );
    }
  }

  const heightLineGap = Math.max(0.12, Math.min(0.22, totalWidth * 0.18));
  const heightLineX = maxX + heightLineGap;
  const heightTextOffset = new THREE.Vector3(Math.max(0.06, Math.min(0.11, totalWidth * 0.14)), 0, 0);
  addDimensionLine(
    new THREE.Vector3(heightLineX, minBottomY, clusterCenterZ),
    new THREE.Vector3(heightLineX, maxTopY, clusterCenterZ),
    heightTextOffset,
    (totalHeight * 100).toFixed(0),
    textScale
  );

  const roundedMinEntryHeight = Math.round(minEntryHeight * 100) / 100;
  const roundedMaxEntryHeight = Math.round(maxEntryHeight * 100) / 100;
  if (roundedMaxEntryHeight - roundedMinEntryHeight >= 0.01 && mergedWidthSpans.length >= 2) {
    const minHeightLineX = heightLineX - Math.max(0.08, Math.min(0.14, totalWidth * 0.1));
    const minHeightTextOffset = new THREE.Vector3(Math.max(0.06, Math.min(0.1, totalWidth * 0.12)), 0, 0);
    addDimensionLine(
      new THREE.Vector3(minHeightLineX, minBottomY, clusterCenterZ),
      new THREE.Vector3(minHeightLineX, minBottomY + minEntryHeight, clusterCenterZ),
      minHeightTextOffset,
      (minEntryHeight * 100).toFixed(0),
      textScale,
      new THREE.Vector3(0, -0.22, 0)
    );
  }

  const depthLineGap = Math.max(0.12, Math.min(0.22, totalWidth * 0.18));
  const depthLineX = minX - depthLineGap;
  const depthLineY = minBottomY + Math.max(0.08, Math.min(0.16, totalHeight * 0.3));
  const depthTextOffset = new THREE.Vector3(-Math.max(0.14, Math.min(0.2, totalWidth * 0.16)), 0, 0);
  addDimensionLine(
    new THREE.Vector3(depthLineX, depthLineY, maxFrontZ),
    new THREE.Vector3(depthLineX, depthLineY, minBackZ),
    depthTextOffset,
    (totalDepth * 100).toFixed(0),
    textScale
  );

  const roundedMinEntryDepth = Math.round(minEntryDepth * 100) / 100;
  const roundedMaxEntryDepth = Math.round(maxEntryDepth * 100) / 100;
  if (roundedMaxEntryDepth - roundedMinEntryDepth >= 0.01) {
    const minDepthLineX = depthLineX + Math.max(0.07, Math.min(0.13, totalWidth * 0.09));
    const minDepthTextOffset = new THREE.Vector3(-Math.max(0.12, Math.min(0.18, totalWidth * 0.14)), 0, 0);
    addDimensionLine(
      new THREE.Vector3(
        minDepthLineX,
        depthLineY - Math.max(0.08, Math.min(0.14, totalHeight * 0.08)),
        minBackZ + minEntryDepth
      ),
      new THREE.Vector3(
        minDepthLineX,
        depthLineY - Math.max(0.08, Math.min(0.14, totalHeight * 0.08)),
        minBackZ
      ),
      minDepthTextOffset,
      (minEntryDepth * 100).toFixed(0),
      textScale
    );
  }
}

export const renderSketchFreeBoxDimensionOverlays = (args: {
  THREE: RenderSketchFreeBoxDimensionsArgs['THREE'];
  addDimensionLine: RenderSketchFreeBoxDimensionsArgs['addDimensionLine'];
  entries: SketchFreeBoxDimensionEntry[];
}) => {
  const groups = groupSketchFreeBoxDimensionEntries(args.entries);
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group || !group.length) continue;
    if (group.length === 1) {
      const single = group[0];
      renderSketchFreeBoxDimensions({
        THREE: args.THREE,
        addDimensionLine: args.addDimensionLine,
        centerX: single.centerX,
        centerY: single.centerY,
        centerZ: single.centerZ,
        width: single.width,
        height: single.height,
        depth: single.depth,
      });
      continue;
    }
    renderSketchFreeBoxDimensionGroup({
      THREE: args.THREE,
      addDimensionLine: args.addDimensionLine,
      entries: group,
    });
  }
};
