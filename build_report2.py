#!/usr/bin/env python3
"""Append Phase 2, Phase 3, footer, and JS to report.html"""

PHASE2 = """
<!-- PHASE 2 — CODE QUALITY -->
<section id="phase2" style="max-width:72rem;margin:0 auto;padding:0 1.5rem 5rem;">
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
    <span class="phase-num phase-2">2</span>
    <div>
      <h2 style="font-size:1.625rem;font-weight:800;color:#f4f4f5;letter-spacing:-0.02em;">Code Quality Analysis</h2>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:2px;">7 dimensions rated across architecture, security, performance, and maintainability</p>
    </div>
    <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(59,130,246,0.4),transparent);"></div>
  </div>

  <!-- Scorecard dots -->
  <div style="display:flex;flex-wrap:wrap;gap:0.625rem;margin-bottom:2rem;padding:1.25rem;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:0.875rem;">
    <div style="font-family:'Syne',sans-serif;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);width:100%;margin-bottom:0.375rem;">Quick Scorecard</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;flex-shrink:0;"></span>Architecture</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;flex-shrink:0;"></span>Performance</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#f87171;display:inline-block;flex-shrink:0;"></span>Security</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;flex-shrink:0;"></span>Type Safety</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#f87171;display:inline-block;flex-shrink:0;"></span>Error Handling</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;flex-shrink:0;"></span>Dead Code</div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:#d4d4d8;"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:inline-block;flex-shrink:0;"></span>Technical Debt</div>
  </div>

  <!-- Rating cards grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;">

    <!-- Architecture -->
    <div class="rating-card" data-r="yellow">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-yellow">Needs Work</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-top:0.25rem;margin-bottom:0.25rem;padding-top:0.5rem;">Architecture</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Component structure, separation of concerns, service layer</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Clean context provider hierarchy (5 well-typed contexts)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Good separation: API layer (getlate.ts) from UI hooks</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>Mega-component:</strong> ComposeTab.tsx is 1,653 lines with 40+ imports</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Server-side code (Redis, Express) mixed into client src/</span></div>
      </div>
    </div>

    <!-- Performance -->
    <div class="rating-card" data-r="yellow">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-yellow">Needs Work</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Performance</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Re-renders, memoization, bundle size, lazy loading</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">TanStack Query with appropriate cache times (4hr briefing, 30s stats)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>Zero React.lazy()</strong> — all 40+ routes eagerly loaded in App.tsx</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Heavy Nivo library loaded globally — never lazy-loaded</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Only 28 of 200+ components use memoization (useMemo/useCallback)</span></div>
      </div>
    </div>

    <!-- Security -->
    <div class="rating-card" data-r="red">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-red">Critical</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Security</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Client-side secrets, auth checks, RLS, server code in browser</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Supabase anon key loaded via VITE_* env vars (correct)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>CRITICAL:</strong> SecurityContextService.ts connects to Redis in browser bundle (REDIS_HOST, REDIS_PASSWORD)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>CRITICAL:</strong> ErrorMonitor.ts performs file system reads/writes from browser</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Impersonation tokens stored in localStorage (XSS risk)</span></div>
      </div>
    </div>

    <!-- Type Safety -->
    <div class="rating-card" data-r="yellow">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-yellow">Needs Work</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Type Safety</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">any usage, missing types, unsafe casts</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Generated Supabase types provide strong DB typing</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>71 occurrences</strong> of ": any" across 37 files</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>63 occurrences</strong> of "as any" casts — 134 total any exposure</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Double-cast anti-pattern: <code style="font-size:0.75rem;color:#818cf8;">as unknown as PlatformSettings</code></span></div>
      </div>
    </div>

    <!-- Error Handling -->
    <div class="rating-card" data-r="red">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-red">Critical</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Error Handling</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Error boundaries, unhandled promises, silent failures</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#4ade80" stroke-width="2"><polyline points="3 8 7 12 13 4"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">TanStack Query built-in error/retry for API calls</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><strong>No ErrorBoundary exists</strong> — any React error = white-screen crash</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Silent <code style="font-size:0.75rem;color:#818cf8;">catch {}</code> in AuthContext swallows JSON parse errors</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">190+ console.log/error statements — no structured error tracking (Sentry etc.)</span></div>
      </div>
    </div>

    <!-- Dead Code -->
    <div class="rating-card" data-r="yellow">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-yellow">Needs Work</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Dead Code</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Unused imports, exports, duplicate services, legacy pages</p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Duplicate SecurityContextService (securityContextService.ts + security/SecurityContextService.ts)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">ErrorMonitor.ts — never imported, does browser file I/O</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">middleware/security.ts — Express middleware in a Vite SPA</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">4 versions of the landing page (only 1 needed in production)</span></div>
      </div>
    </div>

    <!-- Technical Debt -->
    <div class="rating-card" data-r="yellow" style="grid-column: 1 / -1; max-width: 100%;">
      <div style="position:absolute;top:1rem;right:1rem;"><span class="badge badge-yellow">Needs Work</span></div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#f4f4f5;margin-bottom:0.25rem;padding-top:0.5rem;">Technical Debt</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Duplicated logic, inconsistent patterns, Node.js deps in browser bundle</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Platform icon/color maps defined 3+ times in separate files</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#f87171" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;"><code style="font-size:0.75rem;color:#818cf8;">formatNumber()</code> defined inline in 3 separate page files</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">Node.js-only dep <code style="font-size:0.75rem;color:#818cf8;">ioredis</code> in package.json (ships to browser)</span></div>
        <div class="insight-item"><svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;" fill="none" viewBox="0 0 16 16" stroke="#fbbf24" stroke-width="2"><line x1="8" y1="3" x2="8" y2="10"/><circle cx="8" cy="13" r="1.2" fill="#fbbf24" stroke="none"/></svg><span style="font-size:0.8125rem;color:#d4d4d8;">IDE plugin artifacts in devDependencies (lovable-tagger, windsurf-task-manager, etc.)</span></div>
      </div>
    </div>

  </div>
</section>
"""

PHASE3_COMPETITIVE = """
<!-- PHASE 3 — COMPETITIVE ANALYSIS -->
<section id="competitive" style="max-width:72rem;margin:0 auto;padding:0 1.5rem 3rem;">
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
    <span class="phase-num phase-3">3</span>
    <div>
      <h2 style="font-size:1.625rem;font-weight:800;color:#f4f4f5;letter-spacing:-0.02em;">Competitive Analysis</h2>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:2px;">Longtale.ai vs Buffer, Hootsuite, Sprout Social, Later, Publer, ContentStudio</p>
    </div>
    <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(245,158,11,0.4),transparent);"></div>
  </div>

  <div style="border:1px solid var(--border);border-radius:1rem;overflow:hidden;">
    <div class="matrix-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th class="col-longtale">Longtale.ai</th>
            <th>Buffer</th>
            <th>Hootsuite</th>
            <th>Sprout Social</th>
            <th>Later</th>
            <th>Publer</th>
            <th>ContentStudio</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Multi-platform publishing</td><td class="col-longtale"><span class="check">✓</span> 10 platforms</td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>AI content generation</td><td class="col-longtale"><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span> OwlyWriter</td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Strategy-first AI workflow</td><td class="col-longtale"><span class="check">✓</span> <strong style="color:#c084fc;">Unique</strong></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td></tr>
          <tr><td>RSS → social automation</td><td class="col-longtale"><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Calendar view</td><td class="col-longtale"><span class="warn">⚠</span> Week only</td><td><span class="check">✓</span> Month</td><td><span class="check">✓</span> Month</td><td><span class="check">✓</span> Month</td><td><span class="check">✓</span> Visual</td><td><span class="check">✓</span> Month</td><td><span class="check">✓</span> Month</td></tr>
          <tr><td>Approval workflows</td><td class="col-longtale"><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Multi-brand / tenancy</td><td class="col-longtale"><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Social inbox / unified DMs</td><td class="col-longtale"><span class="cross" style="color:#f87171;font-weight:700;">Missing</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Bulk scheduling / CSV import</td><td class="col-longtale"><span class="cross" style="color:#f87171;font-weight:700;">Missing</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Content recycling</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Hashtag research</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td></tr>
          <tr><td>Link shortening / UTM tracking</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Analytics report export (PDF/CSV)</td><td class="col-longtale"><span class="cross" style="color:#f87171;font-weight:700;">Missing</span></td><td><span class="check">✓</span> PDF</td><td><span class="check">✓</span> PDF</td><td><span class="check">✓</span> PDF</td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Canva / media library integration</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Mobile app</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>White-label offering</td><td class="col-longtale"><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="check">✓</span></td></tr>
          <tr><td>Media company hierarchy</td><td class="col-longtale"><span class="check">✓</span> <strong style="color:#c084fc;">Unique</strong></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td><td><span class="cross">—</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>
"""

def roadmap_row(num, item, why, approach, complexity, priority):
    cmap = {"S":"badge-complexity-s","M":"badge-complexity-m","L":"badge-complexity-l","XL":"badge-complexity-xl"}
    return f'<tr class="roadmap-row" data-p="{priority}"><td style="font-weight:500;color:#f4f4f5;min-width:160px;padding-left:18px;">{item}</td><td style="min-width:160px;color:#a1a1aa;font-size:0.8rem;">{why}</td><td style="min-width:220px;color:#a1a1aa;font-size:0.8rem;">{approach}</td><td style="text-align:center;"><span class="badge {cmap.get(complexity,"badge-complexity-m")}">{complexity}</span></td></tr>'

def priority_block(label, badge_class, descriptor, rows_html):
    return f"""
  <div class="priority-block">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.75rem;">
      <span class="badge {badge_class}">{label}</span>
      <span style="font-size:0.75rem;color:var(--text-muted);">{descriptor}</span>
    </div>
    <div style="border:1px solid var(--border);border-radius:0.875rem;overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="report-table">
          <thead><tr><th style="width:22%;padding-left:18px;">What</th><th style="width:22%;">Why It Matters</th><th>Implementation Approach</th><th style="width:8%;text-align:center;">Size</th></tr></thead>
          <tbody>{rows_html}</tbody>
        </table>
      </div>
    </div>
  </div>"""

p0_rows = (
    roadmap_row(1,"Add React ErrorBoundary","Any unhandled error = white-screen crash for users","Add react-error-boundary in App.tsx + per-page boundaries","S","P0") +
    roadmap_row(2,"Remove server code from bundle","Redis creds and Express middleware ship to browser","Delete/move SecurityContextService.ts, middleware/security.ts, ErrorMonitor.ts to server/; remove ioredis dep","S","P0") +
    roadmap_row(3,"Fix notification preferences","Settings toggles do nothing — broken user trust","Create notification_preferences table; add mutations; wire Courier/email channels","M","P0") +
    roadmap_row(4,"Route-level code splitting","All 40+ pages load eagerly — hurts TTFB/LCP","Replace static imports in App.tsx with React.lazy() + Suspense; prioritize Analytics, Admin pages","M","P0")
)

p1_rows = (
    roadmap_row(5,"Social inbox / unified messaging","Hootsuite, Sprout Social, ContentStudio all have this — critical for community management","Build inbox component using GetLate messaging API; display comments/DMs; allow replies","XL","P1") +
    roadmap_row(6,"Bulk scheduling / CSV import","Every competitor supports uploading 50-100 posts at once — essential for agencies","Build CSV upload parser, preview table, batch scheduling via getlatePosts.create","L","P1") +
    roadmap_row(7,"Month calendar view","All competitors offer month view — Longtale only has week","Extend CalendarTab with month/week toggle using react-day-picker","M","P1") +
    roadmap_row(8,"Link shortening & UTM tracking","Buffer, Hootsuite, Sprout all track link clicks — needed to prove ROI","Integrate bit.ly API or custom shortener; add UTM builder to compose flow; track in analytics","L","P1") +
    roadmap_row(9,"Analytics report export (PDF/CSV)","Every competitor offers downloadable reports — agencies need these for clients","Use jsPDF or html2canvas for PDF; add CSV export to analytics tables","M","P1") +
    roadmap_row(10,"Canva / media library integration","Later, Publer, Buffer all have Canva — visual content creation is table stakes","Integrate Canva Button SDK; add persistent media library with Supabase storage","L","P1")
)

p2_rows = (
    roadmap_row(11,"Portfolio analytics (real data)","PortfolioAnalytics.tsx uses mock data — this is Longtale's unique media company angle","Wire real data from hierarchy system; aggregate cross-company analytics; add comparison charts","L","P2") +
    roadmap_row(12,"Content recycling / evergreen posts","Publer and ContentStudio have this — re-queue top-performing content automatically","Add evergreen flag to posts table; build queue that re-schedules with AI-refreshed copy","L","P2") +
    roadmap_row(13,"Hashtag research tool","Hootsuite, Sprout Social, Later all offer this — improves reach and discoverability","Build AI + platform trends suggestion engine; integrate into compose flow","M","P2") +
    roadmap_row(14,"Complete Figma theme import","figmaService.ts is stubbed — theme customization is a real differentiator","Complete Figma API parsing for real colors/fonts/spacing; add persistence for custom themes","M","P2") +
    roadmap_row(15,"Real-time collaboration","RealTimeCollaboration.tsx component exists — Sprout Social offers shared calendars","Implement Supabase Realtime for post editing + calendar updates; add presence indicators","XL","P2")
)

p3_rows = (
    roadmap_row(16,"Break up ComposeTab mega-component","1,653 lines is unmaintainable and undebuggable","Extract each compose step into its own component; shared state via custom hook","L","P3") +
    roadmap_row(17,"Deduplicate platform constants","Platform icons/colors/names defined 3+ times","Create src/lib/platforms.ts with shared PLATFORM_CONFIG; import everywhere","S","P3") +
    roadmap_row(18,"Eliminate 'any' types","134 instances weaken TypeScript safety guarantees","Prioritize services and hooks; replace with proper interfaces; use satisfies","M","P3") +
    roadmap_row(19,"Add structured error logging","190+ console statements invisible in production","Integrate Sentry or similar; replace console.error with structured logger","M","P3") +
    roadmap_row(20,"Remove dead code","Duplicate services, unused middleware add confusion","Delete securityContextService.ts (duplicate), ErrorMonitor.ts, middleware/security.ts; archive landing V1-V3","S","P3") +
    roadmap_row(21,"Mobile app / PWA","All major competitors have mobile apps","Start with PWA (service worker, manifest); React Native long-term","XL","P3") +
    roadmap_row(22,"Clean up package.json","IDE plugin devDeps and ioredis pollute the project","Remove unused devDeps; move ioredis to server-only package if needed","S","P3")
)

PHASE3_ROADMAP = f"""
<!-- ROADMAP -->
<section id="roadmap" style="max-width:72rem;margin:0 auto;padding:0 1.5rem 5rem;">
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;border-radius:0.625rem;background:linear-gradient(135deg,#f59e0b,#ff6b4a);font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;color:white;flex-shrink:0;">&#9881;</div>
    <div>
      <h2 style="font-size:1.625rem;font-weight:800;color:#f4f4f5;letter-spacing:-0.02em;">Prioritized Roadmap</h2>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:2px;">22 items across 4 priority tiers — P0 critical to P3 polish</p>
    </div>
    <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(245,158,11,0.4),transparent);"></div>
  </div>

  {priority_block("P0 — Critical", "badge-p0", "Blocks growth or causes data/security risk — ship immediately", p0_rows)}
  {priority_block("P1 — High Priority", "badge-p1", "Competitive parity — features all major competitors already have", p1_rows)}
  {priority_block("P2 — Medium Priority", "badge-p2", "Differentiation — features that would make Longtale stand out", p2_rows)}
  {priority_block("P3 — Low Priority", "badge-p3", "Polish — UX improvements, performance wins, code quality fixes", p3_rows)}
</section>
"""

FOOTER_AND_JS = """
<!-- FOOTER -->
<footer style="max-width:72rem;margin:0 auto;padding:2rem 1.5rem 4rem;border-top:1px solid var(--border);">
  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(168,85,247,0.4),rgba(217,70,239,0.4),rgba(255,107,74,0.3),transparent);margin-bottom:2rem;"></div>
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1rem;">
    <div style="font-size:0.8125rem;color:var(--text-muted);">
      Generated for <span style="color:#f4f4f5;font-weight:500;">Longtale.ai</span> internal team &nbsp;·&nbsp; Claude Opus 4.6 analysis
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:#52525b;">March 2026 &nbsp;·&nbsp; 200+ files analyzed</div>
  </div>
</footer>

<!-- BACK TO TOP -->
<button id="btt" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
</button>

<!-- JAVASCRIPT -->
<script>
// ── Collapse/Expand categories ──
function toggleCat(btn) {
  const body = btn.nextElementSibling;
  const chevron = btn.querySelector('.cat-chevron');
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open');
    chevron.classList.remove('rotated');
  } else {
    body.classList.add('open');
    chevron.classList.add('rotated');
  }
}
function expandAll() {
  document.querySelectorAll('.cat-body').forEach(b => { b.classList.add('open'); b.previousElementSibling.querySelector('.cat-chevron').classList.add('rotated'); });
}
function collapseAll() {
  document.querySelectorAll('.cat-body').forEach(b => { b.classList.remove('open'); b.previousElementSibling.querySelector('.cat-chevron').classList.remove('rotated'); });
}

// ── Status filter ──
function filterStatus(status) {
  document.querySelectorAll('#status-filters .filter-pill').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.filter-pill').classList.add('active');

  document.querySelectorAll('.cat-card').forEach(card => {
    const rows = card.querySelectorAll('tbody tr[data-status]');
    let visible = 0;
    rows.forEach(row => {
      const show = status === 'all' || row.dataset.status === status;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    // Expand cards that have matching rows, collapse empty ones
    const body = card.querySelector('.cat-body');
    const chevron = card.querySelector('.cat-chevron');
    if (status !== 'all' && visible > 0) {
      body.classList.add('open');
      chevron.classList.add('rotated');
    } else if (status === 'all') {
      body.classList.remove('open');
      chevron.classList.remove('rotated');
    }
  });
}

// ── Active nav via IntersectionObserver ──
const navLinks = document.querySelectorAll('.nav-link[data-s]');
const sections = document.querySelectorAll('section[id], header');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(l => l.classList.remove('active'));
      const active = document.querySelector('.nav-link[data-s="' + id + '"]');
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-60px 0px -60% 0px', threshold: 0 });
sections.forEach(s => observer.observe(s));

// ── Scroll progress + back-to-top ──
const btt = document.getElementById('btt');
const prog = document.getElementById('prog');
window.addEventListener('scroll', () => {
  const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  prog.textContent = Math.min(pct, 100);
  if (window.scrollY > 400) btt.classList.add('visible');
  else btt.classList.remove('visible');
}, { passive: true });

// ── Smooth scroll with nav offset ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const offset = 72 + 12;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }
  });
});
</script>
</body>
</html>
"""

with open('c:/Users/alana/OneDrive/Documents/GitHub/Social-Suite-Claude-Code/report.html', 'a', encoding='utf-8') as f:
    f.write(PHASE2)
    f.write(PHASE3_COMPETITIVE)
    f.write(PHASE3_ROADMAP)
    f.write(FOOTER_AND_JS)

total = len(PHASE2) + len(PHASE3_COMPETITIVE) + len(PHASE3_ROADMAP) + len(FOOTER_AND_JS)
print(f"Phase 2+3+footer+JS written OK — {total:,} chars appended")
