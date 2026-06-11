import type { KeyboardEvent } from 'react';

export function handleSyntheticButtonKeyDown(
  event: Pick<KeyboardEvent<HTMLElement>, 'key' | 'preventDefault' | 'stopPropagation'>,
  onActivate: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  }
}
