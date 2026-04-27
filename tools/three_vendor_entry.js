// @ts-nocheck
/**
 * Three.js Vendor Bundle Entry (WardrobePro) — TRUE tree-shaking
 *
 * The previous "vendor" approach still pulled in the full `libs/three/build/three.module.js`
 * because Three's example modules (OrbitControls/RoundedBoxGeometry) import from
 * `../../../build/three.module.js`.
 *
 * To enable real tree-shaking, we:
 *  1) Import ONLY the specific Three modules we actually use (from `three/src/**`).
 *  2) Use patched local copies of OrbitControls & RoundedBoxGeometry that import from
 *     `three/src/**` as well (no build/three.module.js).
 *
 * Output is produced by: tools/wp_three_vendor.js
 */

// Core math / types
import { Vector2 } from 'three/src/math/Vector2.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { Color } from 'three/src/math/Color.js';
import { Matrix4 } from 'three/src/math/Matrix4.js';
import { Quaternion } from 'three/src/math/Quaternion.js';
import { Box3 } from 'three/src/math/Box3.js';

// Core / scene graph
import { Scene } from 'three/src/scenes/Scene.js';
import { Group } from 'three/src/objects/Group.js';
import { Mesh } from 'three/src/objects/Mesh.js';
import { Line } from 'three/src/objects/Line.js';
import { LineSegments } from 'three/src/objects/LineSegments.js';
import { Sprite } from 'three/src/objects/Sprite.js';

// Cameras / raycasting
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { CubeCamera } from 'three/src/cameras/CubeCamera.js';
import { Raycaster } from 'three/src/core/Raycaster.js';

// Render targets / renderer
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js';
import { WebGLCubeRenderTarget } from 'three/src/renderers/WebGLCubeRenderTarget.js';

// Materials
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial.js';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js';
import { LineBasicMaterial } from 'three/src/materials/LineBasicMaterial.js';
import { SpriteMaterial } from 'three/src/materials/SpriteMaterial.js';

// Textures
import { Texture } from 'three/src/textures/Texture.js';
import { CanvasTexture } from 'three/src/textures/CanvasTexture.js';

// Geometries
import { BoxGeometry } from 'three/src/geometries/BoxGeometry.js';
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry.js';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry.js';
import { TorusGeometry } from 'three/src/geometries/TorusGeometry.js';
import { CylinderGeometry } from 'three/src/geometries/CylinderGeometry.js';
import { EdgesGeometry } from 'three/src/geometries/EdgesGeometry.js';
import { ExtrudeGeometry } from 'three/src/geometries/ExtrudeGeometry.js';

// Lights
import { AmbientLight } from 'three/src/lights/AmbientLight.js';
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js';

// Shapes
import { Shape } from 'three/src/extras/core/Shape.js';
import { Path } from 'three/src/extras/core/Path.js';
import { ShapeGeometry } from 'three/src/geometries/ShapeGeometry.js';

// Constants
import {
  BackSide,
  DoubleSide,
  FrontSide,
  NeutralToneMapping,
  LinearFilter,
  PCFShadowMap,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three/src/constants.js';

// Geometry base
import { BufferGeometry } from 'three/src/core/BufferGeometry.js';

// Patched addons (tree-shake friendly)
import { OrbitControls } from './three_addons/OrbitControls.js';
import { RoundedBoxGeometry } from './three_addons/RoundedBoxGeometry.js';

// NOTE:
// We intentionally export a few renderer/color-management constants.
// Some app code checks for their presence (e.g. toneMapping selection),
// so omitting them in the vendor bundle causes release visuals to differ
// from dev/dist (which may load the full three.module.js namespace).

export const THREE = {
  // Core math / types
  Vector2,
  Vector3,
  Color,
  Matrix4,
  Quaternion,
  Box3,

  // Scene graph
  Scene,
  Group,
  Mesh,
  Line,
  LineSegments,
  Sprite,

  // Cameras / raycasting
  PerspectiveCamera,
  CubeCamera,
  Raycaster,

  // Renderer / targets
  WebGLRenderer,
  WebGLCubeRenderTarget,

  // Materials
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  SpriteMaterial,

  // Textures
  Texture,
  CanvasTexture,

  // Geometries
  BufferGeometry,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,

  // Lights
  AmbientLight,
  DirectionalLight,

  // Shapes
  Shape,
  Path,
  ShapeGeometry,

  // Constants
  BackSide,
  DoubleSide,
  FrontSide,
  RepeatWrapping,
  LinearFilter,
  RGBAFormat,
  // Shadow mapping constant used by renderer setup.
  PCFShadowMap,

  // Tone mapping
  NeutralToneMapping,

  // Extras
  OrbitControls,
  RoundedBoxGeometry,

  // Color management
  SRGBColorSpace,
};

export default {
  THREE,
};
