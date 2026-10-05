#!/usr/bin/env node

// Validate public/order_template.pdf AcroForm integrity.
// Goal: fail fast when the template was "re-saved" by a tool that corrupts
// /AcroForm (Fields list) or /DR/Font (fonts referenced by /DA).
//
// Usage:
//   node tools/wp_pdf_template_check.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFString, PDFHexString } from 'pdf-lib';

const EXPECTED_PAGE_SIZE = Object.freeze({ width: 595.2756, height: 841.8898 });
const GEOMETRY_TOLERANCE = 0.05;
const MAX_TEMPLATE_BYTES = 512 * 1024;
const REQUIRED_TEXT_FIELDS = Object.freeze({
  order_number: Object.freeze({ x: 411.7, y: 699.0, width: 82.2, height: 16.5 }),
  order_date: Object.freeze({ x: 34.5, y: 699.0, width: 82.2, height: 16.5 }),
  customer_name: Object.freeze({ x: 370.5, y: 625.3, width: 163.3, height: 17.0 }),
  phone: Object.freeze({ x: 204.6, y: 626.3, width: 115.6, height: 17.0 }),
  mobile: Object.freeze({ x: 38.7, y: 626.3, width: 124.7, height: 17.0 }),
  address: Object.freeze({ x: 38.7, y: 597.8, width: 404.055, height: 17.0 }),
  order_details: Object.freeze({ x: 34.0, y: 150.0, width: 526.0, height: 414.0 }),
  notes: Object.freeze({ x: 34.0, y: 66.0, width: 526.0, height: 49.0 }),
});

function nearlyEqual(actual, expected, tolerance = GEOMETRY_TOLERANCE) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function describeRect(rect) {
  if (!rect) return 'missing';
  return `x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`;
}

function resolveProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

function fail(msg, details = []) {
  console.error(`\n❌ order_template.pdf is not valid for interactive exports.`);
  console.error(msg);
  if (details.length) {
    console.error('\nDetails:');
    for (const d of details) console.error(`- ${d}`);
  }
  console.error(
    '\nFix: edit the template in Acrobat "Prepare Form" and save (do NOT Print-to-PDF / re-write with generic PDF tools).\n'
  );
  process.exit(2);
}

function ok(msg) {
  console.log(`\n✅ ${msg}`);
}

function asText(obj) {
  try {
    if (!obj) return '';
    if (obj instanceof PDFString) return obj.asString();
    if (obj instanceof PDFHexString) return obj.decodeText();
    if (typeof obj.decodeText === 'function') return obj.decodeText();
    if (typeof obj.asString === 'function') return obj.asString();
    return String(obj);
  } catch {
    return '';
  }
}

function parseFontNamesFromDA(da) {
  // DA looks like: /Helv 11 Tf 0 g
  const s = typeof da === 'string' ? da : asText(da);
  const out = new Set();
  const re = /\/([A-Za-z0-9_+\-\.]+)\s+\d+(?:\.\d+)?\s+Tf/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1]) out.add(m[1]);
  }
  return Array.from(out);
}

async function main() {
  const root = resolveProjectRoot();
  const p = path.join(root, 'public', 'order_template.pdf');
  if (!fs.existsSync(p)) {
    fail('Missing file: public/order_template.pdf');
  }
  const bytes = fs.readFileSync(p);
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(bytes);
  } catch (e) {
    fail('Failed to parse PDF (corrupt file?)', [String(e && e.message ? e.message : e)]);
  }

  const form = pdfDoc.getForm();
  const ctx = pdfDoc.context;

  // AcroForm
  const acroFormObj = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroForm = acroFormObj ? ctx.lookup(acroFormObj, PDFDict) : null;
  if (!acroForm) {
    fail('The PDF has no /AcroForm dictionary (interactive fields were removed).');
  }

  // Fields array
  const fieldsObj = acroForm.get(PDFName.of('Fields'));
  const fieldsArr = fieldsObj ? ctx.lookup(fieldsObj, PDFArray) : null;
  if (!fieldsArr) {
    fail('The PDF /AcroForm has no /Fields array (fields list is missing).');
  }

  const badFields = [];
  for (let i = 0; i < fieldsArr.size(); i++) {
    const it = fieldsArr.get(i);
    const ref = it instanceof PDFRef ? it : null;
    const resolved = ref ? ctx.lookup(ref) : ctx.lookup(it);
    const dict = resolved instanceof PDFDict ? resolved : null;
    if (!dict) {
      badFields.push(`Fields[${i}] is not a dictionary reference.`);
      continue;
    }
    const type = dict.get(PDFName.of('Type'));
    const typeName = type && type.name ? type.name : '';
    if (typeName === 'Catalog') {
      badFields.push(`Fields[${i}] incorrectly points to the document Catalog.`);
    }
  }
  if (badFields.length) {
    fail('The template /AcroForm/Fields contains invalid entries.', badFields);
  }

  const pages = pdfDoc.getPages();
  if (pages.length !== 1) {
    fail('The order template must contain exactly one primary form page.', [
      `Expected pages: 1`,
      `Actual pages: ${pages.length}`,
    ]);
  }
  const pageSize = pages[0]?.getSize?.();
  if (
    !pageSize ||
    !nearlyEqual(pageSize.width, EXPECTED_PAGE_SIZE.width) ||
    !nearlyEqual(pageSize.height, EXPECTED_PAGE_SIZE.height)
  ) {
    fail('The order template page size does not match the canonical A4 template geometry.', [
      `Expected: ${EXPECTED_PAGE_SIZE.width} x ${EXPECTED_PAGE_SIZE.height} pt`,
      `Actual: ${pageSize ? `${pageSize.width} x ${pageSize.height} pt` : 'unavailable'}`,
    ]);
  }

  // Required field names and widget rectangles. These coordinates are the contract used by
  // the browser overlay, text-import fallback, raster export, and interactive PDF export.
  const required = Object.keys(REQUIRED_TEXT_FIELDS);
  const missing = [];
  const geometryErrors = [];
  for (const name of required) {
    let field;
    try {
      field = form.getTextField(name);
    } catch {
      missing.push(name);
      continue;
    }

    const widgets = field?.acroField?.getWidgets?.() || [];
    if (widgets.length !== 1) {
      geometryErrors.push(`${name}: expected exactly one widget, found ${widgets.length}`);
      continue;
    }
    const actual = widgets[0]?.getRectangle?.();
    const expected = REQUIRED_TEXT_FIELDS[name];
    if (
      !actual ||
      !nearlyEqual(actual.x, expected.x) ||
      !nearlyEqual(actual.y, expected.y) ||
      !nearlyEqual(actual.width, expected.width) ||
      !nearlyEqual(actual.height, expected.height)
    ) {
      geometryErrors.push(`${name}: expected ${describeRect(expected)}; actual ${describeRect(actual)}`);
    }
  }
  if (missing.length) {
    fail(
      'The template is missing required text fields.',
      missing.map(n => `Missing field: ${n}`)
    );
  }
  if (geometryErrors.length) {
    fail('The template field geometry does not match the application field contract.', geometryErrors);
  }

  // Font resources referenced by /DA must exist under /AcroForm/DR/Font.
  const drObj = acroForm.get(PDFName.of('DR'));
  const dr = drObj ? ctx.lookup(drObj, PDFDict) : null;
  const fontObj = dr ? dr.get(PDFName.of('Font')) : null;
  const fontDict = fontObj ? ctx.lookup(fontObj, PDFDict) : null;

  const referenced = new Set(parseFontNamesFromDA(acroForm.get(PDFName.of('DA'))));
  for (const name of required) {
    let field;
    try {
      field = form.getTextField(name);
    } catch {
      continue;
    }
    const acroField = field && field.acroField;
    const d = acroField && acroField.dict;
    const da = d && d.get(PDFName.of('DA'));
    for (const fn of parseFontNamesFromDA(da)) referenced.add(fn);

    // Widgets can override DA
    const widgets = acroField && typeof acroField.getWidgets === 'function' ? acroField.getWidgets() : [];
    for (const w of widgets || []) {
      const wd = w && w.dict;
      const wda = wd && wd.get(PDFName.of('DA'));
      for (const fn of parseFontNamesFromDA(wda)) referenced.add(fn);
    }
  }

  if (referenced.size) {
    if (!fontDict) {
      fail('The template /AcroForm is missing /DR/Font resources, but fields reference fonts in /DA.', [
        `Referenced fonts: ${Array.from(referenced).join(', ')}`,
      ]);
    }
    const missingFonts = [];
    for (const fn of referenced) {
      const has = fontDict.get(PDFName.of(fn));
      if (!has) missingFonts.push(fn);
    }
    if (missingFonts.length) {
      fail('The template references fonts in /DA that are not present in /AcroForm/DR/Font.', [
        `Missing fonts: ${missingFonts.join(', ')}`,
      ]);
    }

    const unusedFonts = fontDict
      .keys()
      .map(key => (typeof key.decodeText === 'function' ? key.decodeText() : String(key).replace(/^\//, '')))
      .filter(name => !referenced.has(name));
    if (unusedFonts.length) {
      fail(
        'The template contains unused /AcroForm/DR/Font resources that unnecessarily bloat the production asset.',
        [
          `Unused form fonts: ${unusedFonts.join(', ')}`,
          'Remove only unused AcroForm font resources; do not rasterize or flatten the PDF.',
        ]
      );
    }
  }

  if (bytes.length > MAX_TEMPLATE_BYTES) {
    fail('The interactive order template exceeds the production asset size budget.', [
      `Maximum: ${MAX_TEMPLATE_BYTES} bytes (512 KiB)`,
      `Actual: ${bytes.length} bytes`,
      'Keep vector/page content and form fields intact; optimize redundant PDF resources instead of reducing render quality.',
    ]);
  }

  ok(`order_template.pdf AcroForm looks sane (${bytes.length} bytes).`);
}

main().catch(e => {
  fail('Unexpected error while validating the template.', [String(e && e.message ? e.message : e)]);
});
