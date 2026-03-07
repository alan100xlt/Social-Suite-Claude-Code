---
name: shadcn-ui
description: |
  Guide for using Shadcn/ui components correctly in this project. Use when:
  (1) adding new UI components via CLI, (2) customizing or extending existing
  Shadcn components, (3) building forms with react-hook-form + zod,
  (4) theming or styling with CSS variables, (5) deciding between Radix
  primitives vs Shadcn wrappers, (6) reviewing code that touches src/components/ui/.
  Enforces project conventions for component installation, composition, and accessibility.
---

## Project Configuration

This project uses Shadcn/ui with the following `components.json`:
- **Style:** `default`
- **RSC:** `false` (Vite, not Next.js)
- **CSS variables:** `true` (HSL-based, set on `:root` via ThemeContext)
- **Tailwind config:** `tailwind.config.ts`
- **Global CSS:** `src/index.css`
- **Aliases:** `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`
- **Icon library:** Lucide (`lucide-react`)
- **Utility function:** `cn()` from `@/lib/utils` (clsx + tailwind-merge)

## CLI Commands

```bash
# Add a single component
npx shadcn@latest add <component-name>

# Add multiple components at once
npx shadcn@latest add button card dialog

# Add all components (rarely needed)
npx shadcn@latest add --all

# Update a component to latest (overwrites local file)
npx shadcn@latest add <component-name> --overwrite

# Check what changed upstream
npx shadcn@latest diff <component-name>
```

**Important:** The CLI writes to `src/components/ui/`. It auto-resolves aliases from `components.json`.

## Core Rules

### 1. NEVER modify files in `src/components/ui/` directly

These are Shadcn-managed primitives. Any direct edit will be lost on `--overwrite` and creates merge conflicts with upstream.

**Instead, create wrapper components** in the appropriate feature directory:

```typescript
// WRONG: editing src/components/ui/button.tsx to add "premium" variant

// RIGHT: create a wrapper in the feature directory
// src/components/shared/PremiumButton.tsx
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PremiumButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn("bg-gradient-to-r from-amber-500 to-orange-600 text-white", className)}
      {...props}
    />
  );
}
```

### 2. Use `cn()` for all conditional class merging

Always import from `@/lib/utils`. Never use raw template literals for Tailwind classes:

```typescript
// WRONG
<div className={`p-4 ${isActive ? 'bg-primary' : 'bg-muted'}`}>

// RIGHT
<div className={cn("p-4", isActive ? "bg-primary" : "bg-muted")}>
```

### 3. Use semantic color tokens, not raw colors

Shadcn CSS variables map to semantic roles. Always use them:

| Token | Purpose |
|-------|---------|
| `background` / `foreground` | Page background and text |
| `card` / `card-foreground` | Card surfaces |
| `primary` / `primary-foreground` | Primary actions (buttons, links) |
| `secondary` / `secondary-foreground` | Secondary actions |
| `muted` / `muted-foreground` | Subdued text, disabled states |
| `accent` / `accent-foreground` | Highlights, hover states |
| `destructive` / `destructive-foreground` | Delete, error actions |
| `border` | Borders |
| `input` | Form input borders |
| `ring` | Focus rings |

```typescript
// WRONG: raw Tailwind color
<p className="text-gray-500">Subtitle</p>

// RIGHT: semantic token
<p className="text-muted-foreground">Subtitle</p>
```

### 4. Extend variants with `cva`, not className overrides

When a component needs new visual variants beyond the Shadcn defaults, use `class-variance-authority` in your wrapper:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    status: {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      inactive: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { status: "inactive" },
});

interface StatusBadgeProps extends VariantProps<typeof statusVariants> {
  className?: string;
  children: React.ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  return <span className={cn(statusVariants({ status }), className)}>{children}</span>;
}
```

## Theming

This project uses a **custom ThemeContext** (`src/contexts/ThemeContext.tsx`) with 6 theme variants. It sets CSS custom properties on `:root` and a `theme-{variant}` class on `<body>`.

**Do NOT use `next-themes`** -- it is in `package.json` but unused. The project's `ThemeContext` handles everything.

Key theming rules:
- CSS variables use HSL format (e.g., `--primary: 222.2 47.4% 11.2%`)
- Dark mode is controlled by theme variant selection, not a `.dark` class toggle
- New theme-aware styles must use `hsl(var(--token-name))` syntax in Tailwind
- Chart colors use `--chart-1` through `--chart-5`

## Composition: Radix vs Shadcn Wrapper

**Use the Shadcn wrapper** (from `src/components/ui/`) when:
- The component exists in the project's `ui/` directory (see [references/component-catalog.md](references/component-catalog.md))
- You need the pre-styled, themed version
- Standard behavior is sufficient

**Use Radix primitives directly** when:
- You need a behavior primitive that Shadcn doesn't wrap (e.g., `@radix-ui/react-visually-hidden`)
- You're building a compound component that needs full control over Radix's slot pattern
- The Shadcn wrapper's styling conflicts with your requirements and a `cn()` override is insufficient

**Never mix** a Shadcn wrapper with its underlying Radix primitive in the same component tree. Pick one.

## Accessibility

### What Shadcn/Radix handles automatically
- Keyboard navigation (Arrow keys in menus, Escape to close, Tab/Shift+Tab)
- Focus management (focus trapping in dialogs/sheets, return focus on close)
- ARIA roles and states (`role="dialog"`, `aria-expanded`, `aria-selected`, etc.)
- Screen reader announcements for toasts (via `aria-live`)

### What you MUST still handle
- **Labels for form inputs:** Always use `<FormLabel>` or `<Label>` with `htmlFor`
- **Alt text for images** inside cards, avatars, etc.
- **Descriptive button text:** Avoid icon-only buttons without `aria-label`
- **Loading states:** Add `aria-busy="true"` and disable interactions
- **Error announcements:** Use `aria-describedby` to link error messages (the Form component does this automatically)
- **Color contrast:** Semantic tokens usually pass WCAG AA, but verify custom colors
- **Skip navigation:** Not provided by Shadcn -- add manually if needed

```typescript
// Icon-only button -- MUST have aria-label
<Button variant="ghost" size="icon" aria-label="Delete post">
  <Trash2 className="h-4 w-4" />
</Button>

// Loading state
<Button disabled aria-busy={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
  {isLoading ? "Saving..." : "Save"}
</Button>
```

## Forms

This project uses the Shadcn `Form` component (`src/components/ui/form.tsx`) which wraps `react-hook-form`'s `FormProvider` and `Controller`.

For detailed form patterns, see [references/form-patterns.md](references/form-patterns.md).

Quick reference:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({ name: z.string().min(1, "Required") });

function MyForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Editing `src/components/ui/*.tsx` directly | Create wrapper in feature directory |
| Using `process.env` in component code | Use `import.meta.env` (Vite) |
| Importing `next-themes` | Use project's `ThemeContext` |
| Raw Tailwind colors (`text-gray-500`) | Semantic tokens (`text-muted-foreground`) |
| Missing `cn()` for class merging | Always use `cn()` from `@/lib/utils` |
| Forgetting `aria-label` on icon buttons | Add descriptive `aria-label` |
| Using `<Table>` for data grids | Use AG Grid (Community). `<Table>` for tiny static displays only |
| Nesting Shadcn Dialog inside Sheet (or vice versa) | Use only one overlay at a time, or use Radix `Portal` |
| Missing `FormControl` wrapper in Form fields | Always wrap input with `<FormControl>` for ARIA binding |
| Using `asChild` without a single child element | `asChild` uses Radix `Slot` -- must have exactly one child |
