# Form Patterns

## Table of Contents
- [Architecture](#architecture)
- [Basic Form Template](#basic-form-template)
- [Field Types](#field-types)
- [Validation with Zod](#validation-with-zod)
- [Async Submission](#async-submission)
- [Accessibility Checklist](#accessibility-checklist)

## Architecture

This project uses the Shadcn `Form` component from `src/components/ui/form.tsx`, which wraps:
- `react-hook-form` `FormProvider` as `<Form>`
- `react-hook-form` `Controller` as `<FormField>`
- Custom context (`FormFieldContext`, `FormItemContext`) for automatic ARIA binding

The component hierarchy for every form field:

```
<Form>                    -- FormProvider (passes form methods via context)
  <form>                  -- native form element with onSubmit
    <FormField>           -- Controller + FormFieldContext
      <FormItem>          -- div wrapper + FormItemContext (generates unique id)
        <FormLabel>       -- label with htmlFor auto-bound to field id
        <FormControl>     -- Slot that injects id, aria-describedby, aria-invalid
          <Input />       -- the actual input element
        </FormControl>
        <FormDescription> -- helper text with auto-generated id
        <FormMessage>     -- error message with auto-generated id
      </FormItem>
    </FormField>
  </form>
</Form>
```

**Critical:** Always wrap inputs with `<FormControl>`. It uses Radix `Slot` to inject:
- `id` matching the `<FormLabel>`'s `htmlFor`
- `aria-describedby` linking to `<FormDescription>` and `<FormMessage>`
- `aria-invalid` when the field has errors

## Basic Form Template

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormField, FormItem, FormLabel,
  FormControl, FormDescription, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "" },
  });

  async function onSubmit(values: FormValues) {
    // Supabase call here
    toast.success("Saved successfully");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormDescription>The display name for this item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

## Field Types

### Text Input
```typescript
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input type="email" placeholder="user@example.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Textarea
```typescript
import { Textarea } from "@/components/ui/textarea";

<FormField
  control={form.control}
  name="bio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Bio</FormLabel>
      <FormControl>
        <Textarea placeholder="Tell us about yourself" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="member">Member</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox
```typescript
import { Checkbox } from "@/components/ui/checkbox";

<FormField
  control={form.control}
  name="terms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Accept terms</FormLabel>
        <FormDescription>You agree to our Terms of Service.</FormDescription>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Switch
```typescript
import { Switch } from "@/components/ui/switch";

<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">Notifications</FormLabel>
        <FormDescription>Receive email notifications.</FormDescription>
      </div>
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
    </FormItem>
  )}
/>
```

## Validation with Zod

### Common patterns
```typescript
const schema = z.object({
  // Required string
  name: z.string().min(1, "Name is required"),

  // Optional with transform
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),

  // Enum
  status: z.enum(["draft", "published", "archived"]),

  // Number from string input
  count: z.coerce.number().int().positive("Must be positive"),

  // Date
  publishedAt: z.date({ required_error: "Date is required" }),

  // Conditional validation
  notifyEmail: z.boolean(),
  email: z.string().email().optional(),
}).refine(
  (data) => !data.notifyEmail || data.email,
  { message: "Email required when notifications enabled", path: ["email"] }
);
```

### Reusable field schemas
```typescript
// Define once, reuse across forms
export const companyFields = {
  companyName: z.string().min(2, "Company name too short").max(100),
  companyUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
};

// Use in forms
const createCompanySchema = z.object({
  ...companyFields,
  plan: z.enum(["free", "pro", "enterprise"]),
});
```

## Async Submission

```typescript
async function onSubmit(values: FormValues) {
  try {
    const { error } = await supabase
      .from("posts")
      .insert({ ...values, company_id: selectedCompanyId });

    if (error) throw error;

    toast.success("Post created");
    form.reset();
    queryClient.invalidateQueries({ queryKey: ["posts", selectedCompanyId] });
  } catch (err) {
    toast.error("Failed to create post");
    // Set server-side error on specific field
    form.setError("title", { message: "This title already exists" });
  }
}
```

## Accessibility Checklist

1. Every input has a `<FormLabel>` (or `aria-label` for visually hidden labels)
2. `<FormControl>` wraps every input (auto-injects ARIA attributes)
3. `<FormMessage>` renders below the field (auto-linked via `aria-describedby`)
4. `<FormDescription>` provides helper text (also linked via `aria-describedby`)
5. Submit button shows loading state and is `disabled` during submission
6. Error focus: call `form.setFocus("fieldName")` after `setError` for keyboard users
7. Required fields: use Zod `.min(1)` for visual + validation; add `aria-required` if label doesn't indicate required
8. Group related fields with `<fieldset>` + `<legend>` for radio/checkbox groups
