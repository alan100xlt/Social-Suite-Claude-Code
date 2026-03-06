import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';

interface CorrectionStatusDropdownProps {
  conversationId: string;
  currentStatus: string;
}

const statusOptions = [
  { value: 'received', label: 'Received', color: 'text-yellow-600' },
  { value: 'reviewing', label: 'Reviewing', color: 'text-blue-600' },
  { value: 'fixed', label: 'Fixed', color: 'text-green-600' },
];

export function CorrectionStatusDropdown({ conversationId, currentStatus }: CorrectionStatusDropdownProps) {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (value: string) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      const { error } = await supabase
        .from('inbox_conversations' as any)
        .update({ correction_status: value })
        .eq('id', conversationId)
        .eq('company_id', selectedCompanyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', selectedCompanyId] });
    },
  });

  return (
    <Select value={currentStatus} onValueChange={(v) => updateStatus.mutate(v)}>
      <SelectTrigger className="h-6 text-xs w-[110px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className={`text-xs font-medium ${opt.color}`}>{opt.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
