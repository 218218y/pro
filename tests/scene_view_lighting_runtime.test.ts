import test from 'node:test';
import assert from 'node:assert/strict';

import { readRendererLightingDefaults } from '../esm/native/runtime/render_access.ts';
import { applyViewMode } from '../esm/native/services/scene_view_lighting.ts';
import { initLights } from '../esm/native/services/scene_view_lighting_runtime.ts';
import { LIGHT_PRESETS } from '../esm/native/ui/react/tabs/settings_visual_shared_lighting.ts';
import {
  NORMAL_AMBIENT_DEFAULT,
  NORMAL_DIR_DEFAULT,
  NORMAL_EXPOSURE,
  SKETCH_AMBIENT_DEFAULT,
} from '../esm/native/services/scene_view_lighting_shared.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { VIEWPORT_DIRECTIONAL_SHADOW_PRESET } from '../esm/shared/visual_lighting_tokens.ts';

type AnyRecord = Record<string, unknown>;

function makeStore(state: AnyRecord) {
  return {
    getState: () => state,
  };
}

function makeApp() {
  const floor = { visible: true };
  const smartFloor = { visible: true };
  const roomGroup = {
    getObjectByName(name: string) {
      return name === 'smartFloor' ? smartFloor : null;
    },
  };
  const scene = {
    getObjectByName(name: string) {
      if (name === 'floor') return floor;
      if (name === 'smartFloor') return smartFloor;
      if (name === 'App.render.roomGroup') return roomGroup;
      return null;
    },
  };
  const state = {
    ui: {
      lightingControl: false,
      lightAmb: '0.8',
      lightDir: '1.7',
      lightX: '7',
      lightY: '9',
      lightZ: '10',
      cornerMode: true,
      cornerSide: 'right',
      raw: {},
    },
    runtime: { sketchMode: false },
    config: {},
    mode: {},
    meta: {},
  } satisfies AnyRecord;
  const renderCalls: boolean[] = [];
  const App: AnyRecord = {
    store: makeStore(state),
    deps: {
      THREE: {
        AmbientLight: function AmbientLight(this: AnyRecord, _color?: number, intensity?: number) {
          this.intensity = intensity ?? 0;
        },
        DirectionalLight: function DirectionalLight(this: AnyRecord, _color?: number, intensity?: number) {
          this.intensity = intensity ?? 0;
          this.position = {
            x: 0,
            y: 0,
            z: 0,
            set(x: number, y: number, z: number) {
              this.x = x;
              this.y = y;
              this.z = z;
            },
          };
        },
        SRGBColorSpace: 'srgb',
        NeutralToneMapping: 'neutral',
      },
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(!!updateShadows);
      },
    },
    render: {
      scene,
      roomGroup,
      renderer: {
        outputColorSpace: 'initialSpace',
        toneMapping: 'initialTone',
        toneMappingExposure: 0.75,
        shadowMap: { autoUpdate: false, needsUpdate: false },
      },
      ambLightObj: { intensity: 0 },
      dirLightObj: {
        intensity: 0,
        visible: true,
        castShadow: false,
        position: {
          x: 0,
          y: 0,
          z: 0,
          set(x: number, y: number, z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
      },
    },
  };
  return { App, state, floor, smartFloor, renderCalls };
}

test('scene view initializes cabinet-scale directional shadows with contact-safe bias', () => {
  class LightBase {
    name = '';
    intensity: number;
    position = {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
    constructor(_color?: number, intensity = 0) {
      this.intensity = intensity;
    }
  }
  class AmbientLight extends LightBase {}
  class DirectionalLight extends LightBase {
    castShadow = false;
    shadow = {
      mapSize: { width: 0, height: 0 },
      camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      bias: 0,
      normalBias: 0,
      radius: 0,
    };
  }

  const added: unknown[] = [];
  const App: AnyRecord = {
    deps: { THREE: { AmbientLight, DirectionalLight } },
    render: {
      scene: {
        add(node: unknown) {
          added.push(node);
        },
      },
      ambLightObj: null,
      dirLightObj: null,
    },
  };

  initLights(App as any);

  const directional = App.render.dirLightObj as AnyRecord;
  const preset = VIEWPORT_DIRECTIONAL_SHADOW_PRESET;
  assert.equal(added.length, 2);
  assert.equal(directional.castShadow, true);
  assert.equal(directional.shadow.mapSize.width, preset.mapSize);
  assert.equal(directional.shadow.mapSize.height, preset.mapSize);
  assert.equal(directional.shadow.camera.left, -preset.cameraHalfExtent);
  assert.equal(directional.shadow.camera.right, preset.cameraHalfExtent);
  assert.equal(directional.shadow.camera.top, preset.cameraHalfExtent);
  assert.equal(directional.shadow.camera.bottom, -preset.cameraHalfExtent);
  assert.equal(directional.shadow.bias, preset.bias);
  assert.equal(directional.shadow.normalBias, preset.normalBias);
  assert.equal(directional.shadow.radius, preset.radius);

  const projectedTexelMeters = (preset.cameraHalfExtent * 2) / preset.mapSize;
  assert.ok(projectedTexelMeters < 0.007, `expected <7 mm/texel, got ${projectedTexelMeters} m`);

  const normalizedDepthRangeMeters = preset.cameraFar - preset.cameraNear;
  const depthBiasWorldMeters = Math.abs(preset.bias) * normalizedDepthRangeMeters;
  const worstCaseContactOffsetMeters = depthBiasWorldMeters + Math.abs(preset.normalBias);
  const boardThicknessMeters = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  assert.ok(
    worstCaseContactOffsetMeters < boardThicknessMeters * 0.1,
    `shadow bias must stay below 10% of board thickness; got ${worstCaseContactOffsetMeters} m`
  );
  assert.ok(
    Math.abs(preset.normalBias) < boardThicknessMeters * 0.05,
    `normalBias must stay well below board thickness; got ${preset.normalBias} m`
  );
  assert.ok(preset.radius <= 1, `contact-shadow filter radius must stay <=1 texel, got ${preset.radius}`);
});

test('scene view normal lighting matches the default advanced-lighting preset', () => {
  assert.equal(LIGHT_PRESETS.default.amb, NORMAL_AMBIENT_DEFAULT);
  assert.equal(LIGHT_PRESETS.default.dir, NORMAL_DIR_DEFAULT);
  assert.equal(LIGHT_PRESETS.default.x, 5);
  assert.equal(LIGHT_PRESETS.default.y, 8);
  assert.equal(LIGHT_PRESETS.default.z, 8);
});

test('scene view lighting keeps renderer lighting defaults detached and restores them in sketch mode', () => {
  const { App, state, floor, smartFloor, renderCalls } = makeApp();

  applyViewMode(App as any, true);

  assert.equal(App.render.renderer.outputColorSpace, 'srgb');
  assert.equal(App.render.renderer.toneMapping, 'neutral');
  assert.equal(App.render.renderer.toneMappingExposure, NORMAL_EXPOSURE);
  assert.deepEqual(readRendererLightingDefaults(App), {
    outputColorSpace: 'initialSpace',
    toneMapping: 'initialTone',
    toneMappingExposure: 0.75,
  });
  assert.equal(App.render.ambLightObj.intensity, NORMAL_AMBIENT_DEFAULT);
  assert.equal(App.render.dirLightObj.intensity, NORMAL_DIR_DEFAULT);
  assert.equal(App.render.dirLightObj.visible, true);
  assert.equal(App.render.dirLightObj.position.x, -5);
  assert.equal(App.render.dirLightObj.position.y, 8);
  assert.equal(App.render.dirLightObj.position.z, 8);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(floor.visible, true);
  assert.equal(smartFloor.visible, true);
  assert.deepEqual(renderCalls, [false]);

  renderCalls.length = 0;
  App.render.renderer.shadowMap.needsUpdate = false;
  state.runtime.sketchMode = true;
  applyViewMode(App as any, false);

  assert.equal(App.render.renderer.outputColorSpace, 'initialSpace');
  assert.equal(App.render.renderer.toneMapping, 'initialTone');
  assert.equal(App.render.renderer.toneMappingExposure, 0.75);
  assert.equal(App.render.ambLightObj.intensity, SKETCH_AMBIENT_DEFAULT);
  assert.equal(App.render.dirLightObj.visible, false);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, false);
  assert.equal(floor.visible, false);
  assert.equal(smartFloor.visible, false);
  assert.deepEqual(renderCalls, [false]);
});
