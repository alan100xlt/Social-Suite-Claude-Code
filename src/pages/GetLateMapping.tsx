import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Link2, Check, AlertCircle, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllCompanies, useUpdateCompany, type Company } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FaTwitter, FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube, FaPinterest, FaReddit } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef, type ICellRendererParams, type GridReadyEvent } from "ag-grid-community";
import { gridTheme, gridThemeDark } from "@/lib/ag-grid-theme";
import { useTheme } from "@/contexts/ThemeContext";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";

interface GetLateProfile {
  id: string;
  name: string;
}

interface GetLateAccount {
  _id: string;
  platform: string;
  name: string;
  username?: string;
  avatar?: string;
}

// Platform icon mapping
const platformIcons: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="w-4 h-4 text-[#1DA1F2]" />,
  instagram: <FaInstagram className="w-4 h-4 text-[#E4405F]" />,
  facebook: <FaFacebook className="w-4 h-4 text-[#1877F2]" />,
  linkedin: <FaLinkedin className="w-4 h-4 text-[#0A66C2]" />,
  tiktok: <FaTiktok className="w-4 h-4" />,
  youtube: <FaYoutube className="w-4 h-4 text-[#FF0000]" />,
  pinterest: <FaPinterest className="w-4 h-4 text-[#BD081C]" />,
  reddit: <FaReddit className="w-4 h-4 text-[#FF4500]" />,
  bluesky: <SiBluesky className="w-4 h-4 text-[#0085FF]" />,
  threads: <SiThreads className="w-4 h-4" />,
};

function MappingOverviewGrid({
  companies,
  getProfileName,
  getAccountsForCompany,
  isLoadingAccountsForCompany,
  platformIcons: pIcons,
}: {
  companies: Company[];
  getProfileName: (profileId: string | null) => string | null;
  getAccountsForCompany: (company: Company) => GetLateAccount[];
  isLoadingAccountsForCompany: (company: Company) => boolean;
  platformIcons: Record<string, React.ReactNode>;
}) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const [quickFilter, setQuickFilter] = useState('');
  const gridRef = useRef<AgGridReact<Company>>(null);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'getlate-mapping.csv' });
  }, []);

  const colDefs = useMemo<ColDef<Company>[]>(
    () => [
      {
        headerName: 'Company',
        field: 'name',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams<Company>) => (
          <span className="font-medium text-foreground">{params.value}</span>
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Slug',
        field: 'slug',
        width: 130,
        cellRenderer: (params: ICellRendererParams<Company>) => (
          <span className="text-muted-foreground">{params.value}</span>
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'GetLate Profile',
        field: 'getlate_profile_id',
        width: 160,
        cellRenderer: (params: ICellRendererParams<Company>) => {
          const id = params.value;
          return (
            <span className="font-mono text-sm text-muted-foreground">
              {id ? getProfileName(id) || (id as string).slice(0, 12) + '...' : '\u2014'}
            </span>
          );
        },
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => {
          const id = params.data?.getlate_profile_id;
          return id ? getProfileName(id) || id : '';
        },
      },
      {
        headerName: 'Accounts',
        width: 100,
        cellRenderer: (params: ICellRendererParams<Company>) => {
          const c = params.data;
          if (!c || !c.getlate_profile_id) return <span className="text-muted-foreground">{'\u2014'}</span>;
          if (isLoadingAccountsForCompany(c)) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
          const accts = getAccountsForCompany(c);
          return (
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <Users className="w-3 h-3" />
              {accts.length}
            </Badge>
          );
        },
        type: 'rightAligned',
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Connected Accounts',
        width: 180,
        cellRenderer: (params: ICellRendererParams<Company>) => {
          const c = params.data;
          if (!c || !c.getlate_profile_id) return <span className="text-muted-foreground">{'\u2014'}</span>;
          if (isLoadingAccountsForCompany(c)) return <span className="text-muted-foreground text-sm">Loading...</span>;
          const accts = getAccountsForCompany(c);
          if (accts.length === 0) return <span className="text-muted-foreground text-sm">No accounts</span>;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  View {accts.length} account{accts.length !== 1 ? 's' : ''}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-background border border-border z-50">
                {accts.map((account) => (
                  <DropdownMenuItem key={account._id} className="flex items-center gap-3 py-2">
                    {pIcons[account.platform] || <div className="w-4 h-4 rounded-full bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{account.name || account.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Status',
        width: 100,
        cellRenderer: (params: ICellRendererParams<Company>) => {
          const c = params.data;
          if (!c) return null;
          return c.getlate_profile_id ? (
            <Badge variant="default" className="bg-success/10 text-success border-0">
              <Check className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not linked
            </Badge>
          );
        },
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => params.data?.getlate_profile_id ? 'Linked' : 'Not linked',
      },
    ],
    [getProfileName, getAccountsForCompany, isLoadingAccountsForCompany, pIcons]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
    }),
    []
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Mapping Overview</CardTitle>
        <CardDescription>
          Quick view of all company-profile associations and connected accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataGridToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onExport={onExportCsv}
          quickFilterPlaceholder="Search companies..."
        />
        <div className="relative">
          <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
          <AgGridReact<Company>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
            modules={[AllCommunityModule]}
            rowData={companies}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilter}
            domLayout="autoHeight"
            suppressCellFocus
            animateRows
            onGridReady={onGridReady}
            getRowId={(params) => params.data.id}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GetLateMappingPage() {
  const { data: companies, isLoading: companiesLoading } = useAllCompanies();
  const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<GetLateProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  
  // Store accounts per profile
  const [accountsByProfile, setAccountsByProfile] = useState<Record<string, GetLateAccount[]>>({});
  const [loadingAccounts, setLoadingAccounts] = useState<Record<string, boolean>>({});

  // Fetch GetLate profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      setProfilesError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('getlate-connect', {
          body: { action: 'get-profiles' },
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to fetch profiles');
        }
        
        if (data?.profiles) {
          const fetchedProfiles = data.profiles.map((p: { _id?: string; id?: string; name: string }) => ({
            id: p._id || p.id || '',
            name: p.name,
          }));
          setProfiles(fetchedProfiles);
          
          // Fetch accounts for each profile that's linked to a company
          const linkedProfileIds = companies
            ?.map(c => c.getlate_profile_id)
            .filter((id): id is string => !!id) || [];
          
          const uniqueProfileIds = [...new Set(linkedProfileIds)];
          uniqueProfileIds.forEach(profileId => {
            fetchAccountsForProfile(profileId);
          });
        } else {
          setProfiles([]);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
        setProfilesError(err instanceof Error ? err.message : 'Failed to load profiles');
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [companies]);

  const fetchAccountsForProfile = async (profileId: string) => {
    if (accountsByProfile[profileId] || loadingAccounts[profileId]) return;
    
    setLoadingAccounts(prev => ({ ...prev, [profileId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('getlate-accounts', {
        body: { action: 'list', profileId },
      });
      
      if (error) {
        console.error('Failed to fetch accounts for profile:', profileId, error);
        return;
      }
      
      if (data?.accounts) {
        setAccountsByProfile(prev => ({ ...prev, [profileId]: data.accounts }));
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoadingAccounts(prev => ({ ...prev, [profileId]: false }));
    }
  };

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);

  const handleProfileChange = (profileId: string) => {
    if (!selectedCompanyId) return;
    
    const profileName = profiles.find(p => p.id === profileId)?.name || 'profile';
    const companyName = selectedCompany?.name || 'company';
    
    updateCompany(
      { 
        id: selectedCompanyId, 
        getlate_profile_id: profileId === 'none' ? null : profileId 
      },
      {
        onSuccess: () => {
          toast.success('Profile linked', {
            description: profileId === 'none' 
              ? `Unlinked profile from ${companyName}` 
              : `Linked "${profileName}" to ${companyName}`,
          });
          // Fetch accounts for newly linked profile
          if (profileId !== 'none') {
            fetchAccountsForProfile(profileId);
          }
        },
      }
    );
  };

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return null;
    return profiles.find(p => p.id === profileId)?.name || profileId;
  };

  const getAccountsForCompany = (company: Company) => {
    if (!company.getlate_profile_id) return [];
    return accountsByProfile[company.getlate_profile_id] || [];
  };

  const isLoadingAccountsForCompany = (company: Company) => {
    if (!company.getlate_profile_id) return false;
    return loadingAccounts[company.getlate_profile_id] || false;
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          API Profile Mapping
        </h1>
        <p className="text-muted-foreground mt-1">
          Associate API profiles with your companies for proper data isolation
        </p>
      </div>

      {companiesLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !companies || companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No companies found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a company first to map API profiles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Companies List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Companies
              </CardTitle>
              <CardDescription>
                Select a company to map
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedCompanyId === company.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.slug}</p>
                      </div>
                      {company.getlate_profile_id ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not linked
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Profile Mapping */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                API Profile
              </CardTitle>
              <CardDescription>
                {selectedCompany 
                  ? `Configure API profile for ${selectedCompany.name}`
                  : 'Select a company from the left to configure'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCompanyId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a company from the list to map an API profile
                  </p>
                </div>
              ) : loadingProfiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading profiles...</span>
                </div>
              ) : profilesError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-destructive mb-4" />
                  <p className="text-destructive font-medium">Failed to load profiles</p>
                  <p className="text-sm text-muted-foreground mt-1">{profilesError}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Status */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Status</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedCompany?.getlate_profile_id 
                            ? `Linked to: ${getProfileName(selectedCompany.getlate_profile_id)}`
                            : 'No profile linked'
                          }
                        </p>
                      </div>
                      {selectedCompany?.getlate_profile_id && (
                        <Check className="w-5 h-5 text-success" />
                      )}
                    </div>
                  </div>

                  {/* Profile Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Select API Profile
                    </label>
                    <Select
                      value={selectedCompany?.getlate_profile_id || 'none'}
                      onValueChange={handleProfileChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Choose a profile..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="none">
                          <span className="text-muted-foreground">No profile (unlink)</span>
                        </SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This profile will be used for all GetLate API calls for this company
                    </p>
                  </div>

                  {/* Profile ID Display */}
                  {selectedCompany?.getlate_profile_id && (
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Profile ID</p>
                      <p className="font-mono text-sm text-foreground mt-1 break-all">
                        {selectedCompany.getlate_profile_id}
                      </p>
                    </div>
                  )}

                  {isUpdating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Table */}
      {companies && companies.length > 0 && (
        <MappingOverviewGrid
          companies={companies}
          getProfileName={getProfileName}
          getAccountsForCompany={getAccountsForCompany}
          isLoadingAccountsForCompany={isLoadingAccountsForCompany}
          platformIcons={platformIcons}
        />
      )}
    </DashboardLayout>
  );
}