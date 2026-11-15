import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';

import { getViewerSearchEnabledTabs } from './sidebar_shared.js';
import { IconButton } from './components/IconButton.js';
import { useApp } from './hooks.js';
import {
  searchViewerDestinations,
  viewerSearchTabLabel,
  type ViewerSearchDestination,
} from './viewer_search_catalog.js';
import { navigateToViewerSearchDestination } from './viewer_search_navigation.js';

const MAX_RESULTS = 12;

export function ViewerSearchControl(): ReactElement {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultScroll = useRef<HTMLDivElement>(null);
  const resultListId = 'wp-viewer-search-results';
  const enabledTabs = useMemo(() => getViewerSearchEnabledTabs(app), [app]);
  const results = useMemo(
    () => searchViewerDestinations(query, enabledTabs, MAX_RESULTS),
    [query, enabledTabs]
  );
  const active = Math.min(selected, Math.max(results.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const doc = wrapper.current?.ownerDocument;
    if (!doc) return;
    const dismiss = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    doc.addEventListener('pointerdown', dismiss, true);
    return () => doc.removeEventListener('pointerdown', dismiss, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = resultScroll.current;
    const option = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.bottom > listRect.bottom) list.scrollTop += optionRect.bottom - listRect.bottom;
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
  }, [active, open, results]);

  const choose = (destination: ViewerSearchDestination) => {
    navigateToViewerSearchDestination(app, destination);
    setOpen(false);
    setQuery('');
    setSelected(0);
  };

  const handleKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    // Viewer keyboard shortcuts must not react while the user is typing a query.
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(
        index => (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % (results.length || 1)
      );
      return;
    }
    if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="wp-viewer-search" ref={wrapper}>
      <IconButton
        variant="camera"
        className={`wp-viewer-search-btn hint-bottom wp-r-styled-tooltip${open ? ' is-on' : ''}`}
        data-tooltip="חיפוש אפשרות בארון"
        aria-label="חיפוש אפשרות בארון"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="viewer-search-button"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(value => !value);
        }}
      >
        <i className="fas fa-search" aria-hidden="true" />
      </IconButton>
      {open ? (
        <div
          role="dialog"
          aria-label="חיפוש אפשרות"
          className="wp-viewer-search-popover"
          data-testid="viewer-search-popover"
          onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        >
          <div className="wp-viewer-search-input-wrap">
            <i className="fas fa-search" aria-hidden="true" />
            <input
              ref={input}
              id="wp-viewer-search-input"
              name="viewerSearch"
              type="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder="איזו אפשרות מחפשים?"
              aria-label="חיפוש בתפריטים"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={resultListId}
              aria-activedescendant={results.length ? `wp-viewer-search-result-${active}` : undefined}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              onKeyDown={handleKeys}
              onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => event.stopPropagation()}
              data-testid="viewer-search-input"
            />
            <button
              type="button"
              className="wp-viewer-search-close"
              aria-label="סגור חיפוש"
              onClick={() => setOpen(false)}
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
          <div
            ref={resultScroll}
            className="wp-viewer-search-results"
            id={resultListId}
            role="listbox"
            aria-label="תוצאות חיפוש"
          >
            {results.length ? (
              results.map((result, index) => (
                <button
                  key={result.id}
                  id={`wp-viewer-search-result-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`wp-viewer-search-result${index === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setSelected(index)}
                  onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
                  onClick={() => choose(result)}
                  data-testid={`viewer-search-result-${result.id}`}
                >
                  <span className="wp-viewer-search-result-title">{result.label}</span>
                  <span className="wp-viewer-search-result-tab">{viewerSearchTabLabel(result.tab)}</span>
                </button>
              ))
            ) : (
              <div className="wp-viewer-search-empty">לא נמצאה אפשרות מתאימה</div>
            )}
          </div>
          <div className="wp-viewer-search-hint">↑ ↓ לבחירה · Enter לפתיחה · Esc לסגירה</div>
        </div>
      ) : null}
    </div>
  );
}
