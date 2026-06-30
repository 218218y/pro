import assert from 'node:assert/strict';
import test from 'node:test';

import { readFirstExisting } from './_read_src.js';

const source = readFirstExisting(['../esm/native/runtime/planar_reflector_runtime.ts'], import.meta.url);

test('planar reflector shader follows Three.js color pipeline with a mild neutral brightness boost', () => {
  assert.match(source, /const DEFAULT_REFLECTOR_COLOR = 0xa3a3a3;/);
  assert.match(source, /const DEFAULT_REFLECTOR_BRIGHTNESS = 1\.04;/);
  assert.match(source, /blendOverlay\(reflected\.rgb, color\) \* brightness/);
  assert.match(source, /#include <tonemapping_fragment>/);
  assert.match(source, /#include <colorspace_fragment>/);
  assert.match(source, /#include <dithering_fragment>/);
  assert.doesNotMatch(source, /const DEFAULT_REFLECTOR_COLOR = 0xdde8f0/);
  assert.doesNotMatch(source, /const DEFAULT_REFLECTOR_BRIGHTNESS = 1\.08/);
  assert.doesNotMatch(source, /const DEFAULT_REFLECTOR_BRIGHTNESS = 1\.0;/);
  assert.doesNotMatch(source, /reflected\.rgb \* color/);
});

test('planar reflector render target is anti-aliased and aspect-aware', () => {
  assert.match(source, /MIRROR_REFLECTOR_LONG_EDGE/);
  assert.match(source, /MIRROR_REFLECTOR_MIN_EDGE/);
  assert.match(source, /MIRROR_REFLECTOR_MULTISAMPLE/);
  assert.match(source, /samples: resolveReflectorMultisample\(App\)/);
  assert.match(source, /THREE\.HalfFloatType/);
  assert.match(source, /new THREE\.WebGLRenderTarget\(size\.width, size\.height, options\)/);
});

test('box mirrors use a real reflector plane instead of projecting on box side faces', () => {
  assert.match(source, /makeBoxReflectorSurfacePlane/);
  assert.match(source, /new THREE\.PlaneGeometry\(surfaceWidth, surfaceHeight\)/);
  assert.match(source, /__wpPlanarReflectorSurface = true/);
  assert.match(source, /MIRROR_REFLECTOR_SURFACE_GAP_M/);
  assert.match(source, /MIRROR_REFLECTOR_SURFACE_INSET_M/);
  assert.match(source, /DEFAULT_REFLECTOR_SURFACE_GAP_M = 0\.004/);
  assert.match(source, /DEFAULT_REFLECTOR_SURFACE_INSET_M = 0\.006/);
  assert.match(source, /normalSign: 1/);
  assert.match(source, /surfaceObject: surfaceInstall\.surfaceObject/);
  assert.match(source, /textureMatrix\.multiply, surface\.matrixWorld/);
});

test('non-box fallback still assigns reflector material only to the active mirror face', () => {
  assert.match(source, /readBoxGeometryParameters\(mirror\)/);
  assert.match(source, /readEdgeMaterial\(originalMaterial, material\)/);
  assert.match(source, /faceSign < 0 \? edgeMaterial : material/);
  assert.match(source, /faceSign < 0 \? material : edgeMaterial/);
});

test('planar reflector render pass preserves renderer state details used by official Reflector', () => {
  assert.match(source, /depthBuffer\?\.setMask/);
  assert.match(source, /rendererShadowMap\.autoUpdate = false/);
  assert.match(source, /xr\.enabled = false/);
  assert.match(source, /rendererState\?\.viewport/);
});

test('planar reflector plane avoids distant edge shimmer from depth fighting', () => {
  assert.match(source, /MIRROR_REFLECTOR_EDGE_FEATHER_UV/);
  assert.match(source, /smoothstep\(0\.0, max\(edgeFeather, 0\.0001\), edgeMask\)/);
  assert.match(source, /transparent: true/);
  assert.match(source, /depthWrite: false/);
  assert.match(source, /polygonOffset: true/);
  assert.match(source, /MIRROR_REFLECTOR_POLYGON_OFFSET_FACTOR/);
  assert.match(source, /MIRROR_REFLECTOR_POLYGON_OFFSET_UNITS/);
});

test('box reflector backing is stable and non-reflective behind the planar surface', () => {
  assert.match(source, /cloneStableMirrorBackingMaterial/);
  assert.match(source, /__wpPlanarReflectorBackingMaterial = true/);
  assert.match(source, /envMap' in material\) material\.envMap = null/);
  assert.match(source, /roughness' in material\) material\.roughness = 1/);
  assert.match(source, /writeStableBoxBackingMaterial\(THREE, mirror\)/);
});
