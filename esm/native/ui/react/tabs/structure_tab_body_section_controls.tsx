import type { ReactElement, ReactNode } from 'react';

import { OptionButton } from '../components/index.js';

export function StructureBodyTypeOptionButton(props: {
  key?: string | number;
  selected: boolean;
  label: ReactNode;
  iconClass?: string | undefined;
  title?: string | undefined;
  onClick: () => void;
  className?: string | undefined;
}): ReactElement {
  return (
    <OptionButton
      selected={props.selected}
      className={props.className || 'wp-r-type-option'}
      onClick={props.onClick}
      {...(props.title !== undefined ? { title: props.title } : {})}
      icon={props.iconClass ? <i className={props.iconClass} aria-hidden="true" /> : null}
    >
      <span className="wp-r-btn-label">{props.label}</span>
    </OptionButton>
  );
}
