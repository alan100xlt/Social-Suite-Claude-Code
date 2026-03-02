import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChartWidget } from '@/components/charts/ChartWidget';
import type { ChartPresetId } from '@/lib/charts/types';
import {
  sampleBarData,
  sampleLineData,
  samplePieData,
  sampleHeatmapData,
  sampleRadarData,
  sampleTreemapData,
  sampleSunburstData,
  sampleBumpData,
  sampleFunnelData,
  sampleScatterData,
} from '@/lib/charts/sample-data';

// Side-effect import to populate the registry
import '@/lib/charts/registry';

const PRESETS: { id: ChartPresetId; label: string }[] = [
  { id: 'brand', label: 'Brand' },
  { id: 'figma-kit', label: 'Figma Kit' },
];

export default function NivoShowcase() {
  const [preset, setPreset] = useState<ChartPresetId>('brand');

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Chart System Showcase
            </h1>
            <p className="text-sm text-muted-foreground mt-1">All 12 chart types via ChartWidget + registry</p>
          </div>

          {/* Preset toggle */}
          <div className="flex gap-2 bg-muted rounded-lg p-1">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  preset === p.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          <ChartWidget
            type="bar"
            title="Bar Chart"
            subtitle="Grouped vertical bars"
            preset={preset}
            data={sampleBarData}
            keys={['2010', '2020']}
            indexBy="country"
            height={260}
          />

          <ChartWidget
            type="line"
            title="Line Chart"
            subtitle="Multi-series line"
            preset={preset}
            data={sampleLineData}
            height={260}
          />

          <ChartWidget
            type="area"
            title="Area Chart"
            subtitle="Stacked area fill"
            preset={preset}
            data={sampleLineData}
            height={260}
          />

          <ChartWidget
            type="pie"
            title="Pie Chart"
            subtitle="Platform breakdown"
            preset={preset}
            data={samplePieData}
            height={260}
            legendItems={samplePieData.map((d, i) => ({
              id: d.id,
              label: d.label,
              color: ['hsl(224 71% 25%)', 'hsl(12 95% 62%)', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)'][i],
            }))}
          />

          <ChartWidget
            type="donut"
            title="Donut Chart"
            subtitle="With inner radius"
            preset={preset}
            data={samplePieData}
            height={260}
          />

          <ChartWidget
            type="heatmap"
            title="Heatmap"
            subtitle="Engagement by day & hour"
            preset={preset}
            data={sampleHeatmapData}
            height={260}
          />

          <ChartWidget
            type="radar"
            title="Radar Chart"
            subtitle="Platform performance metrics"
            preset={preset}
            data={sampleRadarData}
            keys={['LinkedIn', 'Twitter', 'Instagram']}
            indexBy="metric"
            height={260}
          />

          <ChartWidget
            type="treemap"
            title="Treemap"
            subtitle="Content type distribution"
            preset={preset}
            data={sampleTreemapData}
            height={260}
          />

          <ChartWidget
            type="sunburst"
            title="Sunburst"
            subtitle="Hierarchical breakdown"
            preset={preset}
            data={sampleSunburstData}
            height={260}
          />

          <ChartWidget
            type="bump"
            title="Bump Chart"
            subtitle="Platform ranking over time"
            preset={preset}
            data={sampleBumpData}
            height={260}
          />

          <ChartWidget
            type="funnel"
            title="Funnel"
            subtitle="Conversion pipeline"
            preset={preset}
            data={sampleFunnelData}
            height={260}
          />

          <ChartWidget
            type="scatter"
            title="Scatter Plot"
            subtitle="Reach vs engagement rate"
            preset={preset}
            data={sampleScatterData}
            height={260}
          />

        </div>
      </div>
    </DashboardLayout>
  );
}
