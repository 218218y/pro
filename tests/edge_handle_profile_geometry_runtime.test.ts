import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDoorEdgeHandleProfile,
  createDrawerEdgeHandleProfile,
} from '../esm/native/builder/edge_handle_profile.ts';

type AnyRecord = Record<string, any>;

function createThreeHarness() {
  class Group {
    children: AnyRecord[] = [];
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };
    rotation = { x: 0, y: 0, z: 0 };
    userData: AnyRecord = {};
    add(child: AnyRecord) {
      this.children.push(child);
      child.parent = this;
    }
  }

  class BoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  }

  class Mesh {
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };
    rotation = { x: 0, y: 0, z: 0 };
    userData: AnyRecord = {};
    parent: AnyRecord | null = null;
    constructor(
      public geometry: BoxGeometry,
      public material: AnyRecord
    ) {}
  }

  return { Group, BoxGeometry, Mesh };
}

test('edge handle profile builds a door return shape that slopes outward and turns back toward the door center', () => {
  const THREE = createThreeHarness() as any;
  const profile = createDoorEdgeHandleProfile({
    THREE,
    material: { kind: 'edge-mat' },
    length: 0.4,
    anchorX: 0.302,
    isLeftHinge: true,
  }) as AnyRecord;

  assert.equal(profile.position.x, 0.302);
  assert.equal(profile.children.length, 3);

  const [mount, grip, bridge] = profile.children;
  assert.equal(mount.position.x, 0);
  assert.ok(grip.position.x < 0, 'left-hinge grip should turn back toward the door center');
  assert.ok(grip.position.z > mount.position.z, 'grip should sit farther out from the door face');
  assert.ok(Math.abs(bridge.rotation.y) > 0.1, 'bridge should be sloped, not flat');
  assert.equal(mount.userData.__keepMaterial, true);
  assert.equal(grip.userData.__keepMaterial, true);
  assert.equal(bridge.userData.__keepMaterial, true);
});

test('edge handle profile builds a drawer return shape with a lowered grip and angled bridge', () => {
  const THREE = createThreeHarness() as any;
  const profile = createDrawerEdgeHandleProfile({
    THREE,
    material: { kind: 'edge-mat' },
    length: 0.2,
  }) as AnyRecord;

  assert.equal(profile.children.length, 3);
  const [mount, grip, bridge] = profile.children;

  assert.ok(grip.position.y < mount.position.y, 'drawer grip should drop below the mounting lip');
  assert.ok(grip.position.z > mount.position.z, 'drawer grip should project farther outward');
  assert.ok(bridge.rotation.x > 0.1, 'drawer bridge should be angled');
  assert.equal(mount.geometry.width, 0.2);
  assert.equal(grip.geometry.width, 0.2);
  assert.equal(bridge.geometry.width, 0.2);
});
