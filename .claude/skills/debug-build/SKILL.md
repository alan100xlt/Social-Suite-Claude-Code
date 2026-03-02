---
name: debug-build
description: Diagnose and fix build errors, white screens, or runtime crashes in the Vite/React app
tools: Read, Edit, Bash, Grep, Glob
user-invocable: true
---

Debug and fix: $ARGUMENTS

Checklist for this project's known failure modes:

1. **process.env usage** — search for `process.env` in src/. Must use `import.meta.env.VITE_*`
2. **Node.js imports in browser code** — search for `ioredis`, `child_process`, `fs`, `path` imports in src/
3. **CSS @import order** — `@import` must come before `@tailwind` in index.css
4. **Mismatched quotes in ThemeContext** — check string literals in themeVariants object
5. **Missing module exports** — run `npx tsc --noEmit` to surface type/import errors
6. **HMR overlay** — `vite.config.ts` has `hmr: { overlay: true }` so errors show in browser

Steps:
1. Run `npm run build` and capture full output
2. Run `npx tsc --noEmit` for type errors
3. Search for the specific error pattern
4. Apply targeted fix
5. Verify with another build run
