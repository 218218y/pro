export type SketchBoxControlDefinition = {
  label: string;
  keywords?: string;
  aliases?: readonly string[];
  importance?: 'primary' | 'secondary';
  reveal?: readonly { control: string; action: 'expand' | 'activate' }[];
};

const box = [{ control: 'box-add', action: 'expand' }] as const;
const base = [...box, { control: 'box-base', action: 'expand' }] as const;
const legs = [...base, { control: 'box-base-type-legs', action: 'activate' }] as const;
const stage = [...legs, { control: 'box-platform-stage', action: 'activate' }] as const;

/** Every box control must select an entry here; search consumes the same inventory. */
export const SKETCH_BOX_CONTROLS = {
  'box-add': {
    importance: 'primary',
    label: 'הוספת קופסא חופשית',
    keywords: 'הוסף קופסה קופסאות בניית קופסא',
    aliases: ['קופסא', 'קופסה', 'הוספת קופסא', 'הוספת קופסה'],
  },
  'box-height': { label: 'גובה קופסא חדשה', keywords: 'מידות קופסה אוטומטי' },
  'box-width': { label: 'רוחב קופסא חדשה', keywords: 'מידות קופסה אוטומטי', reveal: box },
  'box-depth': { label: 'עומק קופסא חדשה', keywords: 'מידות קופסה אוטומטי', reveal: box },
  'box-divider': {
    label: 'מחיצה עומדת',
    keywords: 'הוסף הוספת מחיצות אנכית חלוקה קופסא',
    importance: 'primary',
  },
  'box-horizontal-divider': {
    label: 'מחיצה שוכבת',
    keywords: 'הוסף הוספת מחיצות אופקית חלוקה קופסא',
    importance: 'primary',
  },
  'box-door': { label: 'דלת אחת לקופסא', keywords: 'הוספת דלת 1 קופסה' },
  'box-double-door': { label: 'שתי דלתות לקופסא', keywords: 'הוספת 2 דלתות קופסה' },
  'box-hinge': { label: 'כיוון פתיחת דלת לקופסא', keywords: 'ציר קופסה', reveal: box },
  'box-base': { label: 'בסיס לקופסא', keywords: 'רגליים צוקל קופסה', reveal: box },
  'box-base-type': { label: 'סוג בסיס לקופסא', keywords: 'רגליים צוקל קופסה', reveal: base },
  'box-plinth-height': {
    label: 'גובה צוקל לקופסא',
    reveal: [...base, { control: 'box-base-type-plinth', action: 'activate' }],
  },
  'box-platform': { label: 'במה לבסיס קופסא', keywords: 'רגליים קופסה', reveal: legs },
  'box-platform-side': { label: 'בליטת במה צדדית לקופסא', reveal: stage },
  'box-platform-side-size': {
    label: 'מידת בליטת במה מהצדדים לקופסא',
    reveal: [...stage, { control: 'box-platform-side-overhang', action: 'activate' }],
  },
  'box-platform-front-size': { label: 'בליטת במה מהחזית לקופסא', reveal: stage },
  'box-leg-style': { label: 'סוג רגליים לקופסא', keywords: 'עגולות שפיץ מרובעות קופסה', reveal: legs },
  'box-leg-color': { label: 'צבע רגליים לקופסא', keywords: 'שחור ניקל זהב קופסה', reveal: legs },
  'box-leg-height': { label: 'גובה רגליים לקופסא', reveal: legs },
  'box-leg-width': { label: 'רוחב רגליים לקופסא', reveal: legs },
  'box-cornice': { label: 'קרניז לקופסא', keywords: 'כתר קופסה', reveal: box },
  'box-cornice-type': {
    label: 'סוג קרניז לקופסא',
    keywords: 'רגיל גל ישר כתר קופסה',
    reveal: [...box, { control: 'box-cornice', action: 'expand' }],
  },
} as const satisfies Record<string, SketchBoxControlDefinition>;

export type SketchBoxControlId = keyof typeof SKETCH_BOX_CONTROLS;

export function sketchBoxControlTestId(control: string): string {
  return `sketch-control-${control}`;
}
