import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';

export function createOrderPdfTextDetailsOps(deps: ExportOrderPdfDeps) {
  const {
    asRecord,
    asObject,
    getCfg,
    getUi,
    getModelById,
    _exportReportNonFatalNoApp,
    _exportReportThrottled,
    _getProjectName,
    _requireApp,
    readModulesConfigurationListFromConfigSnapshot,
  } = deps;

  function getCfgString(cfg: Record<string, unknown>, key: string, fallback: string): string {
    try {
      const v = cfg[key];
      return typeof v === 'string' ? v : v == null ? fallback : String(v);
    } catch (e) {
      _exportReportNonFatalNoApp(`getCfgScalar:${key}`, e, 3000);
      return fallback;
    }
  }

  function getUiRawNumber(ui: Record<string, unknown>, key: string, fallback: number): number {
    try {
      const raw = asRecord(ui['raw']);
      const v = raw ? raw[key] : undefined;
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
      return Number.isFinite(n) ? n : fallback;
    } catch (e) {
      _exportReportNonFatalNoApp(`getUiRawNumber:${key}`, e, 3000);
      return fallback;
    }
  }

  function getUiRawInt(ui: Record<string, unknown>, key: string, fallback: number): number {
    try {
      const raw = asRecord(ui['raw']);
      const v = raw ? raw[key] : undefined;
      const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) ? n : fallback;
    } catch (e) {
      _exportReportNonFatalNoApp(`getUiRawInt:${key}`, e, 3000);
      return fallback;
    }
  }

  function tryParseJsonArray(raw: unknown): number[] | null {
    try {
      if (Array.isArray(raw)) return raw.map(x => Number(x)).filter(n => Number.isFinite(n));
      if (typeof raw !== 'string') return null;
      const t = raw.trim();
      if (!t) return null;
      const v = JSON.parse(t);
      if (!Array.isArray(v)) return null;
      const arr = v.map(x => Number(x)).filter(n => Number.isFinite(n));
      return arr.length ? arr : null;
    } catch (e) {
      _exportReportNonFatalNoApp('tryParseJsonArray', e, 3000);
      return null;
    }
  }

  function calcBodySplit(
    width: number,
    totalDoors: number,
    cfg: Record<string, unknown>,
    ui?: Record<string, unknown>
  ): string {
    try {
      const modulesCfg = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
      const fromModules = modulesCfg
        .map(m => {
          const rec = asRecord(m);
          return rec ? Number(rec['doors']) : NaN;
        })
        .filter(n => Number.isFinite(n) && n > 0);
      const fromSelection = tryParseJsonArray(cfg['structureSelection']);
      const doorsPerModule = (fromModules && fromModules.length ? fromModules : fromSelection) || [];

      const inferred: number[] = (() => {
        if (doorsPerModule.length) return [];
        const d = Number(totalDoors);
        if (!(Number.isFinite(d) && d > 0)) return [];
        if (d <= 2) return [d];

        let singleDoorPos = 'left';
        try {
          const u = ui || {};
          const raw = asRecord(u['raw']);
          const pos = u['singleDoorPos'] ?? raw?.['singleDoorPos'] ?? cfg['singleDoorPos'];
          singleDoorPos = String(pos || 'left') === 'right' ? 'right' : 'left';
        } catch (e) {
          _exportReportNonFatalNoApp('calcBodySplit.singleDoorPos', e, 3000);
          singleDoorPos = 'left';
        }

        const pairs = Math.floor(d / 2);
        const rem = d % 2;
        const arr = Array.from({ length: pairs }, () => 2);
        if (rem === 1) {
          if (singleDoorPos === 'right') arr.push(1);
          else arr.unshift(1);
        }
        return arr;
      })();

      const finalDoorsPerModule = (doorsPerModule.length ? doorsPerModule : inferred) || [];
      if (
        !finalDoorsPerModule.length ||
        !(Number.isFinite(width) && width > 0) ||
        !(Number.isFinite(totalDoors) && totalDoors > 0)
      ) {
        return '';
      }

      const perDoor = width / totalDoors;
      const widths = finalDoorsPerModule.map(d => Math.round(d * perDoor));
      return widths.join('-');
    } catch (e) {
      _exportReportNonFatalNoApp('calcBodySplit', e, 3000);
      return '';
    }
  }

  function buildOrderDetailsText(App: AppContainer): string {
    const cfg = asObject(getCfg(App));
    const ui = asObject(getUi(App));

    const wardrobeType = getCfgString(cfg, 'wardrobeType', 'hinged');
    const boardMaterial = getCfgString(cfg, 'boardMaterial', 'sandwich');
    const doors = getUiRawInt(ui, 'doors', 4);
    const width = getUiRawNumber(ui, 'width', 160);
    const height = getUiRawNumber(ui, 'height', 240);
    const depth = getUiRawNumber(ui, 'depth', 60);

    const selectedModelId = String(ui['selectedModelId'] || '').trim();
    const doorStyleKey = String(ui['doorStyle'] ?? cfg['doorStyle'] ?? 'flat').trim();

    const typeHeb = wardrobeType === 'sliding' ? 'הזזה' : 'פתיחה';
    const materialHeb = boardMaterial === 'melamine' ? 'מלמין' : "סנדביץ'";
    const doorStyleHeb =
      doorStyleKey === 'flat'
        ? 'פוסט'
        : doorStyleKey === 'profile'
          ? 'פרופיל'
          : doorStyleKey === 'tom'
            ? 'פרופיל תום'
            : '';

    const split = calcBodySplit(width, doors, cfg, ui);
    const lines: string[] = [];

    if (selectedModelId) {
      try {
        const m = getModelById(App, selectedModelId);
        const mRec = asRecord(m);
        const rawName = String(mRec?.name ?? '').trim();
        const name = rawName.replace(/^⭐\s*/u, '').trim();
        if (name) lines.push(`דגם: ${name}`);
      } catch (e) {
        _exportReportThrottled(App, 'orderDetails.getModelById', e, { throttleMs: 2000 });
      }
    }

    lines.push(`סוג: ${typeHeb}`);
    lines.push(`דלתות: ${doors}, ${materialHeb}${doorStyleHeb ? `, ${doorStyleHeb}` : ''}`);
    lines.push(`מידות (ס"מ): ${Math.round(width)}×${Math.round(height)}×${Math.round(depth)}`);
    if (split) lines.push(`חלוקת גוף: ${split}`);
    return lines.join('\n');
  }

  function formatOrderDateDdMmYyyy(d: Date): string {
    try {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      _exportReportNonFatalNoApp('formatOrderDateDdMmYyyy', e, 3000);
      return '';
    }
  }

  function getOrderPdfDraft(App: AppContainer): OrderPdfDraftLike {
    App = _requireApp(App);
    const projectName = _getProjectName(App) || 'פרויקט';
    const autoDetails = buildOrderDetailsText(App);
    const orderNumber = '';
    const orderDate = formatOrderDateDdMmYyyy(new Date());
    return {
      projectName,
      orderNumber,
      orderDate,
      deliveryAddress: '',
      phone: '',
      mobile: '',
      autoDetails,
      manualDetails: '',
      manualEnabled: false,
      notes: '',
    };
  }

  return {
    buildOrderDetailsText,
    formatOrderDateDdMmYyyy,
    getOrderPdfDraft,
  };
}
