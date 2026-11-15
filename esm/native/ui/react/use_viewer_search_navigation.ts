import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { AppContainer, TabId } from '../../../../types';

import type { ViewerSearchDestination } from './viewer_search_catalog.js';
import { subscribeViewerSearchNavigation } from './viewer_search_navigation.js';
import { advanceViewerSearchNavigation, revealViewerSearchTarget } from './viewer_search_scroll.js';
import { useUiFeedback } from './hooks.js';

type PendingNavigation = { sequence: number; destination: ViewerSearchDestination };

export function useViewerSearchNavigation({
  app,
  activeTab,
  scrollRef,
  setActiveTab,
  canRenderTab,
}: {
  app: AppContainer;
  activeTab: TabId;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  setActiveTab: (tab: TabId) => void;
  canRenderTab: (tab: TabId) => boolean;
}): void {
  const feedback = useUiFeedback();
  const [pending, setPending] = useState<PendingNavigation | null>(null);

  useEffect(
    () =>
      subscribeViewerSearchNavigation(app, destination => {
        if (!canRenderTab(destination.tab)) {
          feedback.toast('הטאב המבוקש אינו זמין כרגע', 'info');
          return;
        }
        // A sequence forces navigation even if the user chooses the same item twice.
        setPending(previous => ({ sequence: (previous?.sequence ?? 0) + 1, destination }));
        setActiveTab(destination.tab);
      }),
    [app, canRenderTab, feedback, setActiveTab]
  );

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !pending || pending.destination.tab !== activeTab) return;
    const doc = scroller.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    const route = pending.destination;
    const acted = new Set<number>();
    let cancelled = false;
    let removeFlash: (() => void) | undefined;
    let timer: number | undefined;
    let elapsed = 0;
    const MAX_ATTEMPTS = 75; // covers lazy-loaded tab modules and async mode transitions

    const tick = () => {
      if (cancelled) return;
      const panel = scroller.querySelector<HTMLElement>(`.tab-content.active[data-tab="${route.tab}"]`);
      if (panel) {
        const result = advanceViewerSearchNavigation(panel, route, acted);
        if (result.progress === 'found' && result.target) {
          removeFlash = revealViewerSearchTarget(scroller, result.target);
          return;
        }
      }
      if (++elapsed >= MAX_ATTEMPTS) {
        feedback.toast(`לא ניתן לפתוח את ״${route.label}״ כעת`, 'info');
        return;
      }
      timer = view.setTimeout(tick, 80);
    };
    // Let both React roots complete the active-tab render before resolving its controls.
    timer = view.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      if (timer !== undefined) view.clearTimeout(timer);
      removeFlash?.();
    };
  }, [activeTab, feedback, pending, scrollRef]);
}
