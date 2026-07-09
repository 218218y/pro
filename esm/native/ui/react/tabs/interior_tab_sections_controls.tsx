import type { ReactElement } from 'react';

import { Button } from '../components/index.js';
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
        <Button variant="danger" inline size="sm" data-testid={props.exitButtonTestId} onClick={props.onExit}>
          סיום עריכה
        </Button>
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
