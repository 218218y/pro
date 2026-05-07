import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import {
  groupSketchFreeBoxDimensionEntries,
  mergeSketchFreeBoxDimensionSpans,
} from './render_interior_sketch_layout_dimensions_grouping.js';
import {
  type RenderSketchFreeBoxDimensionGroupArgs,
  type RenderSketchFreeBoxDimensionsArgs,
  type SketchFreeBoxDimensionEntry,
} from './render_interior_sketch_layout_dimensions_shared.js';

const overlayClamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const overlayRange = (value: number, min: number, max: number, ratio: number): number =>
  overlayClamp(value * ratio, min, max);

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

  const widthLineY =
    centerY +
    halfH +
    overlayRange(
      height,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthLineYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthLineYOffsetHeightRatio
    );
  const widthTextOffset = new THREE.Vector3(
    0,
    overlayRange(
      height,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthTextYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthTextYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleWidthTextYOffsetHeightRatio
    ),
    0
  );

  const heightLineGap = overlayRange(
    width,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightLineGapMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightLineGapMaxM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightLineGapWidthRatio
  );
  const heightLineX = centerX + halfW + heightLineGap;
  const heightTextOffset = new THREE.Vector3(
    overlayRange(
      width,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightTextXOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightTextXOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleHeightTextXOffsetWidthRatio
    ),
    0,
    0
  );

  const depthLineGap = overlayRange(
    width,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineGapMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineGapMaxM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineGapWidthRatio
  );
  const depthLineX = centerX - halfW - depthLineGap;
  const depthLineY =
    centerY +
    overlayRange(
      height,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthLineYOffsetHeightRatio
    );
  const depthTextOffset = new THREE.Vector3(
    -overlayRange(
      width,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthTextXOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthTextXOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.singleDepthTextXOffsetWidthRatio
    ),
    0,
    0
  );

  const widthLeftX = centerX - halfW;
  const widthRightX = centerX + halfW;
  const heightBottomY = centerY - halfH;
  const heightTopY = centerY + halfH;
  const backZ = centerZ - halfD;
  const frontZ = centerZ + halfD;
  const textScale = SKETCH_BOX_DIMENSIONS.dimensionOverlay.textScale;

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
  const textScale = SKETCH_BOX_DIMENSIONS.dimensionOverlay.textScale;
  const widthLineY =
    maxTopY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthLineYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthLineYOffsetHeightRatio
    );
  const widthTextOffset = new THREE.Vector3(
    0,
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthTextYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthTextYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthTextYOffsetHeightRatio
    ),
    0
  );
  const widthSegmentsY =
    maxTopY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthSegmentsYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthSegmentsYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupWidthSegmentsYOffsetHeightRatio
    );

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
    const segmentTextOffset = new THREE.Vector3(
      0,
      overlayRange(
        totalHeight,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupSegmentTextYOffsetMinM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupSegmentTextYOffsetMaxM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupSegmentTextYOffsetHeightRatio
      ),
      0
    );
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

  const heightLineGap = overlayRange(
    totalWidth,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightLineGapMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightLineGapMaxM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightLineGapWidthRatio
  );
  const heightLineX = maxX + heightLineGap;
  const heightTextOffset = new THREE.Vector3(
    overlayRange(
      totalWidth,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightTextXOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightTextXOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupHeightTextXOffsetWidthRatio
    ),
    0,
    0
  );
  addDimensionLine(
    new THREE.Vector3(heightLineX, minBottomY, clusterCenterZ),
    new THREE.Vector3(heightLineX, maxTopY, clusterCenterZ),
    heightTextOffset,
    (totalHeight * 100).toFixed(0),
    textScale
  );

  const roundedMinEntryHeight = Math.round(minEntryHeight * 100) / 100;
  const roundedMaxEntryHeight = Math.round(maxEntryHeight * 100) / 100;
  if (
    roundedMaxEntryHeight - roundedMinEntryHeight >=
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightDeltaM &&
    mergedWidthSpans.length >= 2
  ) {
    const minHeightLineX =
      heightLineX -
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightLineXOffsetMinM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightLineXOffsetMaxM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightLineXOffsetWidthRatio
      );
    const minHeightTextOffset = new THREE.Vector3(
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightTextXOffsetMinM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightTextXOffsetMaxM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightTextXOffsetWidthRatio
      ),
      0,
      0
    );
    addDimensionLine(
      new THREE.Vector3(minHeightLineX, minBottomY, clusterCenterZ),
      new THREE.Vector3(minHeightLineX, minBottomY + minEntryHeight, clusterCenterZ),
      minHeightTextOffset,
      (minEntryHeight * 100).toFixed(0),
      textScale,
      new THREE.Vector3(0, SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinHeightLabelShiftYM, 0)
    );
  }

  const depthLineGap = overlayRange(
    totalWidth,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineGapMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineGapMaxM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineGapWidthRatio
  );
  const depthLineX = minX - depthLineGap;
  const depthLineY =
    minBottomY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineYOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthLineYOffsetHeightRatio
    );
  const depthTextOffset = new THREE.Vector3(
    -overlayRange(
      totalWidth,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthTextXOffsetMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthTextXOffsetMaxM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupDepthTextXOffsetWidthRatio
    ),
    0,
    0
  );
  addDimensionLine(
    new THREE.Vector3(depthLineX, depthLineY, maxFrontZ),
    new THREE.Vector3(depthLineX, depthLineY, minBackZ),
    depthTextOffset,
    (totalDepth * 100).toFixed(0),
    textScale
  );

  const roundedMinEntryDepth = Math.round(minEntryDepth * 100) / 100;
  const roundedMaxEntryDepth = Math.round(maxEntryDepth * 100) / 100;
  if (
    roundedMaxEntryDepth - roundedMinEntryDepth >=
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthDeltaM
  ) {
    const minDepthLineX =
      depthLineX +
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineXOffsetMinM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineXOffsetMaxM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineXOffsetWidthRatio
      );
    const minDepthTextOffset = new THREE.Vector3(
      -overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthTextXOffsetMinM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthTextXOffsetMaxM,
        SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthTextXOffsetWidthRatio
      ),
      0,
      0
    );
    addDimensionLine(
      new THREE.Vector3(
        minDepthLineX,
        depthLineY -
          overlayRange(
            totalHeight,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetMinM,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetMaxM,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetHeightRatio
          ),
        minBackZ + minEntryDepth
      ),
      new THREE.Vector3(
        minDepthLineX,
        depthLineY -
          overlayRange(
            totalHeight,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetMinM,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetMaxM,
            SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupMinDepthLineYOffsetHeightRatio
          ),
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
