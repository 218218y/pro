import { Suspense } from 'react';
import type { MouseEvent, MutableRefObject } from 'react';

import { LazyErrorBoundary, TabsBar } from './components/index.js';
import { StructureTabView } from './tabs/StructureTab.view.js';
import { SidebarHeader } from './sidebar_header.js';
import { DeferredSidebarTabsLazy, TABS, prefetchDeferredSidebarTabs } from './sidebar_shared.js';
import { useSidebarViewState } from './use_sidebar_view_state.js';

function SidebarLockedView({
  enabledTabs,
  onSidebarBackgroundClick,
  scrollRef,
}: {
  enabledTabs: string[];
  onSidebarBackgroundClick: (e: MouseEvent<HTMLDivElement>) => void;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="wp-react">
      <SidebarHeader />
      <div className="scroll-content wp-r-scroll" ref={scrollRef} onClick={onSidebarBackgroundClick}>
        <div className="wp-r-site2-locked" data-wp-site2-locked="1">
          <div className="wp-r-site2-locked-title">הטאבים נעולים</div>
          <div className="wp-r-site2-locked-sub">
            {!enabledTabs.length
              ? 'לא הוגדרו טאבים ל-Site2 (config.site2EnabledTabs).'
              : 'צריך הפעלה מהאתר הראשי (מסונכרן אונליין).'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReactSidebarApp() {
  const {
    app,
    activeSafe,
    canRenderTab,
    enabledSet,
    enabledTabs,
    exportMounted,
    gateOpen,
    isSite2,
    onSidebarBackgroundClick,
    scrollRef,
    setActiveTab,
    shouldMountDeferredTabs,
    site2UiEnabled,
  } = useSidebarViewState();

  if (isSite2 && !site2UiEnabled) {
    return (
      <SidebarLockedView
        enabledTabs={enabledTabs}
        onSidebarBackgroundClick={onSidebarBackgroundClick}
        scrollRef={scrollRef}
      />
    );
  }

  const tabItems = !isSite2
    ? TABS
    : gateOpen && enabledTabs.length
      ? TABS.filter(t => enabledSet.has(t.id))
      : [];

  return (
    <div className="wp-react">
      <SidebarHeader />
      {tabItems.length ? (
        <TabsBar
          items={tabItems}
          active={activeSafe}
          onSetActive={setActiveTab}
          onHoverTab={prefetchDeferredSidebarTabs}
        />
      ) : null}

      <div className="scroll-content wp-r-scroll" ref={scrollRef} onClick={onSidebarBackgroundClick}>
        {canRenderTab('structure') ? <StructureTabView active={activeSafe === 'structure'} /> : null}

        {shouldMountDeferredTabs ? (
          <LazyErrorBoundary label="טאבים נוספים" app={app}>
            <Suspense
              fallback={
                <div className="tab-content active" data-tab={activeSafe} aria-hidden={false}>
                  <div className="section">טוען…</div>
                </div>
              }
            >
              <DeferredSidebarTabsLazy
                app={app}
                activeTab={activeSafe}
                canRenderDesign={canRenderTab('design')}
                canRenderInterior={canRenderTab('interior')}
                canRenderRender={canRenderTab('render')}
                canRenderExport={canRenderTab('export')}
                exportMounted={exportMounted}
              />
            </Suspense>
          </LazyErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
