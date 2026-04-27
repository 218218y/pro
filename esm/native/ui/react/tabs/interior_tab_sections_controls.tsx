import type { ReactElement } from 'react';

import { OptionBtn, cx } from './interior_tab_helpers.js';
import type {
  InteriorEdgeHandleVariantRowProps,
  InteriorToolCardHeaderProps,
} from './interior_tab_sections_contracts.js';

export function InteriorToolCardHeader(props: InteriorToolCardHeaderProps): ReactElement {
  return (
    <div className="wp-header-row wp-mb-10">
      <div>
        <strong>{props.title}</strong>
      </div>
      {props.active && props.onExit ? (
        <button
          type="button"
          className="btn btn-danger btn-inline btn-sm"
          data-testid={props.exitButtonTestId}
          onClick={props.onExit}
        >
          סיום עריכה
        </button>
      ) : null}
    </div>
  );
}

export function InteriorEdgeHandleVariantRow(props: InteriorEdgeHandleVariantRowProps): ReactElement {
  return (
    <div className={cx('wp-row', 'wp-gap-8', 'wp-wrap', props.className)}>
      <OptionBtn
        className="wp-flex-1"
        selected={props.selectedVariant === 'short'}
        onClick={() => props.onSelect('short')}
      >
        רוכבת קצרה
      </OptionBtn>
      <OptionBtn
        className="wp-flex-1"
        selected={props.selectedVariant === 'long'}
        onClick={() => props.onSelect('long')}
      >
        רוכבת ארוכה
      </OptionBtn>
    </div>
  );
}
