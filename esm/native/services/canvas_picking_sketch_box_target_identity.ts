import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';

function stripSketchBoxDoorSegmentSuffix(partId: string): string {
  const pid = String(partId || '');
  const visualMatch = /_(?:accent|groove)_(?:top|bottom|left|right)$/i.exec(pid);
  const visualSuffix = visualMatch?.[0] || '';
  const base = visualSuffix ? pid.slice(0, -visualSuffix.length) : pid;
  return `${base.replace(/_(?:top|bot|mid\d*)$/i, '')}${visualSuffix}`;
}

export function stripSketchBoxDoorVisualSuffix(partId: string | null | undefined): string {
  return String(partId || '').replace(/_(?:accent|groove)_(?:top|bottom|left|right)$/i, '');
}

export function readSketchBoxDoorSegmentSuffix(partId: string | null | undefined): string | null {
  const cleaned = stripSketchBoxDoorVisualSuffix(partId);
  const match = /_(top|bot|mid\d*)$/i.exec(cleaned);
  return match?.[1] ? String(match[1]).toLowerCase() : null;
}

function readDoorTarget(pid: string): SketchBoxDoorTarget | null {
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
    /^sketch_box_free_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1]) {
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };
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
    /^sketch_box_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1]) {
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };
  }

  return null;
}

export function parseSketchBoxDoorPartTarget(partId: string | null | undefined): SketchBoxDoorTarget | null {
  const pid = stripSketchBoxDoorSegmentSuffix(String(partId || ''));
  if (!pid) return null;
  return readDoorTarget(pid);
}

export function parseSketchBoxPartTarget(partId: string | null | undefined): SketchBoxDoorTarget | null {
  const pid = stripSketchBoxDoorSegmentSuffix(String(partId || ''));
  if (!pid) return null;

  const doorTarget = readDoorTarget(pid);
  if (doorTarget) return doorTarget;

  const base = pid.replace(
    /_(?:door(?:_(?:handle|panel|left|right|top|bottom|edge_left|edge_right|edge_top|edge_bottom))?)$/,
    ''
  );
  let match = /^sketch_box_free_(.+)_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[2]) {
    return { moduleKey: match[1] ? String(match[1]) : null, boxId: String(match[2]), doorId: null };
  }

  match = /^sketch_box_free_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[1]) return { moduleKey: null, boxId: String(match[1]), doorId: null };

  match = /^sketch_box_(.+)_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[2]) {
    return { moduleKey: match[1] ? String(match[1]) : null, boxId: String(match[2]), doorId: null };
  }

  match = /^sketch_box_(sb(?:f)?_[a-z0-9]+)$/i.exec(base);
  if (match?.[1]) return { moduleKey: null, boxId: String(match[1]), doorId: null };

  return null;
}
