// Shared UI tab identifiers used by the React UI and (optionally) the store.
// Keep this as a small, stable union so new tabs are an explicit, reviewed change.
export const TAB_IDS = ['structure', 'design', 'interior', 'render', 'export', 'sketch'];
const TAB_ID_SET = new Set(TAB_IDS);
export function isTabId(v) {
  return typeof v === 'string' && TAB_ID_SET.has(v);
}
