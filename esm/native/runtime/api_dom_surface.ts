// Grouped DOM/download helpers for runtime/UI consumers.

export {
  hasDom,
  getById,
  get$,
  getQs,
  getQsa,
  getHeaderLogoImageMaybe,
  getViewerContainerMaybe,
  getReactMountRootMaybe,
  ensureToastContainerMaybe,
} from './dom_access.js';

export {
  triggerHrefDownloadResultViaBrowser,
  triggerHrefDownloadViaBrowser,
  triggerBlobDownloadResultViaBrowser,
  triggerBlobDownloadViaBrowser,
  triggerCanvasDownloadResultViaBrowser,
  triggerCanvasDownloadViaBrowser,
} from './browser_download.js';

export {
  writeClipboardTextResultViaBrowser,
  writeClipboardItemsResultViaBrowser,
} from './browser_clipboard.js';

export { readFileTextResultViaBrowser, readFileDataUrlResultViaBrowser } from './browser_file_read.js';

export { getDataAttrMaybe, getDataAttr, getDataAttrAny, hasDataAttr, setDataAttr } from './data_attrs.js';

export {
  clearEl,
  setIconText,
  setStrongInline,
  setStrongSmall,
  getTabs,
  getTabContents,
  getScrollContainer,
  byId,
} from './dom_ops.js';
