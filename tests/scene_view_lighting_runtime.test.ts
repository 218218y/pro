import test from 'node:test';
import assert from 'node:assert/strict';

import { readRendererCompatDefaults } from '../esm/native/runtime/render_access.ts';
import { applyViewMode } from '../esm/native/services/scene_view_lighting.ts';

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
        useLegacyLights: false,
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

test('scene view lighting keeps renderer compat defaults detached and restores them in sketch mode', () => {
  const { App, state, floor, smartFloor, renderCalls } = makeApp();

  applyViewMode(App as any, true);

  assert.equal(App.render.renderer.outputColorSpace, 'srgb');
  assert.equal(App.render.renderer.toneMapping, 'neutral');
  assert.equal(App.render.renderer.toneMappingExposure, 1.5);
  assert.equal(App.render.renderer.useLegacyLights, true);
  assert.deepEqual(readRendererCompatDefaults(App), {
    outputColorSpace: 'initialSpace',
    toneMapping: 'initialTone',
    toneMappingExposure: 0.75,
    useLegacyLights: false,
  });
  assert.equal(App.render.ambLightObj.intensity, 0.7);
  assert.equal(App.render.dirLightObj.intensity, 1.45);
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
  assert.equal(App.render.renderer.useLegacyLights, false);
  assert.equal(App.render.ambLightObj.intensity, 0.95);
  assert.equal(App.render.dirLightObj.visible, false);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, false);
  assert.equal(floor.visible, false);
  assert.equal(smartFloor.visible, false);
  assert.deepEqual(renderCalls, [false]);
});
