import {
  asHitObject,
  readStackKey,
  readUserData,
  type FindModuleSelectorObjectArgs,
  type HitObjectLike,
} from './canvas_picking_module_selector_hits_shared.js';

export function findModuleSelectorObject(args: FindModuleSelectorObjectArgs): HitObjectLike | null {
  const { root, moduleKey, stackKey, toModuleKey } = args;
  const hit = asHitObject(root);
  if (!hit) return null;

  const wantKey = String(moduleKey);
  const wantStack = stackKey === 'bottom' ? 'bottom' : 'top';
  const queue: HitObjectLike[] = [hit];
  while (queue.length) {
    const curr = queue.shift();
    if (!curr) continue;
    const ud = readUserData(curr);
    if (ud && ud.isModuleSelector) {
      const mk = toModuleKey(ud.moduleIndex);
      const stack = readStackKey(ud.__wpStack) === 'bottom' ? 'bottom' : 'top';
      if (mk != null && String(mk) === wantKey && stack === wantStack) {
        return curr;
      }
    }
    const children = Array.isArray(curr.children)
      ? curr.children.map(child => asHitObject(child)).filter((child): child is HitObjectLike => !!child)
      : [];
    for (let i = 0; i < children.length; i++) queue.push(children[i]);
  }

  return null;
}
