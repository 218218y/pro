import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES,
  ORDER_PDF_SCALAR_FIELD_KEYS,
  applyNonEmptyOrderPdfScalarFieldValues,
  buildOrderPdfFieldValueMap,
  getOrderPdfFieldReadNames,
  hasAnyOrderPdfImportedDraftFieldValue,
  mergeOrderPdfScalarFieldValues,
  readOrderPdfImportedDraftFieldValues,
  readOrderPdfScalarFieldValues,
  resolveOrderPdfScalarFieldValues,
} from '../esm/native/ui/pdf/order_pdf_document_fields_runtime.ts';

test('order pdf document fields runtime reads scalar values and resolves project/date defaults canonically', () => {
  assert.deepEqual(readOrderPdfScalarFieldValues({ projectName: 'פרויקט', phone: 12345 }), {
    projectName: 'פרויקט',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '12345',
    mobile: '',
  });

  assert.deepEqual(
    resolveOrderPdfScalarFieldValues({
      source: { orderNumber: '17' },
      defaultProjectName: 'פרויקט ברירת מחדל',
      defaultOrderDate: '12/04/2026',
    }),
    {
      projectName: 'פרויקט ברירת מחדל',
      orderNumber: '17',
      orderDate: '12/04/2026',
      deliveryAddress: '',
      phone: '',
      mobile: '',
    }
  );
});

test('order pdf document fields runtime merges preferred scalar values over secondary source and applies only non-empty extracted values', () => {
  assert.deepEqual(
    mergeOrderPdfScalarFieldValues({
      preferred: { projectName: '', orderNumber: 'A-1', phone: '' },
      secondary: {
        projectName: 'פרויקט מקור',
        orderNumber: 'B-2',
        phone: '03-5555555',
        mobile: '050-1234567',
      },
      defaultProjectName: 'פרויקט ברירת מחדל',
    }),
    {
      projectName: 'פרויקט מקור',
      orderNumber: 'A-1',
      orderDate: '',
      deliveryAddress: '',
      phone: '03-5555555',
      mobile: '050-1234567',
    }
  );

  const next = applyNonEmptyOrderPdfScalarFieldValues({
    target: {
      projectName: 'ישן',
      orderNumber: 'ישן',
      orderDate: '',
      deliveryAddress: '',
      phone: '',
      mobile: '',
    },
    source: { projectName: '', orderNumber: 'חדש', phone: '03-7777777' },
  });
  assert.deepEqual(next, {
    projectName: 'ישן',
    orderNumber: 'חדש',
    orderDate: '',
    deliveryAddress: '',
    phone: '03-7777777',
    mobile: '',
  });
});

test('order pdf document fields runtime derives imported field names from canonical specs and joins overflow details', () => {
  const seen: string[][] = [];
  const readText = (names: readonly string[]): string => {
    seen.push([...names]);
    const first = names[0];
    switch (first) {
      case 'מלל1':
        return '1007';
      case '0':
        return '12/04/2026';
      case '1':
        return 'פרויקט יהלום';
      case '2':
        return 'רחוב הדוגמה 5';
      case '3':
        return '03-5555555';
      case '4':
        return '050-1234567';
      case '5':
        return 'פרט ראשון';
      case '6':
        return 'הערה חשובה';
      case 'wp_order_details_cont':
        return 'פרט המשך';
      default:
        return '';
    }
  };

  assert.deepEqual(readOrderPdfImportedDraftFieldValues(readText), {
    projectName: 'פרויקט יהלום',
    orderNumber: '1007',
    orderDate: '12/04/2026',
    deliveryAddress: 'רחוב הדוגמה 5',
    phone: '03-5555555',
    mobile: '050-1234567',
    manualDetails: 'פרט ראשון\nפרט המשך',
    notes: 'הערה חשובה',
  });

  assert.deepEqual(seen[0], [...getOrderPdfFieldReadNames('orderNumber')]);
  assert.deepEqual(seen[2], [...getOrderPdfFieldReadNames('projectName')]);
  assert.deepEqual(seen[ORDER_PDF_SCALAR_FIELD_KEYS.length], [...getOrderPdfFieldReadNames('details')]);
  assert.deepEqual(seen[ORDER_PDF_SCALAR_FIELD_KEYS.length + 1], [
    ...ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES,
  ]);
  assert.deepEqual(seen.at(-1), [...getOrderPdfFieldReadNames('notes')]);
  assert.equal(seen.length, ORDER_PDF_SCALAR_FIELD_KEYS.length + 3);
});

test('order pdf document fields runtime exposes canonical field-value map and meaningful import detection', () => {
  assert.deepEqual(
    buildOrderPdfFieldValueMap({
      scalarFields: {
        projectName: 'פרויקט טופז',
        orderNumber: '55',
        orderDate: '12/04/2026',
        deliveryAddress: 'בני ברק',
        phone: '03-5555555',
        mobile: '050-1234567',
      },
      details: 'טקסט פרטים',
      notes: 'טקסט הערות',
    }),
    {
      projectName: 'פרויקט טופז',
      orderNumber: '55',
      orderDate: '12/04/2026',
      deliveryAddress: 'בני ברק',
      phone: '03-5555555',
      mobile: '050-1234567',
      details: 'טקסט פרטים',
      notes: 'טקסט הערות',
    }
  );

  assert.equal(hasAnyOrderPdfImportedDraftFieldValue({ projectName: '  ' }), false);
  assert.equal(hasAnyOrderPdfImportedDraftFieldValue({ notes: 'יש הערה' }), true);
});
