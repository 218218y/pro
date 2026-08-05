import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import {
  asMeasurableObject,
  isViewerMeasurementDoorOrDrawerPartId,
  isViewerMeasurementShelfPartId,
  readUserData,
  readViewerMeasurementIdentityText,
  resolveViewerMeasurementTarget,
} from './viewer_measurement_tool_resolution.js';

const HUMAN_LABEL_KEYS = ['partLabel', 'displayLabel', 'label', 'title'] as const;

type LabelContext = {
  partId: string;
  kind: string;
  moduleIndex: string | null;
  lowerStack: boolean;
  shelfIndex: string | null;
  shelfVariant: string;
  shelfIsBrace: boolean;
  shelfIsRounded: boolean;
};

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readIdentityText(value: unknown): string {
  return readViewerMeasurementIdentityText(value);
}

function readNearestUserDataValue(target: unknown, keys: readonly string[]): unknown {
  let current = asMeasurableObject(target);
  while (current) {
    const userData = readUserData(current);
    if (userData) {
      for (const key of keys) {
        if (typeof userData[key] !== 'undefined') return userData[key];
      }
    }
    current = asMeasurableObject(current.parent);
  }
  return undefined;
}

function readNearestIdentityValue(target: unknown, keys: readonly string[]): string {
  let current = asMeasurableObject(target);
  while (current) {
    const userData = readUserData(current);
    if (userData) {
      for (const key of keys) {
        const identity = readIdentityText(userData[key]);
        if (identity) return identity;
      }
    }
    current = asMeasurableObject(current.parent);
  }
  return '';
}

function readFirstHumanLabel(target: unknown): string {
  let current = asMeasurableObject(target);
  while (current) {
    const userData = readUserData(current);
    for (const key of HUMAN_LABEL_KEYS) {
      const label = readText(userData?.[key]);
      if (label) return label;
    }
    current = asMeasurableObject(current.parent);
  }
  return '';
}

function readNearestKind(target: unknown): string {
  return readText(readNearestUserDataValue(target, ['__kind', 'kind', 'type'])).toLowerCase();
}

function readModuleIndex(
  hitState: CanvasPickingClickHitState,
  target: unknown,
  partId: string
): string | null {
  const direct = readNearestIdentityValue(target, ['moduleIndex', '__wpSketchModuleKey']);
  if (direct) return direct;

  const hitModule = readIdentityText(hitState.foundModuleIndex ?? hitState.hitIdentity?.moduleIndex);
  if (hitModule) return hitModule;

  const moduleShelfMatch = partId.match(/(?:^|_)module_shelf_([^_]+)_g(?:[^_]+)(?:_|$)/u);
  if (moduleShelfMatch?.[1]) return moduleShelfMatch[1];

  const sketchShelfMatch = partId.match(/(?:^|_)sketch_shelf_([^_]+)_(?:[^_]+)(?:_|$)/u);
  return sketchShelfMatch?.[1] ?? null;
}

function isLowerStack(hitState: CanvasPickingClickHitState, target: unknown, partId: string): boolean {
  const stack = readText(readNearestUserDataValue(target, ['__wpStack', 'stack'])).toLowerCase();
  return hitState.foundModuleStack === 'bottom' || stack === 'bottom' || partId.startsWith('lower_');
}

function displayIndex(raw: string | null, zeroBased = false): string | null {
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;
  return String(Math.max(0, Math.trunc(numeric)) + (zeroBased ? 1 : 0));
}

function withOrdinal(label: string, ordinal: string | null): string {
  return ordinal ? `${label} ${ordinal}` : label;
}

function moduleLabel(ctx: LabelContext): string {
  const raw = ctx.moduleIndex;
  if (raw === 'corner') return ctx.lowerStack ? 'תא פינתי תחתון' : 'תא פינתי';
  if (raw?.startsWith('corner:')) {
    const index = displayIndex(raw.slice('corner:'.length), true);
    const suffix = index ? ` ${index}` : '';
    return ctx.lowerStack ? `תא פינתי תחתון${suffix}` : `תא פינתי${suffix}`;
  }

  const index = displayIndex(raw, true);
  if (!index) return ctx.lowerStack ? 'תא תחתון' : 'תא בארון';
  return ctx.lowerStack ? `תא תחתון ${index}` : `תא ${index}`;
}

function doorOrdinal(partId: string): string | null {
  const patterns = [
    /(?:^|_)door_(\d+)(?:_|$)/u,
    /(?:^|_)d(\d+)(?:_|$)/u,
    /(?:^|_)sliding(?:_door)?_(\d+)(?:_|$)/u,
    /(?:^|_)slide(?:_door)?_(\d+)(?:_|$)/u,
  ];
  for (const pattern of patterns) {
    const match = partId.match(pattern);
    if (match?.[1]) return displayIndex(match[1]);
  }
  return null;
}

function drawerOrdinal(partId: string): string | null {
  const matches = [...partId.matchAll(/(?:^|_)(\d+)(?=_|$)/gu)];
  const raw = matches.at(-1)?.[1] ?? null;
  return displayIndex(raw);
}

function shelfOrdinal(ctx: LabelContext): string | null {
  const direct = displayIndex(ctx.shelfIndex);
  if (direct) return direct;
  const match =
    ctx.partId.match(/(?:^|_)g(\d+)(?:_|$)/u) ?? ctx.partId.match(/(?:^|_)shelf_(?:[^_]+_)?(\d+)(?:_|$)/u);
  return displayIndex(match?.[1] ?? null);
}

function resolveCarcassLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (/(?:^|_)body_floor$/u.test(partId) || partId.includes('cabinet_floor')) {
    return ctx.lowerStack ? 'תחתית הארון התחתון' : 'תחתית הארון';
  }
  if (/(?:^|_)body_(?:ceil|top)$/u.test(partId) || partId.includes('cabinet_top') || kind === 'ceiling') {
    return ctx.lowerStack ? 'גג הארון התחתון' : 'גג הארון';
  }
  if (/(?:^|_)body_left$/u.test(partId) || partId.endsWith('_side_left')) {
    return ctx.lowerStack ? 'דופן שמאלית תחתונה' : 'דופן שמאלית';
  }
  if (/(?:^|_)body_right$/u.test(partId) || partId.endsWith('_side_right')) {
    return ctx.lowerStack ? 'דופן ימנית תחתונה' : 'דופן ימנית';
  }
  if (
    partId.includes('back_panel') ||
    partId.startsWith('body_back') ||
    partId.endsWith('_back') ||
    kind === 'backpanel'
  ) {
    return ctx.lowerStack ? 'גב הארון התחתון' : 'גב הארון';
  }
  if (partId.includes('front_closure') || partId.includes('front_board')) return 'לוח קדמי';
  if (partId.includes('stack_split_divider')) return 'מחיצת חלוקת הארון';
  if (partId.includes('stack_split_separator')) return 'פס הפרדה';
  return null;
}

function resolveShelfLabel(ctx: LabelContext): string | null {
  if (!isViewerMeasurementShelfPartId(ctx.partId)) return null;
  const ordinal = shelfOrdinal(ctx);
  const base = ctx.partId.includes('shoe')
    ? 'מדף נעליים'
    : ctx.shelfIsBrace
      ? 'מדף קושרת'
      : ctx.shelfVariant === 'glass'
        ? 'מדף זכוכית'
        : ctx.shelfVariant === 'double'
          ? 'מדף כפול'
          : ctx.shelfIsRounded
            ? 'מדף מעוגל'
            : ctx.partId.startsWith('corner_') || ctx.partId.includes('_corner_')
              ? 'מדף פינתי'
              : 'מדף';
  const label = withOrdinal(base, ordinal);
  const cell = moduleLabel(ctx);
  return ctx.moduleIndex != null ? `${label} ב${cell}` : label;
}

function isDrawerLikePartId(partId: string, kind: string): boolean {
  return (
    partId.startsWith('drawer_box__') ||
    partId.includes('_draw_') ||
    partId.includes('drawer') ||
    partId.includes('draw') ||
    kind.includes('drawer')
  );
}

function resolveDoorLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (!isViewerMeasurementDoorOrDrawerPartId(partId) || isDrawerLikePartId(partId, kind)) {
    return null;
  }
  const ordinal = doorOrdinal(partId);
  const base = partId.includes('corner')
    ? 'דלת פינתית'
    : partId.includes('sliding') || partId.includes('slide')
      ? 'דלת הזזה'
      : ctx.lowerStack
        ? 'דלת תחתונה'
        : 'דלת';
  return withOrdinal(base, ordinal);
}

function resolveDrawerLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (partId.startsWith('drawer_box__')) {
    const ownerPartId = partId.slice('drawer_box__'.length);
    return withOrdinal('ארגז מגירה', drawerOrdinal(ownerPartId || partId));
  }
  if (!isDrawerLikePartId(partId, kind)) return null;
  const ordinal = drawerOrdinal(partId);
  const base = partId.includes('shoe')
    ? 'מגירת נעליים'
    : partId.includes('internal') || partId.includes('int_drawer')
      ? 'מגירה פנימית'
      : partId.includes('external') || partId.includes('ext_drawer')
        ? 'מגירה חיצונית'
        : partId.includes('chest')
          ? 'מגירת שידה'
          : 'מגירה';
  return withOrdinal(base, ordinal);
}

function resolveInteriorLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (kind === 'shelf_pin') return 'תומך מדף';
  if (partId.includes('divider') || partId.startsWith('div_int_') || kind.includes('divider')) {
    return withOrdinal('מחיצה פנימית', drawerOrdinal(partId));
  }
  if (
    partId.includes('hanging') ||
    partId.includes('hanger') ||
    /(?:^|_)rod(?:_|$)/u.test(partId) ||
    kind === 'rod' ||
    kind === 'wardrobe_rod'
  ) {
    return 'מוט תלייה';
  }
  return null;
}

function resolveAdornmentLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (partId.includes('cornice') || kind.includes('cornice')) {
    return partId.includes('wave') ? 'קרניז גל' : 'קרניז';
  }
  if (partId.includes('plinth') || kind.includes('plinth')) return 'צוקל';
  if (partId.includes('leg_platform') || partId.includes('platform')) return 'במת רגליים';
  if (/(?:^|_)leg(?:_|$)/u.test(partId) || kind === 'leg') return 'רגל הארון';
  if (partId.includes('handle') || kind.includes('handle')) return 'ידית';
  if (partId.includes('mirror') || kind.includes('mirror')) return 'מראה';
  if (partId.includes('glass') || kind.includes('glass')) return 'זכוכית';
  return null;
}

function resolveCanonicalLabel(ctx: LabelContext, isModuleSelector: boolean): string {
  if (isModuleSelector) return moduleLabel(ctx);
  return (
    resolveInteriorLabel(ctx) ??
    resolveCarcassLabel(ctx) ??
    resolveShelfLabel(ctx) ??
    resolveDoorLabel(ctx) ??
    resolveDrawerLabel(ctx) ??
    resolveAdornmentLabel(ctx) ??
    (ctx.kind === 'board' ? 'לוח הארון' : 'חלק הארון')
  );
}

export function resolveViewerMeasurementPartLabel(
  hitState: CanvasPickingClickHitState | null
): string | null {
  if (!hitState) return null;
  const target = resolveViewerMeasurementTarget(hitState);
  if (!target) return null;

  const explicitLabel = readFirstHumanLabel(target);
  if (explicitLabel) return explicitLabel;

  const partId = (
    readNearestIdentityValue(target, ['partId', 'pid', 'surfaceId', 'drawerId']) ||
    readIdentityText(hitState.foundPartId) ||
    readIdentityText(hitState.hitIdentity?.partId) ||
    readIdentityText(hitState.foundDrawerId)
  ).toLowerCase();
  const kind = readNearestKind(target);
  const context: LabelContext = {
    partId,
    kind,
    moduleIndex: readModuleIndex(hitState, target, partId),
    lowerStack: isLowerStack(hitState, target, partId),
    shelfIndex: readIdentityText(readNearestUserDataValue(target, ['__wpShelfIndex'])) || null,
    shelfVariant: readText(readNearestUserDataValue(target, ['__wpShelfVariant'])).toLowerCase(),
    shelfIsBrace: readNearestUserDataValue(target, ['__wpShelfIsBrace']) === true,
    shelfIsRounded: !!readNearestUserDataValue(target, ['__wpShelfRoundedSide']),
  };

  return resolveCanonicalLabel(context, readNearestUserDataValue(target, ['isModuleSelector']) === true);
}
