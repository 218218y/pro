// Data-* attribute helpers (Runtime)
//
// Goal:
// - Avoid direct `.dataset` usage in UI code so TS checkjs doesn't complain
//   about `dataset` missing on `Element`.
// - Provide a small, stable API for reading/writing `data-*` attributes.
//
// Notes:
// - Accept an Element-like object that implements getAttribute/setAttribute.
// - Keys may be provided in camelCase ("colorId") or kebab-case ("color-id").
// - Passing a key with "data-" prefix is also supported.

type ElementLike = {
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
  hasAttribute?: (name: string) => boolean;
  [k: string]: unknown;
};

type ElementAttrTarget = Element | ElementLike | null | undefined;

function isElementLike(value: unknown): value is ElementLike {
  return !!value && typeof value === 'object';
}

function asElementLike(value: ElementAttrTarget): ElementLike | null {
  return isElementLike(value) ? value : null;
}

function toDataAttrName(key: string | number | null | undefined): string {
  const k0 = key == null ? '' : String(key).trim();
  if (!k0) return '';
  const k = k0.toLowerCase().startsWith('data-') ? k0.slice(5) : k0;
  const kebab = k.includes('-') ? k : k.replace(/([A-Z])/g, '-$1').toLowerCase();
  return 'data-' + kebab;
}

export function getDataAttrMaybe(el: ElementAttrTarget, key: string): string | null {
  try {
    const target = asElementLike(el);
    if (!target || typeof target.getAttribute !== 'function') return null;
    const name = toDataAttrName(key);
    if (!name) return null;
    const v = target.getAttribute(name);
    return v == null ? null : String(v);
  } catch {
    return null;
  }
}

export function getDataAttr(el: ElementAttrTarget, key: string): string {
  const v = getDataAttrMaybe(el, key);
  return v == null ? '' : String(v);
}

export function getDataAttrAny(el: ElementAttrTarget, keys: string[]): string {
  try {
    const arr = Array.isArray(keys) ? keys : [];
    for (let i = 0; i < arr.length; i++) {
      const k = arr[i];
      if (k == null) continue;
      const v = getDataAttrMaybe(el, String(k));
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
  } catch {
    // swallow
  }
  return '';
}

export function hasDataAttr(el: ElementAttrTarget, key: string): boolean {
  try {
    const target = asElementLike(el);
    if (!target) return false;
    const name = toDataAttrName(key);
    if (!name) return false;
    if (typeof target.hasAttribute === 'function') return !!target.hasAttribute(name);
    if (typeof target.getAttribute === 'function') return target.getAttribute(name) != null;
  } catch {
    // swallow
  }
  return false;
}

export function setDataAttr(el: ElementAttrTarget, key: string, value: string | null | undefined): void {
  try {
    const target = asElementLike(el);
    if (!target) return;
    const name = toDataAttrName(key);
    if (!name) return;
    if (value == null) {
      if (typeof target.removeAttribute === 'function') target.removeAttribute(name);
      return;
    }
    if (typeof target.setAttribute === 'function') target.setAttribute(name, String(value));
  } catch {
    // swallow
  }
}
