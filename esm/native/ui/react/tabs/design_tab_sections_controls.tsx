import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export function DesignTabTypeOption(props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  optionId?: string;
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'children'>;
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      className={props.selected ? 'type-option selected' : 'type-option'}
      data-testid={props.testId}
      data-option-id={props.optionId}
      {...props.buttonProps}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
