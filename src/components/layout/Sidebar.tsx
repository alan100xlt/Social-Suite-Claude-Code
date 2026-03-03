import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Link2,
  PenSquare,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Loader2,
  Newspaper,
  Settings,
  ScrollText,
  Plus,
  Zap,
  ClipboardList,
  Mail,
  Wrench,
  Building2,
  HeartPulse,
  Users,
  Palette,
} from "lucide-react";
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useUserRole } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMediaCompanies } from "@/hooks/useMediaCompanyManagement";
import { usePlatform } from "@/contexts/PlatformContext";
import { Platform } from "@/lib/api/getlate";
import { CompanySwitcher } from "@/components/company/CompanySwitcher";
import { CreateMediaCompanyDialog } from "@/components/admin/CreateMediaCompanyDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type NavItem = { name: string; href: string; icon: React.ElementType; addAction?: string };

const mainNavigation: NavItem[] = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard },
  { name: "Content", href: "/app/content", icon: Newspaper, addAction: "/app/content?tab=posts" },
  { name: "Connections", href: "/app/connections", icon: Link2 },
];

const analyticsNavigation: NavItem[] = [
  { name: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { name: "Insights", href: "/app/analytics-v2", icon: Sparkles },
  { name: "Advanced", href: "/app/analytics-v3", icon: Zap },
];

const manageNavigation: NavItem[] = [
  { name: "Settings", href: "/app/settings", icon: Settings },
  { name: "Theme", href: "/app/theme", icon: Palette },
];

// Platform icon and color mapping
const platformConfig: Record<Platform, { icon: React.ElementType; colorClass: string; name: string }> = {
  instagram: { icon: FaInstagram, colorClass: "text-pink-500", name: "Instagram" },
  twitter: { icon: FaTwitter, colorClass: "text-sky-500", name: "Twitter" },
  facebook: { icon: FaFacebook, colorClass: "text-blue-600", name: "Facebook" },
  linkedin: { icon: FaLinkedin, colorClass: "text-blue-700", name: "LinkedIn" },
  tiktok: { icon: FaTiktok, colorClass: "text-foreground", name: "TikTok" },
  youtube: { icon: FaYoutube, colorClass: "text-red-500", name: "YouTube" },
  pinterest: { icon: FaYoutube, colorClass: "text-red-600", name: "Pinterest" },
  reddit: { icon: FaYoutube, colorClass: "text-orange-500", name: "Reddit" },
  bluesky: { icon: SiBluesky, colorClass: "text-sky-400", name: "Bluesky" },
  threads: { icon: SiThreads, colorClass: "text-foreground", name: "Threads" },
  "google-business": { icon: LayoutDashboard, colorClass: "text-green-500", name: "Google Business" },
  telegram: { icon: LayoutDashboard, colorClass: "text-blue-400", name: "Telegram" },
  snapchat: { icon: LayoutDashboard, colorClass: "text-yellow-400", name: "Snapchat" },
};

// Helper to generate profile URL based on platform
function getProfileUrl(platform: Platform, username?: string, metadata?: Record<string, unknown>): string | null {
  if (metadata?.selectedPageId && platform === "facebook") {
    return `https://facebook.com/${metadata.selectedPageId}`;
  }

  if (!username) return null;

  const urlTemplates: Partial<Record<Platform, string>> = {
    instagram: `https://instagram.com/${username}`,
    twitter: `https://twitter.com/${username}`,
    facebook: `https://facebook.com/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
    tiktok: `https://tiktok.com/@${username}`,
    youtube: `https://youtube.com/@${username}`,
    pinterest: `https://pinterest.com/${username}`,
    reddit: `https://reddit.com/user/${username}`,
    bluesky: `https://bsky.app/profile/${username}`,
    threads: `https://threads.net/@${username}`,
  };

  return urlTemplates[platform] || null;
}

function NavSection({ label, items, collapsed, location }: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  location: { pathname: string };
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pt-4 pb-1">
          <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">{label}</p>
        </div>
      )}
      {collapsed && <div className="pt-2" />}
      {items.map((item) => {
        const isActive = location.pathname === item.href || (item.href !== '/app' && location.pathname.startsWith(item.href));
        return (
          <div key={item.name} className="flex items-center gap-1">
            <Link
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group flex-1",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  "flex-shrink-0 transition-transform group-hover:scale-110",
                  isActive && "drop-shadow-sm"
                )}
              />
              {!collapsed && (
                <span className="font-medium text-sm">{item.name}</span>
              )}
            </Link>
            {item.addAction && !collapsed && (
              <Link
                to={item.addAction}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title="Create new post"
              >
                <Plus size={16} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [createMediaCompanyOpen, setCreateMediaCompanyOpen] = useState(false);
  const location = useLocation();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useAuth();
  const { data: mediaCompanies } = useUserMediaCompanies();
  const platform = usePlatform();

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/app" className="flex items-center flex-1 min-w-0 overflow-hidden">
            {platform.platform_logo_url ? (
              <img src={platform.platform_logo_url} alt={platform.platform_name} className="max-h-14 w-full object-contain object-left" />
            ) : (
              <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="max-h-14 w-full object-contain object-left" />
            )}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Company Switcher */}
      <div className="px-3 pt-3">
        <CompanySwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main */}
        <NavSection label="Main" items={mainNavigation} collapsed={collapsed} location={location} />

        {/* Analytics */}
        <NavSection label="Analytics" items={analyticsNavigation} collapsed={collapsed} location={location} />

        {/* My Channels Flyout */}
        <DropdownMenu open={channelsOpen} onOpenChange={setChannelsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                channelsOpen && "bg-sidebar-accent"
              )}
            >
              <ExternalLink
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <>
                  <span className="font-medium text-sm flex-1 text-left">My Channels</span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition-transform",
                      channelsOpen && "rotate-180"
                    )}
                  />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-64 bg-popover border border-border shadow-lg z-50"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-semibold text-foreground">My Social Channels</p>
              <p className="text-xs text-muted-foreground">Quick links to your profiles</p>
            </div>

            {accountsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : accounts && accounts.length > 0 ? (
              <div className="py-1">
                {accounts.map((account) => {
                  const config = platformConfig[account.platform as Platform];
                  const Icon = config?.icon || LayoutDashboard;
                  const profileUrl = getProfileUrl(
                    account.platform as Platform,
                    account.username,
                    account.metadata as Record<string, unknown>
                  );

                  return (
                    <DropdownMenuItem
                      key={account.id}
                      asChild
                      disabled={!profileUrl}
                      className="cursor-pointer"
                    >
                      <a
                        href={profileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Icon className={cn("w-5 h-5", config?.colorClass)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {account.displayName || account.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {config?.name} • @{account.username}
                          </p>
                        </div>
                        <ExternalLink size={14} className="text-muted-foreground flex-shrink-0" />
                      </a>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/connections" className="flex items-center gap-3 px-3 py-2">
                    <Link2 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Manage Connections</span>
                  </Link>
                </DropdownMenuItem>
              </div>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">No channels connected</p>
                <Link
                  to="/app/connections"
                  className="text-sm text-primary hover:underline"
                >
                  Connect your first account →
                </Link>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Manage */}
        <NavSection label="Manage" items={manageNavigation} collapsed={collapsed} location={location} />

        {/* Media Companies */}
        {(isOwnerOrAdmin || isSuperAdmin || (mediaCompanies && mediaCompanies.length > 0)) && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-4 pb-1">
                <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Media Companies</p>
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            {mediaCompanies && mediaCompanies.length > 0 ? (
              mediaCompanies.map((mc) => (
                <Link
                  key={mc.id}
                  to={`/app/media-company/${mc.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    location.pathname.startsWith(`/app/media-company/${mc.id}`)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Building2
                    size={20}
                    className="flex-shrink-0 transition-transform group-hover:scale-110"
                  />
                  {!collapsed && (
                    <span className="font-medium text-sm truncate">{mc.name}</span>
                  )}
                </Link>
              ))
            ) : (
              !collapsed && (
                <p className="px-3 py-1 text-xs text-sidebar-foreground/40">No media companies yet</p>
              )
            )}
            {(isOwnerOrAdmin || isSuperAdmin) && !collapsed && (
              <button
                onClick={() => setCreateMediaCompanyOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground text-sm"
              >
                <Plus size={18} className="flex-shrink-0" />
                <span className="font-medium">New Media Company</span>
              </button>
            )}
            {(isOwnerOrAdmin || isSuperAdmin) && collapsed && (
              <button
                onClick={() => setCreateMediaCompanyOpen(true)}
                className="w-full flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="New Media Company"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        )}

        {/* Superadmin Only */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3 flex items-center gap-2">
                <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Superadmin</p>
                <span className="text-xs font-bold text-primary">CC</span>
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            <Link
              to="/app/admin/api-logs"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/api-logs"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <ScrollText
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">API Logs</span>
              )}
            </Link>
            <Link
              to="/app/admin/mapping"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/mapping"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Link2
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">API Mapping</span>
              )}
            </Link>
            <Link
              to="/app/admin/email-branding"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/email-branding"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Mail
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">Email Branding</span>
              )}
            </Link>
            <Link
              to="/app/admin/platform"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/platform"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Wrench
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">Platform Settings</span>
              )}
            </Link>
            <Link
              to="/app/admin/companies"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/companies"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Building2
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">Companies</span>
              )}
            </Link>
            <Link
              to="/app/admin/users"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/users"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Users
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">Users</span>
              )}
            </Link>
            <Link
              to="/app/admin/cron-health"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                location.pathname === "/app/admin/cron-health"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <HeartPulse
                size={20}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="font-medium text-sm">Cron Health</span>
              )}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="p-3 rounded-lg bg-sidebar-accent">
            <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-1">Early Access</p>
            <p className="text-sm font-semibold text-sidebar-foreground">
              🎉 50% off for life
            </p>
            <p className="text-xs text-sidebar-foreground/60 mt-1">
              Thanks for being an early explorer!
            </p>
          </div>
        )}
      </div>

      {/* Create Media Company Dialog */}
      <CreateMediaCompanyDialog open={createMediaCompanyOpen} onOpenChange={setCreateMediaCompanyOpen} />
    </aside>
  );
}
