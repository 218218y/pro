import type { CSSProperties } from 'react';

type ColorSwatchProps = {
  title: string;
  selected?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  onPick: () => void;
};

export function ColorSwatch(props: ColorSwatchProps) {
  const { title, selected = false, backgroundColor, backgroundImage, onPick } = props;

  const style: CSSProperties = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` }
    : backgroundColor
      ? { backgroundColor }
      : {};

  const className = 'color-dot-swatch wp-r-color-swatch' + (selected ? ' is-selected' : '');

  return (
    <div
      className={className}
      title={title}
      style={style}
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: import('react').KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onPick();
        }
      }}
    />
  );
}
