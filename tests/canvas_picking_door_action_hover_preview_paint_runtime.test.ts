import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMirrorLayoutFromHit,
  resolveMirrorPlacementInRect,
} from '../esm/native/features/door_authoring/api.ts';
import { tryHandleDoorPaintHoverPreview } from '../esm/native/services/canvas_picking_door_action_hover_preview_paint.ts';

class Vec3 {
  x = 0;
  y = 0;
  z = 0;

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class Quat {
  copy(_next: unknown) {
    return this;
  }
}

function createIdentityDoorOwner(userData: Record<string, unknown>) {
  return {
    userData,
    parent: null as unknown,
    worldToLocal(target: Vec3) {
      return target;
    },
    localToWorld(target: Vec3) {
      return target;
    },
    getWorldPosition(target: Vec3) {
      return target.set(0, 0, 0);
    },
    getWorldQuaternion(target: Quat) {
      return target;
    },
  };
}

type ClearanceMeasurement = {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  styleKey?: string;
};

function isHorizontalMeasurement(entry: ClearanceMeasurement): boolean {
  return Math.abs(entry.startY - entry.endY) <= 1e-9;
}

function isVerticalMeasurement(entry: ClearanceMeasurement): boolean {
  return Math.abs(entry.startX - entry.endX) <= 1e-9;
}

function assertMirrorCenterMeasurementStyles(
  previewArgs: Record<string, unknown>,
  expected: { widthCentered: boolean; heightCentered: boolean }
) {
  assert.equal(previewArgs.showCenterXGuide, false);
  assert.equal(previewArgs.showCenterYGuide, false);
  const measurements = previewArgs.clearanceMeasurements as ClearanceMeasurement[];
  assert.equal(Array.isArray(measurements), true);
  assert.equal(measurements.length, 4);

  const horizontal = measurements.filter(isHorizontalMeasurement);
  const vertical = measurements.filter(isVerticalMeasurement);
  assert.equal(horizontal.length, 2);
  assert.equal(vertical.length, 2);
  assert.ok(horizontal.every(entry => entry.styleKey === (expected.widthCentered ? 'center' : 'cell')));
  assert.ok(vertical.every(entry => entry.styleKey === (expected.heightCentered ? 'center' : 'cell')));
}

test('glass hover preview treats hex-cell diagonal panels as stationary special fronts', () => {
  const owner = createIdentityDoorOwner({
    partId: 'hex_cell_2_diag_left',
    __wpStationaryGlassPanel: true,
    __doorWidth: 0.52,
    __doorHeight: 1.8,
  });
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap() {
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'hex_cell_2_diag_left',
      hitDoorGroup: owner as never,
      hitPoint: null,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'hex_cell_2_diag_left',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: '__wp_glass_style__:flat',
    setSketchPreview: null,
    readUi: () => ({ curtainChoice: 'none' }) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'add');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [0.52, 1.8, 1]);
});

test('glass hover preview treats regular corner external drawers as special door fronts', () => {
  const owner = createIdentityDoorOwner({
    partId: 'corner_c0_draw_1',
    __doorWidth: 0.8,
    __doorHeight: 0.22,
  });
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap() {
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'corner_c0_draw_1',
      hitDoorGroup: owner as never,
      hitPoint: null,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'corner_c0_draw_1',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'glass',
    setSketchPreview: null,
    readUi: () => ({ curtainChoice: 'none' }) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'add');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [0.8, 0.22, 1]);
});

test('glass curtain hover uses current curtain UI state and shows remove material for the second click', () => {
  const owner = createIdentityDoorOwner({
    partId: 'd5_full',
    __doorWidth: 0.7,
    __doorHeight: 1.9,
  });
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap(name: string) {
          if (name === 'doorSpecialMap') return { d5_full: 'glass' };
          if (name === 'curtainMap') return { d5_full: 'white' };
          if (name === 'doorStyleMap') return { d5_full: 'profile' };
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd5_full',
      hitDoorGroup: owner as never,
      hitPoint: null,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'd5_full',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'glass',
    setSketchPreview: null,
    readUi: () => ({ currentCurtainChoice: 'white' }) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'remove');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [0.7, 1.9, 1]);
});

test('mirror and glass hover previews treat chest drawer fronts as special fronts', () => {
  for (const selection of ['mirror', '__wp_glass_style__:flat']) {
    const owner = createIdentityDoorOwner({
      partId: 'chest_drawer_0',
      __doorWidth: 0.8,
      __doorHeight: 0.24,
      __frontMaxZ: 0.24,
    });
    const marker: Record<string, unknown> = {
      visible: false,
      material: 'base',
      userData: {
        __matAdd: 'add',
        __matRemove: 'remove',
        __matGroove: 'groove',
        __matMirror: 'mirror',
      },
      position: {
        copy(_next: unknown) {
          return undefined;
        },
      },
      quaternion: {
        copy(_next: unknown) {
          return undefined;
        },
      },
      scale: {
        last: null as [number, number, number] | null,
        set(x: number, y: number, z: number) {
          this.last = [x, y, z];
        },
      },
    };

    const handled = tryHandleDoorPaintHoverPreview({
      App: {
        maps: {
          getMap() {
            return {};
          },
        },
      } as never,
      THREE: { Vector3: Vec3, Quaternion: Quat },
      hit: {
        hitDoorPid: 'chest_drawer_0',
        hitDoorGroup: owner as never,
        hitPoint: {
          x: 0,
          y: 0,
          z: 0.1,
          set() {
            return undefined;
          },
        } as never,
      },
      groupRec: owner as never,
      userData: owner.userData as never,
      wardrobeGroup: {
        worldToLocal(target: Vec3) {
          return target;
        },
      } as never,
      doorMarker: marker as never,
      markerUd: marker.userData as never,
      local: new Vec3() as never,
      localHit: new Vec3() as never,
      wq: new Quat() as never,
      zOff: 0.02,
      scopedHitDoorPid: 'chest_drawer_0',
      canonDoorPartKeyForMaps: (id: string) => id,
      normalizedPaintSelection: selection,
      setSketchPreview: null,
      readUi: () => ({ currentCurtainChoice: 'none' }) as never,
    });

    assert.equal(handled, true);
    assert.equal(marker.visible, true);
    const expectedScale = selection === 'mirror' ? [0.798, 0.238, 1] : [0.8, 0.24, 1];
    assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, expectedScale);
  }
});

test('paint hover on drawer handles uses the drawer front plane instead of the drawer group depth', () => {
  const owner = createIdentityDoorOwner({
    partId: 'chest_drawer_0',
    __doorWidth: 0.8,
    __doorHeight: 0.24,
    __frontMaxZ: 0.24,
  });
  let markerPosition: { x: number; y: number; z: number } | null = null;
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
    },
    position: {
      copy(next: { x: number; y: number; z: number }) {
        markerPosition = { x: next.x, y: next.y, z: next.z };
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap() {
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'chest_drawer_0',
      hitDoorGroup: owner as never,
      hitPoint: null,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'chest_drawer_0',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'oak',
    setSketchPreview: null,
    readUi: () => ({}) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'add');
  assert.ok(markerPosition);
  assert.ok(Math.abs(markerPosition!.z - 0.26) < 1e-9);
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [0.8, 0.24, 1]);
});

test('mirror remove hover uses the canonical size rect even when door bounds metadata differs', () => {
  const sizeRect = { minX: -0.5, maxX: 0.5, minY: -1, maxY: 1 };
  const layout = buildMirrorLayoutFromHit({
    rect: sizeRect,
    hitX: 0.45,
    hitY: 0,
    draft: { widthCm: 30, heightCm: 60 },
    faceSign: 1,
  });
  assert.ok(layout);

  const expectedPlacement = resolveMirrorPlacementInRect({ rect: sizeRect, layout });
  const owner = createIdentityDoorOwner({
    partId: 'd1_left',
    __doorWidth: 1,
    __doorHeight: 2,
    __doorRectMinX: -0.2,
    __doorRectMaxX: 0.2,
    __doorRectMinY: -1,
    __doorRectMaxY: 1,
  });
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      __matMirror: 'mirror',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap(name: string) {
          if (name === 'doorSpecialMap') return { d1_left: 'mirror' };
          if (name === 'mirrorLayoutMap') return { d1_left: [layout] };
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: owner as never,
      hitPoint: {
        x: 0.45,
        y: 0,
        z: 0.1,
        set() {
          return undefined;
        },
      } as never,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'd1_left',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'mirror',
    setSketchPreview: null,
    readUi: () => ({ currentMirrorDraftWidthCm: 30, currentMirrorDraftHeightCm: 60 }) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'remove');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [
    expectedPlacement.mirrorWidthM,
    expectedPlacement.mirrorHeightM,
    1,
  ]);
});

test('full-door mirror hover shows remove material for the canonical outside mirror stored without a layout entry', () => {
  const owner = createIdentityDoorOwner({
    partId: 'd5_full',
    __doorWidth: 1,
    __doorHeight: 2,
  });
  const expectedPlacement = resolveMirrorPlacementInRect({
    rect: { minX: -0.5, maxX: 0.5, minY: -1, maxY: 1 },
    layout: null,
  });
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      __matMirror: 'mirror',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap(name: string) {
          if (name === 'doorSpecialMap') return { d5_full: 'mirror' };
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd5_full',
      hitDoorGroup: owner as never,
      hitPoint: {
        x: 0,
        y: 0,
        z: 0.1,
        set() {
          return undefined;
        },
      } as never,
    },
    groupRec: owner as never,
    userData: owner.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'd5_full',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'mirror',
    setSketchPreview: null,
    readUi: () => ({}) as never,
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'remove');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [
    expectedPlacement.mirrorWidthM,
    expectedPlacement.mirrorHeightM,
    1,
  ]);
});

test('mirror hover preview prefers the styled wood-center metadata over the outer door slab even when the hit lands on the shifted mirror mesh', () => {
  const centerRect = { minX: -0.2, maxX: 0.2, minY: -0.5, maxY: 0.5 };
  const expectedLayout = buildMirrorLayoutFromHit({
    rect: centerRect,
    hitX: 0.18,
    hitY: 0.1,
    draft: { widthCm: 20, heightCm: 40 },
    faceSign: 1,
  });
  const expectedPlacement = resolveMirrorPlacementInRect({ rect: centerRect, layout: expectedLayout });
  const centerPanel = createIdentityDoorOwner({
    partId: 'd2_full',
    __doorVisualRole: 'door_profile_center_panel',
    __mirrorRectMinX: centerRect.minX,
    __mirrorRectMaxX: centerRect.maxX,
    __mirrorRectMinY: centerRect.minY,
    __mirrorRectMaxY: centerRect.maxY,
  });
  centerPanel.parent = createIdentityDoorOwner({
    partId: 'd2_full',
    __doorWidth: 1,
    __doorHeight: 2,
  });
  const shiftedMirrorMesh = {
    userData: {
      partId: 'd2_full',
      __doorVisualRole: 'door_mirror_center_panel',
      __wpMirrorSurface: true,
    },
    parent: centerPanel as never,
    worldToLocal(target: Vec3) {
      target.x -= 0.18;
      target.y -= 0.1;
      return target;
    },
  };
  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      __matMirror: 'mirror',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const previewCalls: Record<string, unknown>[] = [];
  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap() {
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd2_full',
      hitDoorGroup: shiftedMirrorMesh as never,
      hitPoint: {
        x: 0.18,
        y: 0.1,
        z: 0.1,
        set() {
          return undefined;
        },
      } as never,
    },
    groupRec: centerPanel.parent as never,
    userData: centerPanel.parent.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'd2_full',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'mirror',
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    readUi: () => ({ currentMirrorDraftWidthCm: 20, currentMirrorDraftHeightCm: 40 }) as never,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(Array.isArray(previewCalls[0].clearanceMeasurements), true);
  assert.equal((previewCalls[0].clearanceMeasurements as { label: string }[]).length, 3);
  assert.deepEqual(
    (previewCalls[0].clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['20 ס"מ', '40 ס"מ', '20 ס"מ']
  );
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'mirror');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [
    expectedPlacement.mirrorWidthM,
    expectedPlacement.mirrorHeightM,
    1,
  ]);
});

test('mirror by-size hover colors centered width and height measurement lines without side guides', () => {
  function run(hitX: number, hitY: number) {
    const owner = createIdentityDoorOwner({
      partId: 'd4_left',
      __doorWidth: 1,
      __doorHeight: 2,
    });
    const marker: Record<string, unknown> = {
      visible: false,
      material: 'base',
      userData: {
        __matAdd: 'add',
        __matRemove: 'remove',
        __matGroove: 'groove',
        __matMirror: 'mirror',
        __matCenter: 'center',
      },
      position: {
        copy(_next: unknown) {
          return undefined;
        },
      },
      quaternion: {
        copy(_next: unknown) {
          return undefined;
        },
      },
      scale: {
        set() {
          return undefined;
        },
      },
    };
    const previewCalls: Record<string, unknown>[] = [];
    const handled = tryHandleDoorPaintHoverPreview({
      App: {
        maps: {
          getMap() {
            return {};
          },
        },
      } as never,
      THREE: { Vector3: Vec3, Quaternion: Quat },
      hit: {
        hitDoorPid: 'd4_left',
        hitDoorGroup: owner as never,
        hitPoint: {
          x: hitX,
          y: hitY,
          z: 0.1,
          set() {
            return undefined;
          },
        } as never,
      },
      groupRec: owner as never,
      userData: owner.userData as never,
      wardrobeGroup: {
        worldToLocal(target: Vec3) {
          return target;
        },
      } as never,
      doorMarker: marker as never,
      markerUd: marker.userData as never,
      local: new Vec3() as never,
      localHit: new Vec3() as never,
      wq: new Quat() as never,
      zOff: 0.02,
      scopedHitDoorPid: 'd4_left',
      canonDoorPartKeyForMaps: (id: string) => id,
      normalizedPaintSelection: 'mirror',
      setSketchPreview(previewArgs: Record<string, unknown>) {
        previewCalls.push(previewArgs);
        return {};
      },
      readUi: () => ({ currentMirrorDraftWidthCm: 20, currentMirrorDraftHeightCm: 40 }) as never,
    });

    assert.equal(handled, true);
    assert.equal(previewCalls.length, 1);
    return previewCalls[0];
  }

  assertMirrorCenterMeasurementStyles(run(0, 0.6), {
    widthCentered: true,
    heightCentered: false,
  });
  assertMirrorCenterMeasurementStyles(run(0.2, 0), {
    widthCentered: false,
    heightCentered: true,
  });
  assertMirrorCenterMeasurementStyles(run(0, 0), {
    widthCentered: true,
    heightCentered: true,
  });
});

class OffsetDoorNode {
  parent: OffsetDoorNode | null = null;
  children: OffsetDoorNode[] = [];
  position: { x: number; y: number; z: number };

  userData: Record<string, unknown>;

  constructor(userData: Record<string, unknown>, position: { x?: number; y?: number; z?: number } = {}) {
    this.userData = userData;
    this.position = { x: position.x ?? 0, y: position.y ?? 0, z: position.z ?? 0 };
  }

  add(child: OffsetDoorNode) {
    child.parent = this;
    this.children.push(child);
  }

  private worldOffset() {
    let x = this.position.x;
    let y = this.position.y;
    let z = this.position.z;
    let current = this.parent;
    while (current) {
      x += current.position.x;
      y += current.position.y;
      z += current.position.z;
      current = current.parent;
    }
    return { x, y, z };
  }

  worldToLocal(target: Vec3) {
    const offset = this.worldOffset();
    target.x -= offset.x;
    target.y -= offset.y;
    target.z -= offset.z;
    return target;
  }

  localToWorld(target: Vec3) {
    const offset = this.worldOffset();
    target.x += offset.x;
    target.y += offset.y;
    target.z += offset.z;
    return target;
  }

  getWorldPosition(target: Vec3) {
    const offset = this.worldOffset();
    return target.set(offset.x, offset.y, offset.z);
  }

  getWorldQuaternion(target: Quat) {
    return target;
  }
}

test('mirror hover preview resolves profile center mirror owner under the door group so outside labels stay front-facing on recessed center panels', () => {
  const centerRect = { minX: -0.2, maxX: 0.2, minY: -0.5, maxY: 0.5 };
  const expectedLayout = buildMirrorLayoutFromHit({
    rect: centerRect,
    hitX: 0.1,
    hitY: 0,
    draft: { widthCm: 20, heightCm: 40 },
    faceSign: 1,
  });
  const expectedPlacement = resolveMirrorPlacementInRect({ rect: centerRect, layout: expectedLayout });

  const doorGroup = new OffsetDoorNode({
    partId: 'd3_full',
    __doorWidth: 1,
    __doorHeight: 2,
  });
  const visualGroup = new OffsetDoorNode({});
  const centerPanel = new OffsetDoorNode(
    {
      partId: 'd3_full',
      __doorVisualRole: 'door_profile_center_panel',
      __mirrorRectMinX: centerRect.minX,
      __mirrorRectMaxX: centerRect.maxX,
      __mirrorRectMinY: centerRect.minY,
      __mirrorRectMaxY: centerRect.maxY,
    },
    { z: -0.007 }
  );
  doorGroup.add(visualGroup);
  visualGroup.add(centerPanel);

  const marker: Record<string, unknown> = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      __matMirror: 'mirror',
    },
    position: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };

  const previewCalls: Record<string, unknown>[] = [];
  const handled = tryHandleDoorPaintHoverPreview({
    App: {
      maps: {
        getMap() {
          return {};
        },
      },
    } as never,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd3_full',
      hitDoorGroup: doorGroup as never,
      hitPoint: {
        x: 0.1,
        y: 0,
        z: -0.005,
        set() {
          return undefined;
        },
      } as never,
    },
    groupRec: doorGroup as never,
    userData: doorGroup.userData as never,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    } as never,
    doorMarker: marker as never,
    markerUd: marker.userData as never,
    local: new Vec3() as never,
    localHit: new Vec3() as never,
    wq: new Quat() as never,
    zOff: 0.02,
    scopedHitDoorPid: 'd3_full',
    canonDoorPartKeyForMaps: (id: string) => id,
    normalizedPaintSelection: 'mirror',
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    readUi: () => ({ currentMirrorDraftWidthCm: 20, currentMirrorDraftHeightCm: 40 }) as never,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].anchorParent, centerPanel);
  assert.equal(previewCalls[0].guideWidth, centerRect.maxX - centerRect.minX);
  assert.equal(Number(previewCalls[0].z) > 0, true);
  assert.equal(
    (previewCalls[0].clearanceMeasurements as { z?: number }[]).every(entry => Number(entry.z) > 0),
    true
  );
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [
    expectedPlacement.mirrorWidthM,
    expectedPlacement.mirrorHeightM,
    1,
  ]);
});
