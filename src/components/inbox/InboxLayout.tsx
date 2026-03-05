import { ReactNode, useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';

interface InboxLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  detail?: ReactNode;
  showDetail?: boolean;
  onToggleDetail?: () => void;
}

const LAYOUT_STORAGE_KEY = 'inbox-panel-layout';

function getDefaultLayout(): number[] {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [30, 70];
}

function saveLayout(sizes: number[]) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(sizes));
  } catch { /* ignore */ }
}

export function InboxLayout({ sidebar, main, detail, showDetail, onToggleDetail }: InboxLayoutProps) {
  const [defaultLayout] = useState(getDefaultLayout);

  return (
    <div className="flex flex-1 min-h-0 relative">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={saveLayout}
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          minSize={20}
          maxSize={45}
          className="flex flex-col"
        >
          {sidebar}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={defaultLayout[1]}
          minSize={40}
          className="flex flex-col"
        >
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              {main}
            </div>

            {showDetail && detail && (
              <div className="w-[300px] border-l flex flex-col bg-background overflow-y-auto">
                {detail}
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {onToggleDetail && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 z-10"
          onClick={onToggleDetail}
          title={showDetail ? 'Hide contact details' : 'Show contact details'}
        >
          {showDetail ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
