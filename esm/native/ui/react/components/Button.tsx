import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'primary' | 'save' | 'delete' | 'accent' | 'light' | 'success' | 'header';

type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  inline?: boolean;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function variantToClass(v: ButtonVariant | undefined): string {
  switch (v) {
    case 'primary':
      return 'btn btn-primary';
    case 'save':
      return 'btn btn-save';
    case 'delete':
      return 'btn btn-delete';
    case 'accent':
      return 'btn btn-accent';
    case 'light':
      return 'btn btn-light';
    case 'success':
      return 'btn btn-success';
    case 'header':
      return 'header-btn-small wp-r-btn-small';
    case 'default':
    default:
      return 'btn';
  }
}

export function Button(props: ButtonProps) {
  const { variant = 'default', size = 'md', inline = false, className, type, ...rest } = props;

  const classes =
    variant === 'header'
      ? cx(variantToClass(variant), className)
      : cx(variantToClass(variant), inline && 'btn-inline', size === 'sm' && 'btn-sm', className);

  return <button {...rest} type={type ?? 'button'} className={classes} />;
}
