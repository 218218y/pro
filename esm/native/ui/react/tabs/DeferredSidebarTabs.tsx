import type { ReactElement } from 'react';

import type { TabId } from '../../../../../types';

import { LazyErrorBoundary } from '../components/index.js';
import { DesignTabView } from './DesignTab.view.js';
import { ExportTab } from './ExportTab.js';
import { InteriorTabView } from './InteriorTab.view.js';
import { RenderTabView } from './RenderTab.view.js';

type DeferredSidebarTabsProps = {
  app: unknown;
  activeTab: TabId;
  canRenderDesign: boolean;
  canRenderInterior: boolean;
  canRenderRender: boolean;
  canRenderExport: boolean;
  exportMounted: boolean;
};

export function DeferredSidebarTabs(props: DeferredSidebarTabsProps): ReactElement {
  const {
    app,
    activeTab,
    canRenderDesign,
    canRenderInterior,
    canRenderRender,
    canRenderExport,
    exportMounted,
  } = props;

  return (
    <>
      {canRenderDesign ? <DesignTabView active={activeTab === 'design'} /> : null}
      {canRenderInterior ? <InteriorTabView active={activeTab === 'interior'} /> : null}
      {canRenderRender ? <RenderTabView active={activeTab === 'render'} /> : null}
      {canRenderExport && exportMounted ? (
        <LazyErrorBoundary label="טאב ייצוא" app={app}>
          <ExportTab active={activeTab === 'export'} />
        </LazyErrorBoundary>
      ) : null}
    </>
  );
}
