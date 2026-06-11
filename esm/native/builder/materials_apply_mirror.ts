import { getMirrorRenderTarget } from '../runtime/render_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { ensureBuilderService, getBuilderService } from '../runtime/builder_service_access.js';
import type { AppContainer } from '../../../types';
import {
  asObject,
  getMaterialsTHREE,
  reportMaterialsApplySoft,
  type MaterialsApplyService,
  type MaterialsCacheLike,
  type MirrorMaterialLike,
  type MirrorMaterialOpts,
} from './materials_apply_shared.js';

function readMirrorMaterial(value: unknown): MirrorMaterialLike | null {
  return asObject<MirrorMaterialLike>(value) || null;
}

function markKeepMaterial(material: MirrorMaterialLike | null | undefined): void {
  if (!material) return;
  material.userData = material.userData || {};
  material.userData.__keepMaterial = true;
}

export function getBuilderMirrorMaterial(App: AppContainer, opts?: MirrorMaterialOpts): unknown {
  const safeOpts: MirrorMaterialOpts = opts || {};
  const THREE = getMaterialsTHREE(App, safeOpts.THREE);
  if (!THREE) return null;

  try {
    if (readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) {
      const materials = getBuilderService(App)?.materials || null;
      if (materials && typeof materials.getMaterial === 'function') {
        return materials.getMaterial('#ffffff', 'front', false);
      }
      return null;
    }
  } catch (error) {
    reportMaterialsApplySoft(App, 'getMirrorMaterial.sketchMode', error);
  }

  const builder = ensureBuilderService(App, 'native/builder/materials_apply.mirrorCache');
  const materials = (builder.materials = asObject<MaterialsApplyService>(builder.materials) || {});
  const cache = (materials.__cache = asObject<MaterialsCacheLike>(materials.__cache) || {});

  if (!cache.realMirrorMat) {
    const target = getMirrorRenderTarget(App);
    const texture = target && target.texture ? target.texture : null;

    cache.realMirrorMat = readMirrorMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.01,
        envMap: texture,
        envMapIntensity: 1.0,
        side: THREE.FrontSide,
      })
    );
    if (!cache.realMirrorMat) return null;
    try {
      markKeepMaterial(cache.realMirrorMat);
    } catch (error) {
      reportMaterialsApplySoft(App, 'getMirrorMaterial.cacheKeepMaterialFlag', error);
    }
  }

  try {
    const nextTarget = getMirrorRenderTarget(App);
    const nextTexture = nextTarget && nextTarget.texture ? nextTarget.texture : null;
    if (nextTexture && cache.realMirrorMat.envMap !== nextTexture) {
      cache.realMirrorMat.envMap = nextTexture;
      cache.realMirrorMat.needsUpdate = true;
    }
  } catch (error) {
    reportMaterialsApplySoft(App, 'getMirrorMaterial.syncEnvMap', error);
  }

  return cache.realMirrorMat || null;
}
