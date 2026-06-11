import type { ThreeLike } from '../../../types';
import type {
  GetMaterialFn,
  SlidingRailLike,
  SlidingTrackPalette,
  SlidingUiState,
} from './render_door_ops_shared_contracts.js';
import { readCloneableMaterial } from './render_door_ops_shared_core.js';

export function createSlidingTrackPalette(uiState: SlidingUiState): SlidingTrackPalette {
  const isBlackSlidingTracks = uiState.slidingTracksColor === 'black';
  return isBlackSlidingTracks
    ? {
        hex: 0x333333,
        lineHex: 0x000000,
        metalness: 0.35,
        roughness: 0.55,
        emissiveHex: 0x000000,
        emissiveIntensity: 0,
      }
    : {
        hex: 0xe5e9ef,
        lineHex: 0x7f8792,
        metalness: 0.28,
        roughness: 0.2,
        emissiveHex: 0x20242b,
        emissiveIntensity: 0.16,
      };
}

export function createRailMaterial(
  THREE: ThreeLike,
  palette: SlidingTrackPalette,
  getMaterial: GetMaterialFn | null,
  uiState: SlidingUiState
): unknown {
  let railMat = getMaterial ? getMaterial(null, 'metal') : null;
  const cloneableRailMat = readCloneableMaterial(railMat);
  if (cloneableRailMat && typeof cloneableRailMat.clone === 'function') {
    const nextRailMat = cloneableRailMat.clone();
    nextRailMat.color?.setHex?.(palette.hex);
    if (typeof nextRailMat.metalness === 'number') nextRailMat.metalness = palette.metalness;
    if (typeof nextRailMat.roughness === 'number') nextRailMat.roughness = palette.roughness;
    if (typeof nextRailMat.envMapIntensity === 'number' && uiState.slidingTracksColor !== 'black') {
      nextRailMat.envMapIntensity = 1.15;
    }
    nextRailMat.emissive?.setHex?.(palette.emissiveHex);
    if (typeof nextRailMat.emissiveIntensity === 'number') {
      nextRailMat.emissiveIntensity = palette.emissiveIntensity;
    }
    return nextRailMat;
  }

  return new THREE.MeshStandardMaterial({
    color: palette.hex,
    metalness: palette.metalness,
    roughness: palette.roughness,
    emissive: palette.emissiveHex,
    emissiveIntensity: palette.emissiveIntensity,
  });
}

export function buildRailGroup(
  THREE: ThreeLike,
  rail: SlidingRailLike,
  railMat: unknown,
  palette: SlidingTrackPalette
) {
  const railGroup = new THREE.Group();
  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(rail.width, rail.height, rail.depth), railMat);
  railGroup.add(railMesh);

  const railLineGeo = new THREE.BoxGeometry(rail.width, 0.002, 0.005);
  const railLineMat = new THREE.MeshBasicMaterial({ color: palette.lineHex });

  const innerLine = new THREE.Mesh(railLineGeo, railLineMat);
  innerLine.position.set(0, rail.lineOffsetY, -rail.lineOffsetZ);
  railGroup.add(innerLine);

  const outerLine = new THREE.Mesh(railLineGeo, railLineMat);
  outerLine.position.set(0, rail.lineOffsetY, rail.lineOffsetZ);
  railGroup.add(outerLine);

  return railGroup;
}
