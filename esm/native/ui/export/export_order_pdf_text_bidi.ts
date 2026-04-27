import type { BidiRun } from './export_order_pdf_contracts_shared.js';

function isRtlStrongChar(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (
    (c >= 0x0590 && c <= 0x05ff) ||
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0x08a0 && c <= 0x08ff)
  );
}

function isLtrStrongChar(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}

export function createOrderPdfTextBidiOps() {
  function splitDirectionalRuns(line: string): BidiRun[] {
    const runs: BidiRun[] = [];
    let curDir: 'rtl' | 'ltr' | null = null;
    let cur = '';
    let neutralBuf = '';

    const shouldAttachNeutralToNext = (buf: string, nextDir: 'rtl' | 'ltr'): boolean => {
      const t = buf.replace(/\s+$/g, '');
      if (!t) return false;
      const last = t[t.length - 1];
      if (nextDir === 'ltr' && (last === '(' || last === '[' || last === '{')) return true;
      return false;
    };

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const isRtl = isRtlStrongChar(ch);
      const isLtr = !isRtl && isLtrStrongChar(ch);

      if (!isRtl && !isLtr) {
        neutralBuf += ch;
        continue;
      }

      const nextDir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';
      if (!curDir) {
        curDir = nextDir;
        cur = neutralBuf + ch;
        neutralBuf = '';
        continue;
      }
      if (nextDir === curDir) {
        cur += neutralBuf + ch;
        neutralBuf = '';
        continue;
      }
      if (shouldAttachNeutralToNext(neutralBuf, nextDir)) {
        runs.push({ dir: curDir, text: cur });
        curDir = nextDir;
        cur = neutralBuf + ch;
        neutralBuf = '';
        continue;
      }
      cur += neutralBuf;
      neutralBuf = '';
      runs.push({ dir: curDir, text: cur });
      curDir = nextDir;
      cur = ch;
    }

    if (curDir) {
      cur += neutralBuf;
      runs.push({ dir: curDir, text: cur });
      neutralBuf = '';
    }

    if (!runs.length && neutralBuf) runs.push({ dir: 'rtl', text: neutralBuf });
    return runs;
  }

  function fixBidiForAcrobatText(input: string): string {
    const RLM = '\u200F';
    const LRM = '\u200E';
    const NBSP = '\u00A0';

    const s0 = String(input || '');
    const stripped = s0.replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g, '');
    if (!stripped) return RLM;

    const stabilized = stripped
      .replace(/([\u0590-\u08FF\)\]\}:;,.!?])([ \t]+)(?=[A-Za-z0-9])/g, (_m, a) => `${a}${NBSP}`)
      .replace(/([A-Za-z0-9])([ \t]+)(?=[\u0590-\u08FF])/g, (_m, a) => `${a}${NBSP}`);

    const TOKEN = `[A-Za-z0-9][A-Za-z0-9\\-\\._:@/\\\\\+\\(\\)\\[\\]\\{\\}%&\\*\\#\\!\\'\\"<>=,;:\\?]*`;
    const re = new RegExp(`${TOKEN}(?:[ \t]+${TOKEN})*`, 'g');
    const wrapLine = (line: string): string => String(line || '').replace(re, m => `${LRM}${m}${LRM}`);

    const fixNumberTrailingPunct = (s: string): string => {
      s = s.replace(/\u200E(\d+)([,.!?:])\u200E(?=[ \t\u00A0]*[\u0590-\u08FF])/g, (_m, num, p) => {
        return `${LRM}${num}${LRM}${p}${RLM}${LRM}`;
      });
      s = s.replace(/(^|[^\u200E])(\d+)([,.!?:])(?=[ \t\u00A0]*[\u0590-\u08FF])/g, (_m, pre, num, p) => {
        return `${pre}${num}${LRM}${p}${RLM}`;
      });
      return s;
    };

    const out = stabilized.split(/\r?\n/).map(wrapLine).join('\n');
    return RLM + fixNumberTrailingPunct(out);
  }

  function acrobatBidiFixFormatScript(): string {
    return [
      '(function(){',
      'try{',
      'var RLM="\\u200F",LRM="\\u200E",NBSP="\\u00A0";',
      'var v=(event&&event.value!=null)?String(event.value):"";',
      'v=v.replace(/[\\u200E\\u200F\\u202A\\u202B\\u202C\\u202D\\u202E\\u2066\\u2067\\u2068\\u2069]/g,"");',
      'if(!v){event.value=RLM;return;}',
      'v=v.replace(/([\\u0590-\\u08FF\\)\\]\\}:;,.!?])([ \\t]+)(?=[A-Za-z0-9])/g,function(_m,a){return a+NBSP;});',
      'v=v.replace(/([A-Za-z0-9])([ \\t]+)(?=[\\u0590-\\u08FF])/g,function(_m,a){return a+NBSP;});',
      'var TOKEN="[A-Za-z0-9][A-Za-z0-9\\\\-\\\\._:@/\\\\\\\\+\\\\(\\\\)\\\\[\\\\]\\\\{\\\\}%&\\\\*\\\\#\\\\!\\\\\\\'\\\\\"<>=,;:\\\\?]*";',
      'var re=new RegExp(TOKEN+"(?:[ \\t]+"+TOKEN+")*","g");',
      'var lines=v.split(/\\r?\\n/);',
      'for(var i=0;i<lines.length;i++){lines[i]=lines[i].replace(re,function(m){return LRM+m+LRM;});}',
      'v=lines.join("\\n");',
      'v=v.replace(new RegExp(LRM+"(\\\\d+)([,.!?:])"+LRM+"(?=[ \\t"+NBSP+"]*[\\\\u0590-\\\\u08FF])","g"),function(_m,n,p){return LRM+n+LRM+p+RLM+LRM;});',
      'v=v.replace(/(^|[^\\\\u200E])(\\\\d+)([,.!?:])(?=[ \\t\\\\u00A0]*[\\\\u0590-\\\\u08FF])/g,function(_m,pre,n,p){return pre+n+LRM+p+RLM;});',
      'event.value=RLM+v;',
      '}catch(_e){try{console&&console.warn&&console.warn("[WardrobePro][export][pdf-js] bidiFormat",_e);}catch(_e2){}}',
      '})();',
    ].join('');
  }

  return {
    splitDirectionalRuns,
    fixBidiForAcrobatText,
    acrobatBidiFixFormatScript,
  };
}
