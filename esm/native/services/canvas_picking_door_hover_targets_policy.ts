import type { AppContainer, UnknownRecord } from '../../../types';
import { readRootState } from '../runtime/root_state_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type { TransformNodeLike } from './canvas_picking_door_hover_targets_contracts.js';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { __asObject } from './canvas_picking_door_hover_targets_runtime.js';

export function __scopeCornerHoverPartKey(partId: unknown, stackKey: unknown): string {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return '';
  if (stackKey !== 'bottom') return pid;
  if (pid.startsWith('lower_')) return pid;
  if (pid.startsWith('sliding') || pid.startsWith('slide')) return `lower_${pid}`;
  if (pid.startsWith('corner_')) return `lower_${pid}`;
  return pid;
}

function __isSlidingDoorHoverGroup(group: HitObjectLike | null, userData: UnknownRecord | null): boolean {
  if (userData) {
    const doorType = typeof userData.__doorType === 'string' ? String(userData.__doorType) : '';
    if (doorType === 'sliding') return true;
    if (userData.__doorPivotCentered === true) return true;
    const partId = typeof userData.partId === 'string' ? String(userData.partId) : '';
    if (partId.indexOf('sliding') !== -1) return true;
  }

  const groupRec = __asObject<UnknownRecord>(group);
  const groupUserData = groupRec ? __asObject<UnknownRecord>(groupRec.userData) : null;
  const groupPartId =
    groupUserData && typeof groupUserData.partId === 'string' ? String(groupUserData.partId) : '';
  return groupPartId.indexOf('sliding') !== -1;
}

function __isDrawerHoverGroup(group: HitObjectLike | null, userData: UnknownRecord | null): boolean {
  const candidates: UnknownRecord[] = [];
  if (userData) candidates.push(userData);
  const groupRec = __asObject<UnknownRecord>(group);
  const groupUserData = groupRec ? __asObject<UnknownRecord>(groupRec.userData) : null;
  if (groupUserData && groupUserData !== userData) candidates.push(groupUserData);

  for (let i = 0; i < candidates.length; i += 1) {
    const ud = candidates[i];
    const wpType = typeof ud.__wpType === 'string' ? String(ud.__wpType) : '';
    if (wpType === 'extDrawer') return true;
    if (ud.__wpDrawerBox === true || ud.__wpSketchExtDrawer === true) return true;
    const partId = typeof ud.partId === 'string' ? String(ud.partId) : '';
    if (/drawer|_draw(?:_|$)/.test(partId)) return true;
  }
  return false;
}

function __readFiniteUserDataNumber(userData: UnknownRecord | null, key: string): number | null {
  const value = userData ? Number(userData[key]) : NaN;
  return Number.isFinite(value) ? value : null;
}

export function __getDoorHoverAnchorX(
  group: HitObjectLike | null,
  userData: UnknownRecord | null,
  width: number,
  hingeLeft: boolean
): number {
  if (__isSlidingDoorHoverGroup(group, userData)) return 0;
  if (__isDrawerHoverGroup(group, userData)) {
    return __readFiniteUserDataNumber(userData, '__wpFaceOffsetX') ?? 0;
  }
  return hingeLeft ? width / 2 : -width / 2;
}

export function __normalizePaintSelection(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? String(value) : null;
}

function __readHingeTargetDoorCount(App: AppContainer, hitDoorGroup: HitObjectLike): number | null {
  try {
    const groupRec = __asObject<TransformNodeLike>(hitDoorGroup);
    const userData = groupRec ? __asObject<UnknownRecord>(groupRec.userData) : null;
    if (!userData || userData.__wpSketchBoxDoor === true) return null;
    const rawModuleDoors = userData.__wpModuleDoors;
    const moduleDoors = typeof rawModuleDoors === 'number' ? rawModuleDoors : Number(rawModuleDoors);
    if (Number.isFinite(moduleDoors) && moduleDoors >= 1) return Math.max(1, Math.floor(moduleDoors));

    const rawModuleIndex = userData.moduleIndex;
    const moduleIndex = typeof rawModuleIndex === 'number' ? rawModuleIndex : Number(rawModuleIndex);
    if (!Number.isFinite(moduleIndex) || moduleIndex < 0) return null;

    const state = __asObject<UnknownRecord>(readRootState(App));
    const config = __asObject<UnknownRecord>(state?.config);
    if (!config) return null;

    const bucket =
      userData.__wpStack === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const list = readModulesConfigurationListFromConfigSnapshot(config, bucket);
    const cfgRef = __asObject<UnknownRecord>(list[Math.floor(moduleIndex)]);
    if (!cfgRef) return null;

    const rawDoors = typeof cfgRef.doors === 'number' ? cfgRef.doors : Number(cfgRef.doors);
    if (!Number.isFinite(rawDoors) || rawDoors < 1) return null;
    return Math.max(1, Math.floor(rawDoors));
  } catch {
    return null;
  }
}

export function __isSingleDoorHingeTarget(
  App: AppContainer,
  hitDoorPid: string,
  hitDoorGroup: HitObjectLike
): boolean {
  if (!/^d\d+(?:_|$)/.test(String(hitDoorPid || ''))) return false;
  const doorCount = __readHingeTargetDoorCount(App, hitDoorGroup);
  return doorCount === 1;
}
