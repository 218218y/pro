export type StandardCabinetTextureKind = 'wood' | 'wood-dark' | 'stone' | 'textile' | 'melamine';

export type StandardCabinetSwatch = {
  id: string;
  name: string;
  type: 'color' | 'texture';
  value: string;
  textureKind: StandardCabinetTextureKind | null;
  textureData: string | null;
};

type TextureSvgOptions = {
  base: string;
  line: string;
  highlight: string;
  kind: StandardCabinetTextureKind | null;
};

function encodeSvg(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(
    /[!'()*]/g,
    ch => `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  );
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

function makeTextureSvg(options: TextureSvgOptions): string | null {
  const { base, line, highlight, kind } = options;
  if (!kind) return null;

  if (kind === 'stone') {
    return encodeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
        `<rect width="96" height="96" fill="${base}"/>` +
        `<path d="M-8 18 C16 8 26 32 48 19 S76 2 104 18" fill="none" stroke="${highlight}" stroke-width="2" opacity=".18"/>` +
        `<path d="M-5 62 C18 45 35 72 58 55 S78 42 104 64" fill="none" stroke="${line}" stroke-width="2" opacity=".16"/>` +
        `<circle cx="21" cy="31" r="2.4" fill="${line}" opacity=".12"/>` +
        `<circle cx="73" cy="24" r="1.8" fill="${highlight}" opacity=".16"/>` +
        `<circle cx="47" cy="76" r="2.2" fill="${line}" opacity=".12"/>` +
        `</svg>`
    );
  }

  if (kind === 'textile') {
    return encodeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="${base}"/>` +
        `<path d="M0 9 H72 M0 21 H72 M0 33 H72 M0 45 H72 M0 57 H72 M0 69 H72" stroke="${highlight}" stroke-width="1" opacity=".17"/>` +
        `<path d="M6 0 V72 M18 0 V72 M30 0 V72 M42 0 V72 M54 0 V72 M66 0 V72" stroke="${line}" stroke-width="1" opacity=".14"/>` +
        `<path d="M0 0 L72 72 M-36 0 L72 108 M0 -36 L108 72" stroke="${highlight}" stroke-width="1" opacity=".08"/>` +
        `</svg>`
    );
  }

  if (kind === 'melamine') {
    return encodeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
        `<rect width="80" height="80" fill="${base}"/>` +
        `<path d="M0 20 H80 M0 41 H80 M0 62 H80" stroke="${highlight}" stroke-width="1" opacity=".13"/>` +
        `<path d="M0 29 H80 M0 52 H80" stroke="${line}" stroke-width="1" opacity=".08"/>` +
        `<rect x="0" y="0" width="80" height="80" fill="none" stroke="${highlight}" stroke-width="2" opacity=".06"/>` +
        `</svg>`
    );
  }

  const darkExtra =
    kind === 'wood-dark'
      ? `<path d="M0 18 C22 10 38 27 58 16 S84 7 100 22" fill="none" stroke="${highlight}" stroke-width="2" opacity=".12"/>`
      : '';
  return encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
      `<rect width="96" height="96" fill="${base}"/>` +
      `<path d="M9 0 C4 24 15 42 8 96 M26 0 C34 22 19 49 29 96 M48 0 C42 30 57 52 49 96 M69 0 C77 28 61 61 73 96 M88 0 C82 21 92 58 86 96" fill="none" stroke="${line}" stroke-width="3" opacity=".22"/>` +
      `<path d="M0 12 C25 3 41 22 64 10 S88 6 103 17 M-7 54 C15 43 29 66 52 50 S80 42 105 58" fill="none" stroke="${highlight}" stroke-width="2" opacity=".2"/>` +
      darkExtra +
      `<path d="M0 0 H96 V96 H0 Z" fill="none" stroke="${line}" stroke-width="2" opacity=".08"/>` +
      `</svg>`
  );
}

function makeStandardSwatch(args: {
  id: string;
  name: string;
  value: string;
  textureKind?: StandardCabinetTextureKind | null;
  line?: string;
  highlight?: string;
}): StandardCabinetSwatch {
  const textureKind = args.textureKind ?? null;
  return {
    id: args.id,
    name: args.name,
    type: textureKind ? 'texture' : 'color',
    value: args.value,
    textureKind,
    textureData: makeTextureSvg({
      base: args.value,
      line: args.line || 'rgba(0,0,0,.45)',
      highlight: args.highlight || 'rgba(255,255,255,.55)',
      kind: textureKind,
    }),
  };
}

export const STANDARD_CABINET_COLOR_SWATCHES: readonly StandardCabinetSwatch[] = Object.freeze([
  makeStandardSwatch({ id: 'default_#ffffff', name: 'לבן שלג 8681BS', value: '#ffffff' }),
  makeStandardSwatch({
    id: 'default_#f2f0eb',
    name: 'ונילה / שמנת 0564B5',
    value: '#f2f0eb',
    textureKind: 'melamine',
    line: 'rgba(74,72,68,.42)',
    highlight: 'rgba(255,255,255,.68)',
  }),
  makeStandardSwatch({
    id: 'default_#b8afa4',
    name: 'קשמיר 5981B5',
    value: '#b8afa4',
    textureKind: 'melamine',
    line: 'rgba(83,76,68,.35)',
    highlight: 'rgba(255,255,255,.5)',
  }),
  makeStandardSwatch({
    id: 'default_#eaddcf',
    name: 'אלון מבוקע בהיר 2020',
    value: '#eaddcf',
    textureKind: 'wood',
    line: 'rgba(128,89,50,.45)',
    highlight: 'rgba(255,255,255,.48)',
  }),
  makeStandardSwatch({
    id: 'default_#d7c0a1',
    name: 'אלון חול שטרייף K543SN',
    value: '#d7c0a1',
    textureKind: 'wood',
    line: 'rgba(117,82,49,.48)',
    highlight: 'rgba(255,248,231,.5)',
  }),
  makeStandardSwatch({
    id: 'default_#c4935f',
    name: 'אלון דבש מבוקע K358PW',
    value: '#c4935f',
    textureKind: 'wood',
    line: 'rgba(94,58,26,.52)',
    highlight: 'rgba(255,220,153,.36)',
  }),
  makeStandardSwatch({
    id: 'default_#a08060',
    name: 'אגוז טבעי',
    value: '#a08060',
    textureKind: 'wood',
    line: 'rgba(65,42,24,.54)',
    highlight: 'rgba(241,204,162,.28)',
  }),
  makeStandardSwatch({
    id: 'default_#6f4c34',
    name: 'אגוז אמריקאי K087 PW',
    value: '#6f4c34',
    textureKind: 'wood',
    line: 'rgba(35,22,14,.58)',
    highlight: 'rgba(212,157,100,.24)',
  }),
  makeStandardSwatch({
    id: 'default_#4a4b4f',
    name: 'וונגה',
    value: '#4a4b4f',
    textureKind: 'wood-dark',
    line: 'rgba(9,9,10,.55)',
    highlight: 'rgba(140,126,105,.18)',
  }),
  makeStandardSwatch({
    id: 'default_#1e1f1f',
    name: 'אלון שחור  0190SW',
    value: '#1e1f1f',
    textureKind: 'wood-dark',
    line: 'rgba(0,0,0,.7)',
    highlight: 'rgba(150,150,145,.18)',
  }),
  makeStandardSwatch({
    id: 'default_#3f4245',
    name: 'אפור גרפיט 0164PE',
    value: '#3f4245',
    textureKind: 'melamine',
    line: 'rgba(0,0,0,.42)',
    highlight: 'rgba(185,190,193,.18)',
  }),
  makeStandardSwatch({
    id: 'default_#8a8780',
    name: 'אפור אבן 0112BS',
    value: '#8a8780',
    textureKind: 'stone',
    line: 'rgba(54,52,49,.38)',
    highlight: 'rgba(232,228,218,.28)',
  }),
  makeStandardSwatch({
    id: 'default_#6f7373',
    name: 'טקסטיל אפור D4980SX',
    value: '#6f7373',
    textureKind: 'textile',
    line: 'rgba(31,34,34,.36)',
    highlight: 'rgba(220,224,224,.2)',
  }),
]);

export function getStandardCabinetTextureKind(value: unknown): StandardCabinetTextureKind | null {
  const hex = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!hex) return null;
  const found = STANDARD_CABINET_COLOR_SWATCHES.find(swatch => swatch.value.toLowerCase() === hex);
  return found?.textureKind || null;
}
