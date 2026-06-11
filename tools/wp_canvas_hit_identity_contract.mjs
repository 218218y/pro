#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = {
  owner: 'esm/native/services/canvas_picking_hit_identity.ts',
  hoverContracts: 'esm/native/services/canvas_picking_door_hover_targets_contracts.ts',
  clickContracts: 'esm/native/services/canvas_picking_click_contracts.ts',
  hoverScan: 'esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts',
  preferredFace: 'esm/native/services/canvas_picking_door_hover_targets_preferred_face.ts',
  clickState: 'esm/native/services/canvas_picking_click_hit_flow_state.ts',
};

const errors = [];
function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    errors.push(`${file}: cannot read (${error?.message || error})`);
    return '';
  }
}

const owner = read(files.owner);
for (const pattern of [
  /export type CanvasPickingHitIdentity = \{/,
  /export function createCanvasPickingHitIdentity\(/,
  /export function mergeCanvasPickingHitIdentityUserData\(/,
  /export function normalizeCanvasPickingModuleStack\(/,
  /export function createCanvasPickingDoorHoverHitIdentity\(/,
  /export function createCanvasPickingClickHitIdentity\(/,
  /export function areCanvasPickingHitIdentitiesEquivalent\(/,
]) {
  if (!pattern.test(owner)) errors.push(`${files.owner}: missing ${pattern}`);
}
if (/\bas any\b/.test(owner)) errors.push(`${files.owner}: must not use as any`);
if (!/moduleIndex:\s*input\.moduleIndex \?\? fromUserData\.moduleIndex \?\? null/.test(owner)) {
  errors.push(
    `${files.owner}: canonical identity must read moduleIndex from userData when explicit input is absent`
  );
}
if (!/moduleStack:\s*input\.moduleStack \?\? fromUserData\.moduleStack \?\? null/.test(owner)) {
  errors.push(
    `${files.owner}: canonical identity must read moduleStack from userData when explicit input is absent`
  );
}
if (!/__wp_isDoorLikePartId/.test(owner) || !/__wp_isDrawerLikePartId/.test(owner)) {
  errors.push(`${files.owner}: target kind inference must use the canonical door/drawer policy`);
}
if (!/inferCanvasPickingFaceSideFromSign/.test(owner)) {
  errors.push(`${files.owner}: mirror faceSign hits must infer canonical faceSide`);
}
if (!/__wpSketchModuleKey/.test(owner) || !/__wpSketchBoxDoorId/.test(owner)) {
  errors.push(`${files.owner}: sketch pick metadata must feed canonical hit identity`);
}
if (!/function inferCanvasPickingSplitPart/.test(owner)) {
  errors.push(`${files.owner}: split-part suffixes must be normalized by the identity owner`);
}

for (const file of [files.hoverContracts, files.clickContracts]) {
  const source = read(file);
  if (!/CanvasPickingHitIdentity/.test(source))
    errors.push(`${file}: must expose hitIdentity on public hit contract`);
  if (!/hitIdentity\?: CanvasPickingHitIdentity \| null;/.test(source)) {
    errors.push(
      `${file}: hitIdentity field must stay explicit and optional for backwards-compatible fixtures`
    );
  }
}

for (const file of [files.hoverScan, files.preferredFace]) {
  const source = read(file);
  if (!/createCanvasPickingDoorHoverHitIdentity/.test(source)) {
    errors.push(`${file}: hover hit must be stamped with canonical hit identity`);
  }
  if (!/hitIdentity:\s*createCanvasPickingDoorHoverHitIdentity\(/.test(source)) {
    errors.push(`${file}: missing hitIdentity on returned DoorHoverHit`);
  }
}

const hoverScan = read(files.hoverScan);
if (!/mergeCanvasPickingHitIdentityUserData/.test(hoverScan)) {
  errors.push(
    `${files.hoverScan}: raycast hover hit identity must merge surface hit metadata with resolved part metadata`
  );
}

const clickState = read(files.clickState);
if (!/createCanvasPickingClickHitIdentity/.test(clickState)) {
  errors.push(`${files.clickState}: click hit finalization must create canonical hit identity`);
}
if (!/hitIdentity:\s*createCanvasPickingClickHitIdentity\(/.test(clickState)) {
  errors.push(`${files.clickState}: missing hitIdentity on finalized click hit state`);
}

if (errors.length) {
  console.error('[canvas-hit-identity-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[canvas-hit-identity-contract] ok');
