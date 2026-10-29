# A4 export for wardrobe visuals

## Observed issue

The sample order PDF has an A4 first page (595.28 × 841.89 PDF points). Its
second page is an image-only page with a 1533 × 2242 pixel image; Acrobat
converted those pixels to a 1003.42 × 1467.49 point page (110 px/in),
which makes the page roughly 69% wider than A4. The clipboard contains a PNG,
not a page-size contract. Scaling down its pixels to mimic the observed
Acrobat resolution would unnecessarily reduce detail and remain dependent on
Acrobat's conversion settings.

## Implemented behavior

Settings > Image exports now offers two additional buttons:

- **Open/Closed PDF A4**: exports one A4 PDF page with both cabinet views.
- **Sketch/Render PDF A4**: exports one A4 PDF page with both views.

Original clipboard image exports are unchanged. The new route reuses the
existing screenshot/camera/notes/branding capture, encodes PNG at full native
resolution, places it **once** on an explicit 210 × 297 mm PDF page using
uniform `contain` scaling and 18 pt white margins, and downloads the PDF.
Placement shares its math with the existing order PDF image pages.

To add the exported page to an existing Acrobat document: **Organize Pages** >
**Insert** > **From File**, choose the downloaded A4 PDF and select its location.
Do not use Create PDF from Clipboard for this use case. The original order
form's fields are not modified by the new export.

The A4 layout is portrait. If a viewport is unusually wide, white space is
added rather than stretching the cabinet image. Successful download feedback
appears only after the browser accepts the download action.
