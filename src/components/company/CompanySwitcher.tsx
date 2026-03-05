import { Check, ChevronsUpDown, Plus, Building2, Star } from 'lucide-react';
import { DEMO_COMPANY_ID, isDemoCompany } from '@/lib/demo/demo-constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAllCompanies, useCompany } from '@/hooks/useCompany';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface CompanySwitcherProps {
  collapsed?: boolean;
}

export function CompanySwitcher({ collapsed }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false);
  const { isSuperAdmin } = useAuth();
  const { data: allCompanies, isLoading: loadingAll } = useAllCompanies();
  const { data: currentCompany } = useCompany();
  const { setSelectedCompanyId } = useSelectedCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Show for all users who have at least one company (allows access to "Create New Company")
  if (!allCompanies || allCompanies.length === 0) return null;

  // Inject demo company at top of list (superadmins only)
  const demoEntry = { id: DEMO_COMPANY_ID, name: 'Longtale Demo', slug: 'demo' };
  const companiesWithDemo = isSuperAdmin
    ? [demoEntry, ...allCompanies.filter(c => c.id !== DEMO_COMPANY_ID)]
    : allCompanies;

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    // Invalidate queries that depend on company
    queryClient.invalidateQueries({ queryKey: ['company'] });
    queryClient.invalidateQueries({ queryKey: ['company-members'] });
    queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
    queryClient.invalidateQueries({ queryKey: ['getlate-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['getlate-posts'] });
    setOpen(false);
  };

  const handleCreateCompany = () => {
    setOpen(false);
    navigate('/app/onboarding/setup?addNew=true');
  };

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10"
            title={currentCompany?.name || 'Select company'}
          >
            <Building2 className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" side="right" align="start">
          <CompanySwitcherContent
            companies={companiesWithDemo}
            currentCompany={currentCompany}
            onSelect={handleSelectCompany}
            onCreate={handleCreateCompany}
            loading={loadingAll}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentCompany?.name || 'Select company'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" side="right" align="start">
        <CompanySwitcherContent
          companies={companiesWithDemo}
          currentCompany={currentCompany}
          onSelect={handleSelectCompany}
          onCreate={handleCreateCompany}
          loading={loadingAll}
        />
      </PopoverContent>
    </Popover>
  );
}

function CompanySwitcherContent({
  companies,
  currentCompany,
  onSelect,
  onCreate,
  loading,
}: {
  companies: { id: string; name: string; slug: string }[];
  currentCompany: { id: string; name: string } | null | undefined;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}) {
  return (
    <Command>
      <CommandInput placeholder="Search companies..." />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Loading...' : 'No companies found.'}
        </CommandEmpty>
        <CommandGroup heading="Companies">
          {companies.map((company) => (
            <CommandItem
              key={company.id}
              value={company.name}
              onSelect={() => onSelect(company.id)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  currentCompany?.id === company.id ? 'opacity-100' : 'opacity-0'
                )}
              />
              {isDemoCompany(company.id) && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500 mr-1" />
              )}
              <span>{company.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={onCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Create New Company
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
