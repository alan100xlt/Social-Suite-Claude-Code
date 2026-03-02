import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAllMediaCompanies, useAssignCompanyToMediaCompany, type MediaCompanyBasic } from '@/hooks/useMediaCompanyManagement';

interface MediaCompanyComboboxProps {
  companyId: string;
  currentMediaCompanyId?: string;
  currentMediaCompanyName?: string;
}

export function MediaCompanyCombobox({
  companyId,
  currentMediaCompanyId,
  currentMediaCompanyName,
}: MediaCompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: mediaCompanies } = useAllMediaCompanies();
  const assignMutation = useAssignCompanyToMediaCompany();

  const handleSelect = (mc: MediaCompanyBasic) => {
    if (mc.id === currentMediaCompanyId) {
      setOpen(false);
      return;
    }
    assignMutation.mutate({
      mediaCompanyId: mc.id,
      childCompanyId: companyId,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-xs h-8"
          disabled={assignMutation.isPending}
        >
          <span className="truncate">
            {currentMediaCompanyName || 'Assign...'}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search media companies..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-2 text-center">No media companies found</CommandEmpty>
            <CommandGroup>
              {(mediaCompanies || []).map((mc) => (
                <CommandItem
                  key={mc.id}
                  value={mc.name}
                  onSelect={() => handleSelect(mc)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      currentMediaCompanyId === mc.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {mc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
