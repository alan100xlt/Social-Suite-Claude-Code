import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { CheckCircle2, AlertCircle, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatformMetricsMatrix } from '@/hooks/usePlatformMetricsMatrix';
import { platformMeta, formatNumber } from '@/components/ui/data-grid-cells';
import {
  PLATFORM_METRICS,
  METRIC_LABELS,
  getCellDisplayState,
  type MetricType,
  type CellDisplayState,
} from '@/lib/platform-metrics';
import type { Platform } from '@/lib/api/getlate';
import { PlatformSparklineDetail } from './PlatformSparklineDetail';
import {
  FaXTwitter, FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok,
  FaYoutube, FaPinterest, FaReddit, FaSnapchat, FaTelegram,
} from 'react-icons/fa6';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { Building2 } from 'lucide-react';
import type { ComponentType } from 'react';

const ALL_METRICS: MetricType[] = [
  'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views',
];

const ALL_PLATFORMS: Platform[] = [
  'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
  'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
  'google-business', 'telegram', 'snapchat',
];

// Extended platform meta for all 13 platforms
const extendedPlatformMeta: Record<string, { icon: ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  ...platformMeta,
  youtube: { icon: FaYoutube, color: 'text-red-600', bg: 'bg-red-50', label: 'YouTube' },
  pinterest: { icon: FaPinterest, color: 'text-red-700', bg: 'bg-red-50', label: 'Pinterest' },
  reddit: { icon: FaReddit, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Reddit' },
  bluesky: { icon: SiBluesky, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Bluesky' },
  threads: { icon: SiThreads, color: 'text-gray-900', bg: 'bg-gray-100', label: 'Threads' },
  'google-business': { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Google Business' },
  telegram: { icon: FaTelegram, color: 'text-sky-500', bg: 'bg-sky-50', label: 'Telegram' },
  snapchat: { icon: FaSnapchat, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Snapchat' },
};

interface RowData {
  platform: Platform;
  label: string;
  isConnected: boolean;
  [key: string]: unknown;
}

interface Props {
  mode: 'connections' | 'analytics';
  connectedPlatforms?: Platform[];
}

function MetricCellRenderer(params: ICellRendererParams<RowData>) {
  const { value, colDef, data } = params;
  if (!data || !colDef?.field) return null;

  const metric = colDef.field as MetricType;
  const state: CellDisplayState = value?.state;

  switch (state) {
    case 'value':
      return (
        <span className="text-sm font-medium text-foreground">
          {formatNumber(value.numericValue)}
        </span>
      );
    case 'dash':
      return <Minus className="h-4 w-4 text-muted-foreground/40" />;
    case 'available':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'partial': {
      const note = PLATFORM_METRICS[data.platform]?.[metric]?.note;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" />
            </TooltipTrigger>
            {note && (
              <TooltipContent>
                <p className="text-xs">{note}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }
    case 'unavailable':
    default:
      return <Minus className="h-4 w-4 text-muted-foreground/20" />;
  }
}

function PlatformCellRenderer(params: ICellRendererParams<RowData>) {
  const data = params.data;
  if (!data) return null;

  const meta = extendedPlatformMeta[data.platform];
  const Icon = meta?.icon;

  return (
    <div className="flex items-center gap-2.5">
      {Icon && (
        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${meta.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        </span>
      )}
      <span className="text-sm font-medium text-foreground">{meta?.label ?? data.platform}</span>
      {data.isConnected && (
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
      )}
    </div>
  );
}

export function PlatformMetricsMatrix({ mode, connectedPlatforms = [] }: Props) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme.includes('dark');
  const theme = isDark ? gridThemeDark : gridTheme;

  const { data: metricsData } = usePlatformMetricsMatrix();
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);

  const platforms = mode === 'analytics'
    ? ALL_PLATFORMS.filter((p) => connectedPlatforms.includes(p))
    : ALL_PLATFORMS;

  const rowData: RowData[] = useMemo(() => {
    return platforms.map((platform) => {
      const isConnected = connectedPlatforms.includes(platform);
      const meta = extendedPlatformMeta[platform];
      const values = metricsData?.[platform];

      const row: RowData = {
        platform,
        label: meta?.label ?? platform,
        isConnected,
      };

      for (const metric of ALL_METRICS) {
        const numericValue = values?.[metric] ?? null;
        const state = getCellDisplayState(platform, metric, connectedPlatforms, numericValue);
        row[metric] = { state, numericValue };
      }

      return row;
    });
  }, [platforms, connectedPlatforms, metricsData]);

  const columnDefs: ColDef<RowData>[] = useMemo(() => {
    const cols: ColDef<RowData>[] = [
      {
        field: 'platform',
        headerName: 'Platform',
        cellRenderer: PlatformCellRenderer,
        minWidth: 180,
        flex: 1,
        sortable: true,
      },
      ...ALL_METRICS.map((metric): ColDef<RowData> => ({
        field: metric,
        headerName: METRIC_LABELS[metric],
        cellRenderer: MetricCellRenderer,
        width: 110,
        sortable: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      })),
    ];
    return cols;
  }, []);

  const onRowClicked = useCallback((event: { data?: RowData }) => {
    if (!event.data) return;
    setExpandedPlatform((prev) =>
      prev === event.data!.platform ? null : event.data!.platform,
    );
  }, []);

  const getRowStyle = useCallback((params: { data?: RowData }) => {
    if (params.data?.isConnected) {
      return { borderLeft: '2px solid #22c55e' };
    }
    return undefined;
  }, []);

  return (
    <div className="space-y-0">
      <div className="w-full" style={{ height: Math.min(platforms.length * 56 + 56, 800) }}>
        <AgGridReact<RowData>
          modules={[AllCommunityModule]}
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          onRowClicked={onRowClicked}
          getRowStyle={getRowStyle}
          headerHeight={44}
          rowHeight={56}
          domLayout="normal"
          suppressCellFocus
          suppressRowHoverHighlight={false}
        />
      </div>

      {expandedPlatform && (
        <PlatformSparklineDetail platform={expandedPlatform} />
      )}
    </div>
  );
}
