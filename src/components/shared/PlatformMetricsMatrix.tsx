import { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Minus, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// AG Grid imports — only used in analytics mode
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';

const ALL_METRICS: MetricType[] = [
  'impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views',
];

const ALL_PLATFORMS: Platform[] = [
  'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
  'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
  'google-business', 'telegram', 'snapchat',
];

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

// ── AG Grid renderers (analytics mode only) ──

interface RowData {
  platform: Platform;
  label: string;
  isConnected: boolean;
  [key: string]: unknown;
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
              <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
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

function AgGridPlatformCellRenderer(params: ICellRendererParams<RowData>) {
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

// ── Props ──

interface Props {
  mode: 'connections' | 'analytics';
  connectedPlatforms?: Platform[];
  onConnect?: (platform: Platform) => void;
}

// ── Native Table (connections mode) ──

function ConnectionsTable({
  connectedPlatforms,
  metricsData,
  onConnect,
}: {
  connectedPlatforms: Platform[];
  metricsData: Record<string, Record<MetricType, number | null>> | undefined;
  onConnect?: (platform: Platform) => void;
}) {
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);

  const connected = useMemo(
    () => ALL_PLATFORMS.filter((p) => connectedPlatforms.includes(p)),
    [connectedPlatforms],
  );
  const unconnected = useMemo(
    () => ALL_PLATFORMS.filter((p) => !connectedPlatforms.includes(p)),
    [connectedPlatforms],
  );

  return (
    <>
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Connected (live data)
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Available if connected
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Partial support
        </span>
        <span className="flex items-center gap-1.5">
          <Minus className="h-3.5 w-3.5 text-muted-foreground/30" />
          Not available
        </span>
      </div>

      {/* Table */}
      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">
                Platform
              </th>
              {ALL_METRICS.map((m) => (
                <th key={m} className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {METRIC_LABELS[m]}
                </th>
              ))}
              <th className="w-[50px]" />
            </tr>
          </thead>
          <tbody>
            {/* Connected rows */}
            {connected.map((platform, idx) => {
              const meta = extendedPlatformMeta[platform];
              const Icon = meta?.icon;
              const values = metricsData?.[platform];
              const isExpanded = expandedPlatform === platform;

              return (
                <ConnectedRowGroup
                  key={platform}
                  platform={platform}
                  meta={meta}
                  Icon={Icon}
                  values={values}
                  connectedPlatforms={connectedPlatforms}
                  isExpanded={isExpanded}
                  isOdd={idx % 2 === 1}
                  onToggle={() => setExpandedPlatform(isExpanded ? null : platform)}
                />
              );
            })}

            {/* Divider */}
            {unconnected.length > 0 && (
              <tr>
                <td colSpan={10} className="py-2.5 px-4 bg-muted border-y border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Not yet connected
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {unconnected.length} platform{unconnected.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {/* Unconnected rows */}
            {unconnected.map((platform, idx) => {
              const meta = extendedPlatformMeta[platform];
              const Icon = meta?.icon;

              return (
                <tr
                  key={platform}
                  className="border-b border-border/30"
                  style={idx % 2 === 1 ? { background: 'var(--muted-row, #fafbfc)' } : undefined}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg shrink-0 bg-gray-300">
                          <Icon className="h-4 w-4 text-gray-500" />
                        </span>
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {meta?.label ?? platform}
                      </span>
                      {onConnect && (
                        <button
                          className="ml-1 text-xs font-medium px-3.5 py-1 rounded-md border border-gray-300 bg-background text-foreground hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConnect(platform);
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </td>
                  {ALL_METRICS.map((metric) => {
                    const state = getCellDisplayState(platform, metric, connectedPlatforms, null);
                    return (
                      <td key={metric} className="text-center py-3.5 px-2">
                        <span className="inline-flex items-center justify-center">
                          <AvailabilityIcon state={state} platform={platform} metric={metric} />
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-2" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ConnectedRowGroup({
  platform,
  meta,
  Icon,
  values,
  connectedPlatforms,
  isExpanded,
  isOdd,
  onToggle,
}: {
  platform: Platform;
  meta: { icon: ComponentType<{ className?: string }>; color: string; bg: string; label: string } | undefined;
  Icon: ComponentType<{ className?: string }> | undefined;
  values: Record<MetricType, number | null> | undefined;
  connectedPlatforms: Platform[];
  isExpanded: boolean;
  isOdd: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-border/30 cursor-pointer hover:bg-emerald-50/50 transition-colors"
        style={{
          borderLeft: '3px solid #22c55e',
          ...(isOdd ? { background: 'var(--muted-row, #fafbfc)' } : {}),
        }}
        onClick={onToggle}
      >
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${meta?.bg ?? 'bg-gray-100'}`}>
                <Icon className={`h-4 w-4 ${meta?.color ?? 'text-gray-600'}`} />
              </span>
            )}
            <span className="text-sm font-medium text-foreground">
              {meta?.label ?? platform}
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
          </div>
        </td>
        {ALL_METRICS.map((metric) => {
          const numericValue = values?.[metric] ?? null;
          const state = getCellDisplayState(platform, metric, connectedPlatforms, numericValue);
          return (
            <td key={metric} className="text-center py-3.5 px-2">
              {state === 'value' && numericValue != null ? (
                <span className="font-mono text-sm font-medium text-foreground">
                  {formatNumber(numericValue)}
                </span>
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground/30 inline-block" />
              )}
            </td>
          );
        })}
        <td className="text-center py-3.5 px-2">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-500' : ''}`}
          />
        </td>
      </tr>

      {/* Sparkline expansion row */}
      <tr
        style={{
          borderLeft: '3px solid #22c55e',
          display: isExpanded ? 'table-row' : 'none',
        }}
      >
        <td colSpan={10} className="p-0">
          <div className="bg-emerald-50/40">
            <PlatformSparklineDetail platform={platform} />
          </div>
        </td>
      </tr>
    </>
  );
}

function AvailabilityIcon({ state, platform, metric }: { state: CellDisplayState; platform: Platform; metric: MetricType }) {
  switch (state) {
    case 'available':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'partial': {
      const note = PLATFORM_METRICS[platform]?.[metric]?.note;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
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

// ── Analytics Mode (AG Grid) ──

function AnalyticsGrid({
  connectedPlatforms,
  metricsData,
}: {
  connectedPlatforms: Platform[];
  metricsData: Record<string, Record<MetricType, number | null>> | undefined;
}) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme.includes('dark');
  const theme = isDark ? gridThemeDark : gridTheme;

  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);

  const platforms = ALL_PLATFORMS.filter((p) => connectedPlatforms.includes(p));

  const rowData: RowData[] = useMemo(() => {
    return platforms.map((platform) => {
      const meta = extendedPlatformMeta[platform];
      const values = metricsData?.[platform];
      const row: RowData = { platform, label: meta?.label ?? platform, isConnected: true };
      for (const metric of ALL_METRICS) {
        const numericValue = values?.[metric] ?? null;
        const state = getCellDisplayState(platform, metric, connectedPlatforms, numericValue);
        row[metric] = { state, numericValue };
      }
      return row;
    });
  }, [platforms, connectedPlatforms, metricsData]);

  const columnDefs: ColDef<RowData>[] = useMemo(() => [
    {
      field: 'platform',
      headerName: 'Platform',
      cellRenderer: AgGridPlatformCellRenderer,
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
  ], []);

  return (
    <div className="space-y-0">
      <div className="w-full" style={{ height: Math.min(platforms.length * 56 + 56, 800) }}>
        <AgGridReact<RowData>
          modules={[AllCommunityModule]}
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          onRowClicked={(event) => {
            if (!event.data) return;
            setExpandedPlatform((prev) => prev === event.data!.platform ? null : event.data!.platform);
          }}
          getRowStyle={(params) => params.data?.isConnected ? { borderLeft: '2px solid #22c55e' } : undefined}
          headerHeight={44}
          rowHeight={56}
          domLayout="normal"
          suppressCellFocus
          suppressRowHoverHighlight={false}
        />
      </div>
      {expandedPlatform && <PlatformSparklineDetail platform={expandedPlatform} />}
    </div>
  );
}

// ── Main Export ──

export function PlatformMetricsMatrix({ mode, connectedPlatforms = [], onConnect }: Props) {
  const { data: metricsData } = usePlatformMetricsMatrix();

  if (mode === 'connections') {
    return (
      <ConnectionsTable
        connectedPlatforms={connectedPlatforms}
        metricsData={metricsData}
        onConnect={onConnect}
      />
    );
  }

  return (
    <AnalyticsGrid
      connectedPlatforms={connectedPlatforms}
      metricsData={metricsData}
    />
  );
}
