import type { ButtonHTMLAttributes } from 'react';

type IconButtonVariant = 'default' | 'step' | 'light' | 'header';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function variantToClass(v: IconButtonVariant | undefined): string {
  switch (v) {
    case 'step':
      // Used for +/- steppers (size handled by wp-r-step-btn styles)
      return 'wp-r-step-btn';
    case 'light':
      // Legacy button styling, but icon-sized
      return 'btn btn-light btn-inline btn-sm wp-r-icon-btn';
    case 'header':
      return 'header-btn-small wp-r-btn-small wp-r-icon-btn';
    case 'default':
    default:
      return 'wp-r-icon-btn';
  }
}

export function IconButton(props: IconButtonProps) {
  const { variant = 'default', className, type, ...rest } = props;
  return <button {...rest} type={type ?? 'button'} className={cx(variantToClass(variant), className)} />;
}
