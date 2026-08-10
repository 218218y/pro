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
const STACK_SPLIT_LOWER_DOOR_ID_START = 1000;

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

function displayNumericIndex(raw: string | null, zeroBased = false): string | null {
  if (!raw || !/^\d+$/u.test(raw)) return null;
  return displayIndex(raw, zeroBased);
}

function withOrdinal(label: string, ordinal: string | null): string {
  return ordinal ? `${label} ${ordinal}` : label;
}

function unscopedPartId(partId: string): string {
  return partId.startsWith('lower_') ? partId.slice('lower_'.length) : partId;
}

function oneBasedIndexFromZeroBasedSuffix(partId: string, pattern: RegExp): string | null {
  const match = partId.match(pattern);
  return displayIndex(match?.[1] ?? null, true);
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

function doorOrdinal(ctx: LabelContext): string | null {
  const partId = unscopedPartId(ctx.partId);
  const patterns = [
    /(?:^|_)door_(\d+)(?:_|$)/u,
    /(?:^|_)d(\d+)(?:_|$)/u,
    /(?:^|_)sliding(?:_door)?_(\d+)(?:_|$)/u,
    /(?:^|_)slide(?:_door)?_(\d+)(?:_|$)/u,
  ];
  for (const pattern of patterns) {
    const match = partId.match(pattern);
    if (!match?.[1]) continue;
    const numeric = Number(match[1]);
    if (
      ctx.lowerStack &&
      /^d\d+(?:_|$)/u.test(partId) &&
      Number.isInteger(numeric) &&
      numeric >= STACK_SPLIT_LOWER_DOOR_ID_START
    ) {
      return String(numeric - STACK_SPLIT_LOWER_DOOR_ID_START + 1);
    }
    return displayIndex(match[1]);
  }
  return null;
}

function drawerOrdinal(partId: string): string | null {
  const basePartId = unscopedPartId(partId);
  const chestIndex = oneBasedIndexFromZeroBasedSuffix(basePartId, /^chest_drawer_(\d+)(?:_|$)/u);
  if (chestIndex) return chestIndex;

  if (basePartId.includes('shoe')) return null;

  const regularExternalMatch = basePartId.match(/(?:^|_)draw_(\d+)(?:_|$)/u);
  if (regularExternalMatch?.[1]) return displayIndex(regularExternalMatch[1]);

  const matches = [...partId.matchAll(/(?:^|_)(\d+)(?=_|$)/gu)];
  const raw = matches.at(-1)?.[1] ?? null;
  return displayIndex(raw);
}

function shelfOrdinal(ctx: LabelContext): string | null {
  const direct = displayNumericIndex(ctx.shelfIndex);
  if (direct) return direct;
  const match =
    ctx.partId.match(/(?:^|_)g(\d+)(?:_|$)/u) ?? ctx.partId.match(/(?:^|_)shelf_(?:[^_]+_)?(\d+)(?:_|$)/u);
  return displayIndex(match?.[1] ?? null);
}

function resolveCarcassLabel(ctx: LabelContext): string | null {
  const { kind } = ctx;
  const partId = unscopedPartId(ctx.partId);

  if (partId === 'chest_floor') return 'תחתית השידה';
  if (partId === 'chest_ceil') return 'גג השידה';
  if (partId === 'chest_left') return 'דופן שמאלית של השידה';
  if (partId === 'chest_right') return 'דופן ימנית של השידה';
  if (partId === 'chest_back') return 'גב השידה';
  if (partId === 'chest_commode_back') return 'לוח גב למראת השידה';

  if (partId === 'corner_stack_mid_floor' || partId === 'corner_stack_mid_floor_blind') {
    return 'רצפת ביניים בארון הפינתי';
  }
  const cornerMidFloorCellIndex = oneBasedIndexFromZeroBasedSuffix(
    partId,
    /^corner_stack_mid_floor_c(\d+)$/u
  );
  if (cornerMidFloorCellIndex) return `רצפת ביניים בתא פינתי ${cornerMidFloorCellIndex}`;

  if (partId === 'corner_floor' || partId === 'corner_floor_blind') {
    return ctx.lowerStack ? 'תחתית הארון הפינתי התחתון' : 'תחתית הארון הפינתי';
  }
  const cornerFloorCellIndex = oneBasedIndexFromZeroBasedSuffix(partId, /^corner_floor_c(\d+)$/u);
  if (cornerFloorCellIndex) {
    return ctx.lowerStack
      ? `תחתית תא פינתי תחתון ${cornerFloorCellIndex}`
      : `תחתית תא פינתי ${cornerFloorCellIndex}`;
  }
  if (partId === 'corner_wing_ceil') {
    return ctx.lowerStack ? 'גג הארון הפינתי התחתון' : 'גג הארון הפינתי';
  }
  const cornerTopCellIndex = oneBasedIndexFromZeroBasedSuffix(partId, /^corner_cell_top_c(\d+)$/u);
  if (cornerTopCellIndex) {
    return ctx.lowerStack ? `גג תא פינתי תחתון ${cornerTopCellIndex}` : `גג תא פינתי ${cornerTopCellIndex}`;
  }
  if (partId === 'corner_wing_side_left') {
    return ctx.lowerStack ? 'דופן שמאלית של הארון הפינתי התחתון' : 'דופן שמאלית של הארון הפינתי';
  }
  if (partId === 'corner_wing_side_right') {
    return ctx.lowerStack ? 'דופן ימנית של הארון הפינתי התחתון' : 'דופן ימנית של הארון הפינתי';
  }

  if (partId === 'corner_pent_floor') {
    return ctx.lowerStack ? 'תחתית ארון הפנטגון התחתון' : 'תחתית ארון הפנטגון';
  }
  if (partId === 'corner_pent_ceil') {
    return ctx.lowerStack ? 'גג ארון הפנטגון התחתון' : 'גג ארון הפנטגון';
  }
  if (partId === 'corner_pent_attach_wing') return 'דופן פנטגון בצד הארון הפינתי';
  if (partId === 'corner_pent_attach_main') return 'דופן פנטגון בצד הארון הראשי';
  if (partId === 'corner_pent_back_side') return 'גב צדדי של ארון הפנטגון';
  if (partId === 'corner_pent_back_back') return 'גב אחורי של ארון הפנטגון';

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
  const basePartId = unscopedPartId(ctx.partId);

  const cornerDrawerShelfCell = oneBasedIndexFromZeroBasedSuffix(
    basePartId,
    /^corner_shelf_over_drawers_c(\d+)$/u
  );
  if (cornerDrawerShelfCell) {
    return ctx.lowerStack
      ? `מדף מעל מגירות בתא פינתי תחתון ${cornerDrawerShelfCell}`
      : `מדף מעל מגירות בתא פינתי ${cornerDrawerShelfCell}`;
  }

  if (basePartId === 'corner_pent_int_shelf_180') return 'מדף פנטגון 1';
  if (basePartId === 'corner_pent_int_shelf_210') return 'מדף פנטגון 2';

  const pentLeftShelf = basePartId.match(/^corner_pent_int_left_shelf_(\d+)$/u);
  if (pentLeftShelf?.[1]) return withOrdinal('מדף שמאלי בפנטגון', displayIndex(pentLeftShelf[1]));

  if (basePartId.includes('external_drawers')) {
    const cell = moduleLabel(ctx);
    return ctx.moduleIndex != null ? `מדף מעל מגירות ב${cell}` : 'מדף מעל מגירות';
  }

  const ordinal = shelfOrdinal(ctx);
  const base = basePartId.includes('shoe')
    ? 'מדף נעליים'
    : ctx.shelfIsBrace
      ? 'מדף קושרת'
      : ctx.shelfVariant === 'glass'
        ? 'מדף זכוכית'
        : ctx.shelfVariant === 'double'
          ? 'מדף כפול'
          : ctx.shelfIsRounded
            ? 'מדף מעוגל'
            : basePartId.startsWith('corner_') || basePartId.includes('_corner_')
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
  const basePartId = unscopedPartId(partId);
  const ordinal = doorOrdinal(ctx);
  const base = basePartId.includes('corner_pent_door')
    ? ctx.lowerStack
      ? 'דלת פנטגון תחתונה'
      : 'דלת פנטגון'
    : basePartId.includes('corner_door')
      ? ctx.lowerStack
        ? 'דלת פינתית תחתונה'
        : 'דלת פינתית'
      : basePartId.includes('sliding') || basePartId.includes('slide')
        ? ctx.lowerStack
          ? 'דלת הזזה תחתונה'
          : 'דלת הזזה'
        : ctx.lowerStack
          ? 'דלת תחתונה'
          : 'דלת';
  return withOrdinal(base, ordinal);
}

function resolveDrawerLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (partId.startsWith('drawer_box__')) {
    const ownerPartId = partId.slice('drawer_box__'.length);
    const owner = ownerPartId || partId;
    if (owner.includes('int_drawer') || owner.startsWith('div_int_')) {
      if (owner.endsWith('_lower')) return 'ארגז מגירה פנימית תחתונה';
      if (owner.endsWith('_upper')) return 'ארגז מגירה פנימית עליונה';
      return withOrdinal('ארגז מגירה פנימית', drawerOrdinal(owner));
    }
    if (owner.includes('chest_drawer')) return withOrdinal('ארגז מגירת שידה', drawerOrdinal(owner));
    if (owner.includes('shoe')) return 'ארגז מגירת נעליים';
    return withOrdinal('ארגז מגירה', drawerOrdinal(owner));
  }
  if (!isDrawerLikePartId(partId, kind)) return null;

  if (partId.startsWith('div_int_')) {
    if (partId.endsWith('_lower')) return 'מגירה פנימית תחתונה';
    if (partId.endsWith('_upper')) return 'מגירה פנימית עליונה';
  }

  const ordinal = drawerOrdinal(partId);
  const base = partId.includes('shoe')
    ? 'מגירת נעליים'
    : partId.includes('internal') || partId.includes('int_drawer') || partId.startsWith('div_int_')
      ? 'מגירה פנימית'
      : partId.includes('external') ||
          partId.includes('ext_drawer') ||
          kind.includes('extdrawer') ||
          kind.includes('external')
        ? 'מגירה חיצונית'
        : partId.includes('chest')
          ? 'מגירת שידה'
          : 'מגירה';
  return withOrdinal(base, ordinal);
}

function resolveInteriorLabel(ctx: LabelContext): string | null {
  const { partId, kind } = ctx;
  if (kind === 'shelf_pin') return 'תומך מדף';
  if (
    !isDrawerLikePartId(partId, kind) &&
    (partId.includes('divider') || partId.startsWith('div_int_') || kind.includes('divider'))
  ) {
    const dividerIndex = oneBasedIndexFromZeroBasedSuffix(unscopedPartId(partId), /^divider_inter_(\d+)$/u);
    return withOrdinal('מחיצה פנימית', dividerIndex);
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
  const { kind } = ctx;
  const partId = unscopedPartId(ctx.partId);
  if (partId.includes('cornice') || kind.includes('cornice')) {
    const base = partId.includes('wave') ? 'קרניז גל' : 'קרניז';
    if (partId.includes('corner_pent')) return `${base} של ארון הפנטגון`;
    if (partId.includes('corner')) return `${base} של הארון הפינתי`;
    return base;
  }
  if (partId.includes('plinth') || kind.includes('plinth')) {
    if (partId.startsWith('chest_')) return 'צוקל השידה';
    if (partId.includes('corner_pent')) return 'צוקל ארון הפנטגון';
    if (partId.includes('corner')) return 'צוקל הארון הפינתי';
    return 'צוקל';
  }
  if (partId.includes('leg_platform') || partId.includes('platform')) {
    if (partId.endsWith('_bottom')) return 'במת רגליים תחתונה';
    if (partId.endsWith('_top')) return 'במת רגליים עליונה';
    return 'במת רגליים';
  }
  if (/(?:^|_)leg(?:_|$)/u.test(partId) || kind === 'leg') return 'רגל הארון';
  if (kind === 'chest_caster_wheel') return 'גלגל השידה';
  if (kind === 'chest_caster_plate') return 'תושבת גלגל של השידה';
  if (kind === 'chest_caster_fork') return 'מזלג גלגל של השידה';
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
