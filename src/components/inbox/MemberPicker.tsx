import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompanyMember } from '@/hooks/useCompany';
import { useCrossOutletMembers, type CrossOutletMember } from '@/hooks/useCrossOutletMembers';

interface MemberPickerProps {
  members: CompanyMember[];
  currentUserId: string | undefined;
  assignedTo: string | null;
  onAssign: (memberId: string | null) => void;
  compact?: boolean;
}

export function MemberPicker({ members, currentUserId, assignedTo, onAssign, compact }: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: crossOutletMembers = [] } = useCrossOutletMembers();

  const assignedMember = assignedTo
    ? members.find(m => m.id === assignedTo) ||
      (crossOutletMembers.find(m => m.id === assignedTo) as CompanyMember | undefined)
    : null;

  const filtered = search
    ? members.filter(m =>
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  // Sort: current user first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
  });

  // Filter cross-outlet members by search, excluding members already in current company
  const memberIds = new Set(members.map(m => m.id));
  const filteredCrossOutlet = crossOutletMembers
    .filter(m => !memberIds.has(m.id))
    .filter(m =>
      !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.outlet_name?.toLowerCase().includes(search.toLowerCase())
    );

  const handleSelect = (memberId: string) => {
    onAssign(memberId === assignedTo ? null : memberId);
    setOpen(false);
    setSearch('');
  };

  const handleUnassign = () => {
    onAssign(null);
    setOpen(false);
    setSearch('');
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
        <PopoverTrigger asChild>
          {assignedMember ? (
            <button className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignedMember.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {(assignedMember.full_name || assignedMember.email || '??').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium truncate max-w-[100px]">
                {assignedMember.id === currentUserId ? 'You' : assignedMember.full_name || assignedMember.email}
              </span>
            </button>
          ) : (
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Assign</span>
            </button>
          )}
        </PopoverTrigger>
        <MemberList
          members={sorted}
          crossOutletMembers={filteredCrossOutlet}
          currentUserId={currentUserId}
          assignedTo={assignedTo}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onUnassign={assignedTo ? handleUnassign : undefined}
        />
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          {assignedMember ? (
            <>
              <Avatar className="h-4 w-4">
                <AvatarImage src={assignedMember.avatar_url || undefined} />
                <AvatarFallback className="text-[7px]">
                  {(assignedMember.full_name || assignedMember.email || '??').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">
                {assignedMember.id === currentUserId ? 'You' : assignedMember.full_name || assignedMember.email}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </>
          )}
        </Button>
      </PopoverTrigger>
      <MemberList
        members={sorted}
        crossOutletMembers={filteredCrossOutlet}
        currentUserId={currentUserId}
        assignedTo={assignedTo}
        search={search}
        onSearchChange={setSearch}
        onSelect={handleSelect}
        onUnassign={assignedTo ? handleUnassign : undefined}
      />
    </Popover>
  );
}

function MemberList({
  members,
  crossOutletMembers = [],
  currentUserId,
  assignedTo,
  search,
  onSearchChange,
  onSelect,
  onUnassign,
}: {
  members: CompanyMember[];
  crossOutletMembers?: CrossOutletMember[];
  currentUserId: string | undefined;
  assignedTo: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onUnassign?: () => void;
}) {
  return (
    <PopoverContent className="w-[240px] p-0" align="start">
      <div className="p-2 border-b">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-md border bg-muted/50 outline-none focus:border-primary"
          autoFocus
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto py-1">
        {onUnassign && (
          <button
            onClick={onUnassign}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Unassign
          </button>
        )}
        {members.map((member) => {
          const isSelected = member.id === assignedTo;
          const isSelf = member.id === currentUserId;
          const name = member.full_name || member.email || 'Unknown';
          const initials = name.slice(0, 2).toUpperCase();

          return (
            <button
              key={member.id}
              onClick={() => onSelect(member.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                isSelected && 'bg-primary/5'
              )}
            >
              <Avatar className="h-5 w-5 flex-shrink-0">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <span className="font-medium truncate block">
                  {isSelf ? `${name} (you)` : name}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">{member.role}</span>
              </div>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
            </button>
          );
        })}
        {members.length === 0 && crossOutletMembers.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">No members found</p>
        )}

        {/* Cross-outlet members section */}
        {crossOutletMembers.length > 0 && (
          <>
            <div className="px-3 py-1.5 border-t mt-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                From other outlets
              </span>
            </div>
            {crossOutletMembers.map((member) => {
              const isSelected = member.id === assignedTo;
              const name = member.full_name || member.email || 'Unknown';
              const initials = name.slice(0, 2).toUpperCase();

              return (
                <button
                  key={`cross-${member.id}-${member.outlet_id}`}
                  onClick={() => onSelect(member.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <span className="font-medium truncate block">{name}</span>
                    <span className="text-[10px] text-muted-foreground">{member.outlet_name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </>
        )}
      </div>
    </PopoverContent>
  );
}
