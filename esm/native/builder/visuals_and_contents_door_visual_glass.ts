import { __asBufferAttribute } from './visuals_and_contents_shared.js';
import { appendProfileDoorFrame } from './visuals_and_contents_door_visual_profile_frame.js';
import { createTomDoorVisual } from './visuals_and_contents_door_visual_tom.js';
import { readMirrorPlacementRectMetadata } from './visuals_and_contents_door_visual_tagging.js';

import type { BuilderDoorVisualFrameStyle, Object3DLike, UnknownRecord } from '../../../types/index.js';
import type { GlassDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

type CenterPanelMetrics = {
  width: number;
  height: number;
  depth: number;
  centerZ: number;
  faceZ: number;
  node: Object3DLike;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeGlassFrameStyle(value: unknown): BuilderDoorVisualFrameStyle {
  const style = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (style === 'flat' || style === 'tom' || style === 'profile') return style;
  return 'profile';
}

function readBoxDimension(geometry: unknown, index: number, key: 'width' | 'height' | 'depth'): number {
  const rec = isRecord(geometry) ? geometry : null;
  const args = Array.isArray(rec?.args) ? rec.args : null;
  const argValue = typeof args?.[index] === 'number' ? Number(args[index]) : NaN;
  if (Number.isFinite(argValue) && argValue > 0) return argValue;

  const parameters = isRecord(rec?.parameters) ? rec.parameters : null;
  const parameterValue = typeof parameters?.[key] === 'number' ? Number(parameters[key]) : NaN;
  return Number.isFinite(parameterValue) && parameterValue > 0 ? parameterValue : NaN;
}

function findCenterPanelMetrics(
  visualGroup: Object3DLike,
  role: string,
  zSign: number
): CenterPanelMetrics | null {
  const stack = Array.isArray(visualGroup.children) ? [...visualGroup.children] : [];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    if (node.userData?.__doorVisualRole === role) {
      const geometry = (node as unknown as { geometry?: unknown }).geometry;
      const width = readBoxDimension(geometry, 0, 'width');
      const height = readBoxDimension(geometry, 1, 'height');
      const depth = readBoxDimension(geometry, 2, 'depth');
      if (
        Number.isFinite(width) &&
        width > 0 &&
        Number.isFinite(height) &&
        height > 0 &&
        Number.isFinite(depth) &&
        depth > 0
      ) {
        const centerZ = typeof node.position?.z === 'number' ? Number(node.position.z) : 0;
        return {
          width,
          height,
          depth,
          centerZ,
          faceZ: centerZ + (depth / 2) * zSign,
          node,
        };
      }
    }
    if (Array.isArray(node.children) && node.children.length) stack.push(...node.children);
  }
  return null;
}

function removeNode(parent: Object3DLike, node: Object3DLike): void {
  if (typeof parent.remove === 'function') {
    parent.remove(node);
    return;
  }
  if (Array.isArray(parent.children)) {
    const index = parent.children.indexOf(node);
    if (index >= 0) parent.children.splice(index, 1);
  }
}

function collectNodesByRolePrefix(visualGroup: Object3DLike, rolePrefix: string): Object3DLike[] {
  const matches: Object3DLike[] = [];
  const stack = Array.isArray(visualGroup.children) ? [...visualGroup.children] : [];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    const role =
      typeof node.userData?.__doorVisualRole === 'string' ? String(node.userData.__doorVisualRole) : '';
    if (role.startsWith(rolePrefix)) matches.push(node);
    if (Array.isArray(node.children) && node.children.length) stack.push(...node.children);
  }
  return matches;
}

function appendTomCenterSurround(
  args: GlassDoorVisualArgs,
  center: CenterPanelMetrics,
  openingW: number,
  openingH: number
): void {
  const { THREE, visualGroup, mat, addOutlines, tagDoorVisualPart } = args;
  const horizontalBand = Math.max(0, (center.height - openingH) / 2);
  const verticalBand = Math.max(0, (center.width - openingW) / 2);

  const appendStrip = (width: number, height: number, x: number, y: number, role: string) => {
    if (!(width > 0) || !(height > 0)) return;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width, height, center.depth), mat);
    strip.position.set(x, y, center.centerZ);
    tagDoorVisualPart(strip, role);
    addOutlines(strip);
    visualGroup.add(strip);
  };

  appendStrip(
    center.width,
    horizontalBand,
    0,
    openingH / 2 + horizontalBand / 2,
    'door_tom_center_surround_top'
  );
  appendStrip(
    center.width,
    horizontalBand,
    0,
    -(openingH / 2 + horizontalBand / 2),
    'door_tom_center_surround_bottom'
  );
  appendStrip(verticalBand, openingH, -(openingW / 2 + verticalBand / 2), 0, 'door_tom_center_surround_left');
  appendStrip(verticalBand, openingH, openingW / 2 + verticalBand / 2, 0, 'door_tom_center_surround_right');
}

function createGlassMaterial(args: GlassDoorVisualArgs) {
  const { THREE } = args;
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    roughness: 0.08,
    metalness: 0.0,
  });
  glassMat.depthWrite = false;
  glassMat.side = THREE.DoubleSide;
  try {
    glassMat.premultipliedAlpha = true;
  } catch {
    // ignore
  }
  return glassMat;
}

function appendGlassPane(args: GlassDoorVisualArgs, glassW: number, glassH: number, glassFaceZ: number) {
  const { THREE, visualGroup, tagDoorVisualPart, zSign } = args;
  const glassDepth = 0.005;
  const glassPane = new THREE.Mesh(
    new THREE.BoxGeometry(glassW, glassH, glassDepth),
    createGlassMaterial(args)
  );
  glassPane.userData = glassPane.userData || {};
  glassPane.userData.__keepMaterial = true;
  glassPane.renderOrder = 2;
  glassPane.position.set(0, 0, glassFaceZ - (glassDepth / 2) * zSign);
  tagDoorVisualPart(glassPane, 'door_glass_center_panel');
  visualGroup.add(glassPane);
  return { glassW, glassH, glassDepth, glassPane };
}

function appendCurtain(args: GlassDoorVisualArgs, glassW: number, glassH: number, glassPaneZ: number): void {
  const { THREE, visualGroup, tagDoorVisualPart, curtainType, forceCurtainFix, zSign } = args;
  if (!curtainType || curtainType === 'none') return;

  let curtainColor = 0xffffff;
  if (curtainType === 'pink') curtainColor = 0xfbcfe8;
  if (curtainType === 'purple') curtainColor = 0xe9d5ff;
  if (curtainType === 'white') curtainColor = 0xffffff;

  const curtainMat = new THREE.MeshStandardMaterial({
    color: curtainColor,
    roughness: 0.45,
    metalness: 0.0,
    side: THREE.DoubleSide,
    flatShading: false,
    transparent: true,
    opacity: 0.72,
  });
  curtainMat.depthWrite = false;
  try {
    curtainMat.premultipliedAlpha = true;
  } catch {
    // ignore
  }
  if (forceCurtainFix) {
    try {
      curtainMat.emissive = new THREE.Color(curtainColor);
      curtainMat.emissiveIntensity = 0.12;
    } catch {
      // ignore
    }
  }

  const curtainGeo = new THREE.PlaneGeometry(glassW, glassH, 256, 1);
  const posAttribute =
    curtainGeo.attributes && curtainGeo.attributes.position
      ? __asBufferAttribute(curtainGeo.attributes.position)
      : null;
  if (posAttribute) {
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const waveZ = 0.008 * Math.sin(x * 120);
      posAttribute.setZ(i, waveZ);
    }
  }
  curtainGeo.computeVertexNormals?.();
  const curtainMesh = new THREE.Mesh(curtainGeo, curtainMat);
  curtainMesh.userData = curtainMesh.userData || {};
  curtainMesh.userData.__keepMaterial = true;
  curtainMesh.renderOrder = 1;
  const curtainGap = forceCurtainFix ? 0.012 : 0.015;
  const curtainZ = glassPaneZ - (0.005 / 2 + curtainGap) * zSign;
  curtainMesh.position.set(0, 0, curtainZ);
  tagDoorVisualPart(curtainMesh, 'door_glass_curtain');
  visualGroup.add(curtainMesh);
}

function buildProfileGlass(args: GlassDoorVisualArgs): {
  glassW: number;
  glassH: number;
  glassPaneZ: number;
} {
  const layout = appendProfileDoorFrame({
    App: args.App,
    THREE: args.THREE,
    visualGroup: args.visualGroup,
    addOutlines: args.addOutlines,
    tagDoorVisualPart: args.tagDoorVisualPart,
    isSketch: args.isSketch,
    w: args.w,
    h: args.h,
    thickness: args.thickness,
    mat: args.mat,
    zSign: args.zSign,
  });
  const { glassW, glassH, glassPane } = appendGlassPane(
    args,
    layout.centerW,
    layout.centerH,
    layout.centerFaceZ
  );
  return { glassW, glassH, glassPaneZ: glassPane.position.z };
}

function buildTomGlass(args: GlassDoorVisualArgs): { glassW: number; glassH: number; glassPaneZ: number } {
  createTomDoorVisual({
    App: args.App,
    THREE: args.THREE,
    visualGroup: args.visualGroup,
    addOutlines: args.addOutlines,
    tagDoorVisualPart: args.tagDoorVisualPart,
    w: args.w,
    h: args.h,
    thickness: args.thickness,
    mat: args.mat,
    hasGrooves: false,
    groovePartId: null,
    isSketch: args.isSketch,
    zSign: args.zSign,
  });

  const accentNodes = collectNodesByRolePrefix(args.visualGroup, 'door_accent_');
  for (let i = 0; i < accentNodes.length; i += 1) {
    removeNode(args.visualGroup, accentNodes[i]!);
  }

  const center = findCenterPanelMetrics(args.visualGroup, 'door_tom_center_panel', args.zSign);
  if (!center) {
    const fallbackW = Math.max(0.02, args.w - 0.09);
    const fallbackH = Math.max(0.02, args.h - 0.09);
    const fallbackFaceZ =
      (args.thickness / 2 - Math.max(0.008, Math.min(0.014, args.thickness - 0.004))) * args.zSign;
    const { glassPane } = appendGlassPane(args, fallbackW, fallbackH, fallbackFaceZ);
    return { glassW: fallbackW, glassH: fallbackH, glassPaneZ: glassPane.position.z };
  }

  const openingRect = readMirrorPlacementRectMetadata(center.node);
  removeNode(args.visualGroup, center.node);

  const openingW = Math.max(
    0.02,
    Math.min(center.width, (openingRect?.maxX ?? center.width / 2) - (openingRect?.minX ?? -center.width / 2))
  );
  const openingH = Math.max(
    0.02,
    Math.min(
      center.height,
      (openingRect?.maxY ?? center.height / 2) - (openingRect?.minY ?? -center.height / 2)
    )
  );

  if (openingW < center.width || openingH < center.height) {
    appendTomCenterSurround(args, center, openingW, openingH);
  }

  const { glassW, glassH, glassPane } = appendGlassPane(args, openingW, openingH, center.faceZ);
  return { glassW, glassH, glassPaneZ: glassPane.position.z };
}

function buildFlatGlass(args: GlassDoorVisualArgs): { glassW: number; glassH: number; glassPaneZ: number } {
  const glassInset = Math.max(0.002, Math.min(0.006, Math.min(args.w, args.h) * 0.01));
  const glassW = Math.max(0.02, args.w - 2 * glassInset);
  const glassH = Math.max(0.02, args.h - 2 * glassInset);
  const faceZ = (args.thickness / 2) * args.zSign;
  const { glassPane } = appendGlassPane(args, glassW, glassH, faceZ);
  return { glassW, glassH, glassPaneZ: glassPane.position.z };
}

export function createGlassDoorVisual(args: GlassDoorVisualArgs) {
  const frameStyle = normalizeGlassFrameStyle(args.frameStyle);
  const layout =
    frameStyle === 'flat'
      ? buildFlatGlass(args)
      : frameStyle === 'tom'
        ? buildTomGlass(args)
        : buildProfileGlass(args);
  appendCurtain(args, layout.glassW, layout.glassH, layout.glassPaneZ);
  return args.visualGroup;
}
