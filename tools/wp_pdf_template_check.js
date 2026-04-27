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

  // Required field names
  const required = ['מלל1', '0', '1', '2', '3', '4', '5', '6'];
  const missing = [];
  for (const name of required) {
    try {
      form.getTextField(name);
    } catch {
      missing.push(name);
    }
  }
  if (missing.length) {
    fail(
      'The template is missing required text fields.',
      missing.map(n => `Missing field: ${n}`)
    );
  }

  // Font resources referenced by /DA must exist under /AcroForm/DR/Font.
  const drObj = acroForm.get(PDFName.of('DR'));
  const dr = drObj ? ctx.lookup(drObj, PDFDict) : null;
  const fontObj = dr ? dr.get(PDFName.of('Font')) : null;
  const fontDict = fontObj ? ctx.lookup(fontObj, PDFDict) : null;

  const referenced = new Set();
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
  }

  ok('order_template.pdf AcroForm looks sane.');
}

main().catch(e => {
  fail('Unexpected error while validating the template.', [String(e && e.message ? e.message : e)]);
});
