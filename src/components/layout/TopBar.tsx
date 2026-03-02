import { Settings, LogOut, Building2, Check, ChevronsUpDown, Plus, Shield, Loader2, Palette } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCompany, useAllCompanies } from "@/hooks/useCompany";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IntegrationStatusMenu } from "./IntegrationStatusMenu";
import { NotificationInbox } from "./NotificationInbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

export function TopBar() {
  const { user, signOut, isSuperAdmin, impersonateUser } = useAuth();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const { data: allCompanies } = useAllCompanies();
  const { setSelectedCompanyId } = useSelectedCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentTheme, toggleTheme, setTheme } = useTheme();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Fetch all profiles for impersonation (superadmin only)
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles-for-impersonation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, company_id")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  const handleImpersonate = async (email: string) => {
    setImpersonating(true);
    setImpersonateOpen(false);
    const { error } = await impersonateUser(email);
    if (error) {
      toast({ title: "Impersonation failed", description: error.message, variant: "destructive" });
      setImpersonating(false);
    } else {
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    queryClient.invalidateQueries({ queryKey: ["company"] });
    queryClient.invalidateQueries({ queryKey: ["company-members"] });
    queryClient.invalidateQueries({ queryKey: ["rss-feeds"] });
    queryClient.invalidateQueries({ queryKey: ["getlate-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["getlate-posts"] });
    queryClient.invalidateQueries({ queryKey: ["last-sync-time"] });
    setCompanyOpen(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-end h-14 px-6">
        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Integration Status Menu */}
          <IntegrationStatusMenu />
          {/* Superadmin Badge with Impersonation */}
          {isSuperAdmin && (
            <Popover open={impersonateOpen} onOpenChange={setImpersonateOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer">
                  <Badge variant="outline" className="border-warning text-warning gap-1 hover:bg-warning/10 transition-colors">
                    {impersonating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    Superadmin
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search users to impersonate..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup heading="Users">
                      {allProfiles
                        ?.filter((p) => p.email && p.email !== user?.email)
                        .map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.full_name || ""} ${p.email || ""}`}
                            onSelect={() => p.email && handleImpersonate(p.email)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{p.full_name || "No name"}</span>
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Company Selector (Superadmin only) */}
          {isSuperAdmin && allCompanies && (
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyOpen}
                  className="w-48 justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{company?.name || "Select company"}</span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search companies..." />
                  <CommandList>
                    <CommandEmpty>No companies found.</CommandEmpty>
                    <CommandGroup heading="Companies">
                      {allCompanies.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => handleSelectCompany(c.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              company?.id === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>{c.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setCompanyOpen(false);
                          navigate("/setup-company");
                        }}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Company
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full"
            title="Toggle Theme"
          >
            <Palette className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <NotificationInbox />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {company && (
                  <p className="text-xs text-muted-foreground mt-1">{company.name}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/theme" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4" />
                  <span>Theme Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings?tab=company" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  <span>Company Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
