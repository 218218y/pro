import type { ReactElement } from 'react';

import type { OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';

type OrderPdfSketchPanelHeaderProps = {
  activeEntry: OrderPdfSketchPreviewEntry | null;
  busy: boolean;
  error: string | null;
  entryCount: number;
};

export function OrderPdfSketchPanelHeader(props: OrderPdfSketchPanelHeaderProps): ReactElement {
  const { activeEntry, busy, error, entryCount } = props;
  return (
    <>
      <div className="wp-pdf-sketch-panel-head">
        <div className="wp-pdf-sketch-panel-titlebox">
          <div className="wp-pdf-sketch-panel-title">סקיצות לציור</div>
          <div className="wp-pdf-sketch-panel-subtitle">
            הציור נשמר על אותו עמוד גם אחרי יציאה וחזרה לעורך. הצבע והעובי נלקחים מהסרגל הימני.
          </div>
        </div>
        {activeEntry ? <div className="wp-pdf-sketch-panel-active">דף פעיל: {activeEntry.label}</div> : null}
      </div>

      {error ? <div className="wp-pdf-sketch-status is-error">{error}</div> : null}
      {busy ? <div className="wp-pdf-sketch-status">טוען את דפי הסקיצה מה‑PDF הנוכחי…</div> : null}
      {!busy && !entryCount ? (
        <div className="wp-pdf-sketch-status">
          אין כרגע דפי סקיצה זמינים להצגה. לחץ על רענון כדי לטעון אותם.
        </div>
      ) : null}
    </>
  );
}
