import type { AppContainer } from '../../../types';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { readRootState } from '../runtime/root_state_access.js';
import type {
  SketchBoxDoorTarget,
  SketchBoxPatchTarget,
} from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import { asRecord, readStringRecord } from './canvas_picking_toggle_flow_shared.js';

export function parseSketchBoxPartId(partId: string): SketchBoxDoorTarget | null {
  const pid = String(partId || '');
  let match =
    /^sketch_box_free_(.+)_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[2]) {
    return {
      moduleKey: match[1] ? String(match[1]) : null,
      boxId: String(match[2]),
      doorId: match[3] ? String(match[3]) : null,
    };
  }

  match =
    /^sketch_box_(.+)_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[2]) {
    return {
      moduleKey: match[1] ? String(match[1]) : null,
      boxId: String(match[2]),
      doorId: match[3] ? String(match[3]) : null,
    };
  }

  match =
    /^sketch_box_free_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1])
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };

  match =
    /^sketch_box_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1])
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };

  const base = pid.replace(
    /_(?:door(?:_(?:handle|panel|left|right|top|bottom|edge_left|edge_right|edge_top|edge_bottom))?)$/,
    ''
  );
  match = /^sketch_box_free_(.+)_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[2])
    return { moduleKey: match[1] ? String(match[1]) : null, boxId: String(match[2]), doorId: null };

  match = /^sketch_box_(.+)_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[2])
    return { moduleKey: match[1] ? String(match[1]) : null, boxId: String(match[2]), doorId: null };

  match = /^sketch_box_free_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[1]) return { moduleKey: null, boxId: String(match[1]), doorId: null };

  match = /^sketch_box_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[1]) return { moduleKey: null, boxId: String(match[1]), doorId: null };

  return null;
}

export function resolveSketchBoxPatchTargets(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): SketchBoxPatchTarget[] {
  if (!target?.boxId) return [];
  const orderedStacks: Array<'top' | 'bottom'> =
    preferredStack === 'bottom'
      ? ['bottom', 'top']
      : preferredStack === 'top'
        ? ['top', 'bottom']
        : ['top', 'bottom'];
  const out: SketchBoxPatchTarget[] = [];
  const seen = new Set<string>();

  const pushCandidate = (stack: 'top' | 'bottom', moduleKey: unknown) => {
    if (moduleKey == null || moduleKey === '') return;
    const key = `${stack}::${String(moduleKey)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ stack, moduleKey: String(moduleKey) });
  };

  if (target.moduleKey) {
    for (const stack of orderedStacks) pushCandidate(stack, target.moduleKey);
    return out;
  }

  const state = asRecord(readRootState(App));
  for (const stack of orderedStacks) {
    const bucketKey = stack === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const modules = Array.isArray(state?.[bucketKey]) ? state[bucketKey] : [];
    for (let i = 0; i < modules.length; i++) {
      const cfgRec = asRecord(modules[i]);
      const extra = asRecord(cfgRec?.sketchExtras);
      const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : [];
      const found = boxes.some(box => {
        const rec = asRecord(box);
        return !!rec && rec.id != null && String(rec.id) === target.boxId;
      });
      if (found) pushCandidate(stack, i);
    }
  }

  return out;
}

export function resolveSketchBoxToggleTarget(
  primaryHitObject: HitObjectLike | null,
  foundPartId: string | null,
  foundModuleIndex?: string | number | null
): SketchBoxDoorTarget | null {
  let cur = primaryHitObject;
  while (cur) {
    const userData = asRecord(cur.userData);
    const boxId = readStringRecord(userData, '__wpSketchBoxId');
    if (boxId) {
      const moduleKey =
        readStringRecord(userData, '__wpSketchModuleKey') ||
        (foundModuleIndex != null ? String(foundModuleIndex) : null);
      const doorId = readStringRecord(userData, '__wpSketchBoxDoorId');
      return { moduleKey, boxId, doorId };
    }

    const pid = readStringRecord(userData, 'partId');
    if (pid) {
      const parsed = parseSketchBoxPartId(pid);
      if (parsed) {
        return {
          moduleKey: parsed.moduleKey || (foundModuleIndex != null ? String(foundModuleIndex) : null),
          boxId: parsed.boxId,
          doorId: parsed.doorId || null,
        };
      }
    }
    cur = cur.parent || null;
  }

  if (foundPartId) {
    const parsed = parseSketchBoxPartId(foundPartId);
    if (parsed) {
      return {
        moduleKey: parsed.moduleKey || (foundModuleIndex != null ? String(foundModuleIndex) : null),
        boxId: parsed.boxId,
        doorId: parsed.doorId || null,
      };
    }
  }

  return null;
}
