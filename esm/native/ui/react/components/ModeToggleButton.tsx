import type { ButtonHTMLAttributes, ReactNode } from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ModeToggleButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onClick' | 'children'
> & {
  key?: string | number;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  children: ReactNode;
};

/**
 * A compact, unified "active/inactive" button style that matches the drawer divider edit-mode button.
 * Uses the existing global .type-option styling (inactive) + .selected (active).
 */
export function ModeToggleButton(props: ModeToggleButtonProps) {
  const { active = false, className, onClick, icon, iconPosition = 'start', children, ...rest } = props;

  return (
    <button
      {...rest}
      type="button"
      aria-pressed={active}
      className={cx(
        'type-option',
        'type-option--compact',
        'type-option--iconrow',
        'wp-r-editmode-toggle',
        active && 'selected',
        className
      )}
      onClick={(e: import('react').MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
    >
      {icon && iconPosition === 'start' ? <span className="wp-r-editmode-toggle__icon">{icon}</span> : null}
      <span className="wp-r-editmode-toggle__label">{children}</span>
      {icon && iconPosition === 'end' ? <span className="wp-r-editmode-toggle__icon">{icon}</span> : null}
    </button>
  );
}
