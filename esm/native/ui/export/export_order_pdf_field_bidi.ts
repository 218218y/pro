// Unicode bidi reordering used ONLY for vector AcroForm /AP painting.
// The editable /V string remains in logical reading order.
// Adapted from Mozilla PDF.js 6.4.299 src/core/bidi.js (Apache-2.0).
// Copyright 2024 Mozilla Foundation. Licensed under Apache License, Version 2.0.
// https://www.apache.org/licenses/LICENSE-2.0

const baseTypes: string[] = [
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'S',
  'B',
  'S',
  'WS',
  'B',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'B',
  'B',
  'B',
  'S',
  'WS',
  'ON',
  'ON',
  'ET',
  'ET',
  'ET',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'ES',
  'CS',
  'ES',
  'CS',
  'CS',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'CS',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'ON',
  'ON',
  'ON',
  'ON',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'B',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'BN',
  'CS',
  'ON',
  'ET',
  'ET',
  'ET',
  'ET',
  'ON',
  'ON',
  'ON',
  'ON',
  'L',
  'ON',
  'ON',
  'BN',
  'ON',
  'ON',
  'ET',
  'ET',
  'EN',
  'EN',
  'ON',
  'L',
  'ON',
  'ON',
  'ON',
  'EN',
  'L',
  'ON',
  'ON',
  'ON',
  'ON',
  'ON',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'ON',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'ON',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
  'L',
];
const arabicTypes: string[] = [
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'ON',
  'ON',
  'AL',
  'ET',
  'ET',
  'AL',
  'CS',
  'AL',
  'ON',
  'ON',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'AL',
  'AL',
  '',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'AN',
  'ET',
  'AN',
  'AN',
  'AL',
  'AL',
  'AL',
  'NSM',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'AN',
  'ON',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'AL',
  'AL',
  'NSM',
  'NSM',
  'ON',
  'NSM',
  'NSM',
  'NSM',
  'NSM',
  'AL',
  'AL',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'EN',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
  'AL',
];
function isOdd(i: number): boolean {
  return (i & 1) !== 0;
}
function isEven(i: number): boolean {
  return (i & 1) === 0;
}
function findUnequal(arr: string[], start: number, value: string): number {
  let j: number, jj: number;
  for (j = start, jj = arr.length; j < jj; ++j) {
    if (arr[j] !== value) {
      return j;
    }
  }
  return j;
}
function reverseValues(arr: string[], start: number, end: number): void {
  for (let i = start, j = end - 1; i < j; ++i, --j) {
    const temp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = temp!;
  }
}
function bidi(str: string, startLevel = 1): string {
  const strLength = str.length;
  if (strLength === 0) return str;
  const chars: string[] = str.split('');
  const types: string[] = new Array(strLength);
  let numBidi = 0;
  let i: number, ii: number;
  for (i = 0; i < strLength; ++i) {
    chars[i] = str.charAt(i);
    const charCode = str.charCodeAt(i);
    let charType = 'L';
    if (charCode <= 0x00ff) {
      charType = baseTypes[charCode] ?? 'ON';
    } else if (0x0590 <= charCode && charCode <= 0x05ff) {
      charType = 'R';
    } else if (0x0600 <= charCode && charCode <= 0x06ff) {
      charType = arabicTypes[charCode & 0xff] ?? 'AL';
      if (!charType) {
        charType = 'AL';
      }
    } else if (
      (0x0700 <= charCode && charCode <= 0x08ac) ||
      (0xfb50 <= charCode && charCode <= 0xfdff) ||
      (0xfe70 <= charCode && charCode <= 0xfeff)
    ) {
      charType = 'AL';
    }
    if (charType === 'R' || charType === 'AL' || charType === 'AN') {
      numBidi++;
    }
    types[i] = charType;
  }
  if (numBidi === 0) {
    return str;
  }
  if (startLevel === -1) {
    if (numBidi / strLength < 0.3 && strLength > 4) {
      startLevel = 0;
    } else {
      startLevel = 1;
    }
  }
  const levels: number[] = new Array(strLength).fill(startLevel);
  for (i = 0; i < strLength; ++i) {
    levels[i] = startLevel;
  }
  const e = isOdd(startLevel) ? 'R' : 'L';
  const sor = e;
  const eor = sor;
  let lastType = sor;
  for (i = 0; i < strLength; ++i) {
    if (types[i] === 'NSM') {
      types[i] = lastType;
    } else {
      lastType = types[i]!;
    }
  }
  lastType = sor;
  let t: string;
  for (i = 0; i < strLength; ++i) {
    t = types[i]!;
    if (t === 'EN') {
      types[i] = lastType === 'AL' ? 'AN' : 'EN';
    } else if (t === 'R' || t === 'L' || t === 'AL') {
      lastType = t;
    }
  }
  for (i = 0; i < strLength; ++i) {
    t = types[i]!;
    if (t === 'AL') {
      types[i] = 'R';
    }
  }
  for (i = 1; i < strLength - 1; ++i) {
    if (types[i] === 'ES' && types[i - 1] === 'EN' && types[i + 1] === 'EN') {
      types[i] = 'EN';
    }
    if (
      types[i] === 'CS' &&
      (types[i - 1] === 'EN' || types[i - 1] === 'AN') &&
      types[i + 1] === types[i - 1]
    ) {
      types[i] = types[i - 1]!;
    }
  }
  for (i = 0; i < strLength; ++i) {
    if (types[i] === 'EN') {
      for (let j = i - 1; j >= 0; --j) {
        if (types[j] !== 'ET') {
          break;
        }
        types[j] = 'EN';
      }
      for (let j = i + 1; j < strLength; ++j) {
        if (types[j] !== 'ET') {
          break;
        }
        types[j] = 'EN';
      }
    }
  }
  for (i = 0; i < strLength; ++i) {
    t = types[i]!;
    if (t === 'WS' || t === 'ES' || t === 'ET' || t === 'CS') {
      types[i] = 'ON';
    }
  }
  lastType = sor;
  for (i = 0; i < strLength; ++i) {
    t = types[i]!;
    if (t === 'EN') {
      types[i] = lastType === 'L' ? 'L' : 'EN';
    } else if (t === 'R' || t === 'L') {
      lastType = t;
    }
  }
  for (i = 0; i < strLength; ++i) {
    if (types[i] === 'ON') {
      const end = findUnequal(types, i + 1, 'ON');
      let before = sor;
      for (let j = i - 1; j >= 0; j--) {
        const tt = types[j];
        if (tt === 'L') {
          before = 'L';
          break;
        }
        if (tt === 'R' || tt === 'EN' || tt === 'AN') {
          before = 'R';
          break;
        }
      }
      let after = eor;
      for (let j = end; j < strLength; j++) {
        const tt = types[j];
        if (tt === 'L') {
          after = 'L';
          break;
        }
        if (tt === 'R' || tt === 'EN' || tt === 'AN') {
          after = 'R';
          break;
        }
      }
      if (before === after) {
        types.fill(before, i, end);
      }
      i = end - 1;
    }
  }
  for (i = 0; i < strLength; ++i) {
    if (types[i] === 'ON') {
      types[i] = e;
    }
  }
  for (i = 0; i < strLength; ++i) {
    t = types[i]!;
    if (isEven(levels[i]!)) {
      if (t === 'R') {
        levels[i] = levels[i]! + 1;
      } else if (t === 'AN' || t === 'EN') {
        levels[i] = levels[i]! + 2;
      }
    } else if (t === 'L' || t === 'AN' || t === 'EN') {
      levels[i] = levels[i]! + 1;
    }
  }
  let highestLevel = -1;
  let lowestOddLevel = 99;
  let level: number;
  for (i = 0, ii = levels.length; i < ii; ++i) {
    level = levels[i]!;
    if (highestLevel < level) {
      highestLevel = level;
    }
    if (lowestOddLevel > level && isOdd(level)) {
      lowestOddLevel = level;
    }
  }
  for (level = highestLevel; level >= lowestOddLevel; --level) {
    let start = -1;
    for (i = 0, ii = levels.length; i < ii; ++i) {
      if (levels[i]! < level) {
        if (start >= 0) {
          reverseValues(chars, start, i);
          start = -1;
        }
      } else if (start < 0) {
        start = i;
      }
    }
    if (start >= 0) {
      reverseValues(chars, start, levels.length);
    }
  }
  return chars.join('');
}

// Ignore field-only directional controls in the painted appearance, but do not
// strip or reorder the actual saved field value (needed by Acrobat and search).
const PDF_BIDI_CONTROL_CHARS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

export function visualOrderForPdfFieldAppearance(text: string): string {
  return String(text || '')
    .replace(PDF_BIDI_CONTROL_CHARS, '')
    .split(/\r?\n/)
    .map(line => bidi(line, 1))
    .join('\n');
}
