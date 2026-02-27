import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp, Palette } from "lucide-react";

const versions = [
  { path: "/", label: "V1 — Dark Premium", color: "#a855f7" },
  { path: "/v2", label: "V2 — Editorial Warm", color: "#f59e0b" },
  { path: "/v3", label: "V3 — Aurora Glass", color: "#06b6d4" },
  { path: "/v4", label: "V4 — Bold Neon", color: "#a3e635" },
];

export function VersionSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Only show on landing pages
  const isLanding = ["/", "/v2", "/v3", "/v4"].includes(location.pathname);
  if (!isLanding) return null;

  const current = versions.find(v => v.path === location.pathname) || versions[0];

  return (
    <div className="fixed bottom-6 left-6 z-[100]">
      {/* Expanded menu */}
      {open && (
        <div className="mb-2 rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden min-w-[220px]">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Landing Variations</p>
          </div>
          <div className="p-1.5">
            {versions.map(v => (
              <button
                key={v.path}
                onClick={() => { navigate(v.path); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  v.path === current.path
                    ? "bg-white/10 text-white font-semibold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl text-white hover:bg-zinc-800/95 transition-colors"
      >
        <Palette className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium">{current.label}</span>
        <ChevronUp className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
