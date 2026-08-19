import { SKETCH_BOX_DIMENSION_RENDER_POLICY } from '../../shared/dimensions/sketch_box_dimension_overlay_policy.js';

import {
  groupSketchFreeBoxDimensionEntries,
  mergeSketchFreeBoxDimensionSpans,
} from './render_interior_sketch_layout_dimensions_grouping.js';
import {
  readSketchDimensionNumber,
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
  const width = readSketchDimensionNumber(args.width);
  const height = readSketchDimensionNumber(args.height);
  const depth = readSketchDimensionNumber(args.depth);
  const centerX = readSketchDimensionNumber(args.centerX);
  const centerY = readSketchDimensionNumber(args.centerY);
  const centerZ = readSketchDimensionNumber(args.centerZ);
  if (centerX == null || centerY == null || centerZ == null) return;
  if (width == null || height == null || depth == null || !(width > 0) || !(height > 0) || !(depth > 0))
    return;

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const widthLineY =
    centerY +
    halfH +
    overlayRange(
      height,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthLineYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthLineYOffsetHeightRatio
    );
  const widthTextOffset = new THREE.Vector3(
    0,
    overlayRange(
      height,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthTextYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthTextYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleWidthTextYOffsetHeightRatio
    ),
    0
  );

  const heightLineGap = overlayRange(
    width,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightLineGapMinM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightLineGapMaxM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightLineGapWidthRatio
  );
  const heightLineX = centerX + halfW + heightLineGap;
  const heightTextOffset = new THREE.Vector3(
    overlayRange(
      width,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightTextXOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightTextXOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleHeightTextXOffsetWidthRatio
    ),
    0,
    0
  );

  const depthLineGap = overlayRange(
    width,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineGapMinM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineGapMaxM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineGapWidthRatio
  );
  const depthLineX = centerX - halfW - depthLineGap;
  const depthLineY =
    centerY +
    overlayRange(
      height,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthLineYOffsetHeightRatio
    );
  const depthTextOffset = new THREE.Vector3(
    -overlayRange(
      width,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthTextXOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthTextXOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.singleDepthTextXOffsetWidthRatio
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
  const textScale = SKETCH_BOX_DIMENSION_RENDER_POLICY.textScale;

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
  const textScale = SKETCH_BOX_DIMENSION_RENDER_POLICY.textScale;
  const widthLineY =
    maxTopY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthLineYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthLineYOffsetHeightRatio
    );
  const widthTextOffset = new THREE.Vector3(
    0,
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthTextYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthTextYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthTextYOffsetHeightRatio
    ),
    0
  );
  const widthSegmentsY =
    maxTopY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthSegmentsYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthSegmentsYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupWidthSegmentsYOffsetHeightRatio
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
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupSegmentTextYOffsetMinM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupSegmentTextYOffsetMaxM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupSegmentTextYOffsetHeightRatio
      ),
      0
    );
    for (const span of mergedWidthSpans) {
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
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightLineGapMinM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightLineGapMaxM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightLineGapWidthRatio
  );
  const heightLineX = maxX + heightLineGap;
  const heightTextOffset = new THREE.Vector3(
    overlayRange(
      totalWidth,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightTextXOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightTextXOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupHeightTextXOffsetWidthRatio
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
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightDeltaM &&
    mergedWidthSpans.length >= 2
  ) {
    const minHeightLineX =
      heightLineX -
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightLineXOffsetMinM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightLineXOffsetMaxM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightLineXOffsetWidthRatio
      );
    const minHeightTextOffset = new THREE.Vector3(
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightTextXOffsetMinM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightTextXOffsetMaxM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightTextXOffsetWidthRatio
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
      new THREE.Vector3(0, SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightLabelShiftYM, 0)
    );
  }

  const depthLineGap = overlayRange(
    totalWidth,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineGapMinM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineGapMaxM,
    SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineGapWidthRatio
  );
  const depthLineX = minX - depthLineGap;
  const depthLineY =
    minBottomY +
    overlayRange(
      totalHeight,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineYOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineYOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthLineYOffsetHeightRatio
    );
  const depthTextOffset = new THREE.Vector3(
    -overlayRange(
      totalWidth,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthTextXOffsetMinM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthTextXOffsetMaxM,
      SKETCH_BOX_DIMENSION_RENDER_POLICY.groupDepthTextXOffsetWidthRatio
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
  if (roundedMaxEntryDepth - roundedMinEntryDepth >= SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthDeltaM) {
    const minDepthLineX =
      depthLineX +
      overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineXOffsetMinM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineXOffsetMaxM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineXOffsetWidthRatio
      );
    const minDepthTextOffset = new THREE.Vector3(
      -overlayRange(
        totalWidth,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthTextXOffsetMinM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthTextXOffsetMaxM,
        SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthTextXOffsetWidthRatio
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
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetMinM,
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetMaxM,
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetHeightRatio
          ),
        minBackZ + minEntryDepth
      ),
      new THREE.Vector3(
        minDepthLineX,
        depthLineY -
          overlayRange(
            totalHeight,
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetMinM,
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetMaxM,
            SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinDepthLineYOffsetHeightRatio
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
  for (const group of groups) {
    if (!group.length) continue;
    if (group.length === 1) {
      const single = group[0];
      if (!single) continue;
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
