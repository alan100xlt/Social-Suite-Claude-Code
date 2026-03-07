---
name: analytics-widget
description: Scaffold a new analytics chart widget following Social Suite conventions (Nivo premium widgets)
tools: Read, Edit, Write, Bash, Glob, Grep
user-invocable: true
---

Create a new analytics widget: $ARGUMENTS

## Widget System

All analytics widgets use the **premium widgets-v2** system (Nivo-based, glassmorphism cards).
- Widget files: `src/components/analytics-v2/widgets-v2/`
- Design foundation: `premium-theme.ts` (colors, gradients, typography)
- Card wrapper: `ChartCard.tsx` (glassmorphism wrapper)
- Analytics page: `src/pages/Analytics.tsx` (consolidated, single route)

## Steps

### 1. Read existing patterns
- Read a widget in `src/components/analytics-v2/widgets-v2/` (e.g. `StatSparklineWidget.tsx`)
- Read `src/components/analytics-v2/widgets-v2/premium-theme.ts` for theme utilities
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
File: `src/components/analytics-v2/widgets-v2/<WidgetName>.tsx`
- Import `ChartCard` from `./ChartCard`
- Import theme utilities from `./premium-theme`
- Use the existing widget wrapper pattern from sibling widgets
- Keep consistent padding and height with other widgets
- Export from `src/components/analytics-v2/widgets-v2/index.ts`

### 4. Wire into the analytics page
- Add to the relevant tab in `src/pages/Analytics.tsx`

### 5. Verify
- Run `npx tsc --noEmit` — fix any type errors
- Run `npm run lint` — fix any lint errors
