# Installed Shadcn Components

## Table of Contents
- [Layout & Structure](#layout--structure)
- [Navigation](#navigation)
- [Overlays & Popups](#overlays--popups)
- [Forms & Inputs](#forms--inputs)
- [Data Display](#data-display)
- [Feedback](#feedback)
- [Utility](#utility)
- [When to Use Radix Directly](#when-to-use-radix-directly)

## Layout & Structure

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Card | `card.tsx` | None | Pure div wrapper. Includes CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Separator | `separator.tsx` | `@radix-ui/react-separator` | Horizontal/vertical divider |
| AspectRatio | `aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` | Constrained aspect ratio container |
| ResizablePanel | `resizable.tsx` | `react-resizable-panels` | Not Radix -- uses `react-resizable-panels` |
| ScrollArea | `scroll-area.tsx` | `@radix-ui/react-scroll-area` | Custom scrollbar styling |
| Sidebar | `sidebar.tsx` | None | Project-specific sidebar layout |

## Navigation

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Tabs | `tabs.tsx` | `@radix-ui/react-tabs` | TabsList, TabsTrigger, TabsContent |
| NavigationMenu | `navigation-menu.tsx` | `@radix-ui/react-navigation-menu` | Top-level site navigation |
| Breadcrumb | `breadcrumb.tsx` | None | Pure HTML, no Radix dependency |
| Pagination | `pagination.tsx` | None | Pure HTML buttons/links |
| Menubar | `menubar.tsx` | `@radix-ui/react-menubar` | Desktop app-style menu bar |

## Overlays & Popups

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Dialog | `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialog with focus trap |
| AlertDialog | `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Confirmation dialogs (requires explicit action) |
| Sheet | `sheet.tsx` | `@radix-ui/react-dialog` | Slide-in panel (uses Dialog primitive) |
| Drawer | `drawer.tsx` | `vaul` | Bottom drawer (mobile-friendly, not Radix) |
| Popover | `popover.tsx` | `@radix-ui/react-popover` | Floating content panel |
| HoverCard | `hover-card.tsx` | `@radix-ui/react-hover-card` | Hover-triggered content preview |
| Tooltip | `tooltip.tsx` | `@radix-ui/react-tooltip` | Requires `<TooltipProvider>` ancestor |
| DropdownMenu | `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Action menus |
| ContextMenu | `context-menu.tsx` | `@radix-ui/react-context-menu` | Right-click menus |
| Command | `command.tsx` | `cmdk` | Command palette (not Radix -- uses cmdk) |

## Forms & Inputs

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Form | `form.tsx` | None | Wraps react-hook-form. See form-patterns.md |
| Input | `input.tsx` | None | Styled `<input>` |
| Textarea | `textarea.tsx` | None | Styled `<textarea>` |
| Select | `select.tsx` | `@radix-ui/react-select` | Custom dropdown select |
| Checkbox | `checkbox.tsx` | `@radix-ui/react-checkbox` | Styled checkbox with indicator |
| RadioGroup | `radio-group.tsx` | `@radix-ui/react-radio-group` | Radio button group |
| Switch | `switch.tsx` | `@radix-ui/react-switch` | Toggle switch |
| Slider | `slider.tsx` | `@radix-ui/react-slider` | Range slider |
| Label | `label.tsx` | `@radix-ui/react-label` | Accessible form label |
| InputOTP | `input-otp.tsx` | `input-otp` | OTP/verification code input |
| Calendar | `calendar.tsx` | `react-day-picker` | Date picker calendar |
| Toggle | `toggle.tsx` | `@radix-ui/react-toggle` | Pressable toggle button |
| ToggleGroup | `toggle-group.tsx` | `@radix-ui/react-toggle-group` | Group of toggles |

## Data Display

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Table | `table.tsx` | None | Simple HTML table. Use AG Grid for data grids |
| Badge | `badge.tsx` | None | Inline status labels |
| Avatar | `avatar.tsx` | `@radix-ui/react-avatar` | User avatars with fallback |
| Accordion | `accordion.tsx` | `@radix-ui/react-accordion` | Collapsible sections |
| Collapsible | `collapsible.tsx` | `@radix-ui/react-collapsible` | Single collapsible section |
| Carousel | `carousel.tsx` | `embla-carousel-react` | Not Radix -- uses Embla |
| Chart | `chart.tsx` | None | Chart container/config for Recharts |
| Progress | `progress.tsx` | `@radix-ui/react-progress` | Progress bar |
| Skeleton | `skeleton.tsx` | None | Loading placeholder |
| StatusBadge | `StatusBadge.tsx` | None | Custom project component (not upstream Shadcn) |

## Feedback

| Component | File | Radix Primitive | Notes |
|-----------|------|-----------------|-------|
| Alert | `alert.tsx` | None | Static alert banner (not dismissible) |
| Toast/Toaster | `toast.tsx`, `toaster.tsx` | `@radix-ui/react-toast` | Toast notifications |
| Sonner | `sonner.tsx` | `sonner` | Alternative toast (used in newer code) |

## Utility

| Component | File | Notes |
|-----------|------|-------|
| DataGridCells | `data-grid-cells.tsx` | AG Grid cell renderers |
| DataGridToolbar | `data-grid-toolbar.tsx` | AG Grid toolbar |

## When to Use Radix Directly

Install Radix primitives directly (not via Shadcn) for these cases:

1. **VisuallyHidden** -- `@radix-ui/react-visually-hidden` for screen-reader-only text
2. **Portal** -- `@radix-ui/react-portal` when you need to render outside the DOM tree without a full Dialog
3. **Slot** -- `@radix-ui/react-slot` for polymorphic `asChild` patterns in custom components
4. **Presence** -- `@radix-ui/react-presence` for mount/unmount animations
5. **FocusScope** -- `@radix-ui/react-focus-scope` for custom focus trapping outside Dialog/Sheet
6. **DismissableLayer** -- when building custom overlay behavior

Install via: `npm install @radix-ui/react-<primitive>`

Do NOT install Radix primitives that Shadcn already wraps (e.g., don't install `@radix-ui/react-dialog` separately -- use `src/components/ui/dialog.tsx`).
