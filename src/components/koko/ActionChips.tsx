import { useNavigate } from 'react-router-dom';
import type { KokoAction } from '@/hooks/useKokoChat';
import { cn } from '@/lib/utils';

interface ActionChipsProps {
  actions: KokoAction[];
  sendMessage: (text: string, action?: KokoAction) => void;
}

export function ActionChips({ actions, sendMessage }: ActionChipsProps) {
  const navigate = useNavigate();

  const handleClick = (action: KokoAction) => {
    switch (action.action_type) {
      case 'send_message':
        sendMessage(action.payload, action);
        break;
      case 'navigate':
        navigate(action.payload);
        break;
      case 'open_draft':
        navigate(`/app/content?tab=posts&draft=${action.payload}`);
        break;
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => handleClick(action)}
          className={cn(
            'border border-border rounded-full px-3 py-1',
            'text-xs',
            'hover:bg-muted',
            'transition-colors',
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
