---
name: analytics-widget
description: Scaffold a new analytics chart widget following Social Suite conventions (Recharts or Nivo)
tools: Read, Edit, Write, Bash, Glob, Grep
user-invocable: true
---

Create a new analytics widget: $ARGUMENTS

## Decide: Recharts or Nivo?
- **Recharts** → use for `/app/analytics` (primary analytics page) — files in `src/components/analytics/`
- **Nivo** → use for `/app/analytics-v2` (widget system) — files in `src/components/analytics-v2/`
- If unclear, ask the user which page it belongs to

## Steps

### 1. Read existing patterns
- For Recharts: read `src/components/analytics/MetricWidget.tsx` and a chart in `src/components/analytics/charts/`
- For Nivo: read a widget in `src/components/analytics-v2/widgets/`
- Read the relevant hook (e.g. `src/hooks/useAnalyticsStats.ts`) to understand data shape

### 2. Create the data hook (if new data needed)
File: `src/hooks/use<WidgetName>.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export function use<WidgetName>(params?: { /* options */ }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['<widget-name>', companyId, params],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('<table>')
        .select('*')
        .eq('company_id', companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}
```

### 3. Create the widget component

**Recharts pattern** — `src/components/analytics/<WidgetName>.tsx`:
- Use `<ResponsiveContainer>` for all charts
- Import colors from the theme: use CSS vars `var(--chart-1)` through `var(--chart-5)`
- Show `<Skeleton>` while loading (import from `@/components/ui/skeleton`)
- Wrap in a `<Card>` with `<CardHeader>` / `<CardContent>` from `@/components/ui/card`

**Nivo pattern** — `src/components/analytics-v2/widgets/<WidgetName>.tsx`:
- Import theme from `src/lib/nivo-theme.ts`
- Use the existing widget wrapper pattern from sibling widgets
- Keep consistent padding and height with other widgets

### 4. Wire into the page
- For Recharts: add to the relevant section in `src/pages/Analytics.tsx`
- For Nivo: register in `src/components/analytics-v2/` widget registry if one exists

### 5. Verify
- Run `npx tsc --noEmit` — fix any type errors
- Run `npm run lint` — fix any lint errors
