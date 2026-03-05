import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import type { InboxMessage } from '@/lib/api/inbox';

interface ThreadedMessagesProps {
  messages: InboxMessage[];
  onReply?: (message: InboxMessage) => void;
}

interface ThreadNode {
  message: InboxMessage;
  replies: ThreadNode[];
}

function buildThreadTree(messages: InboxMessage[]): ThreadNode[] {
  const roots: ThreadNode[] = [];
  const nodeMap = new Map<string, ThreadNode>();

  // Create nodes
  for (const msg of messages) {
    nodeMap.set(msg.id, { message: msg, replies: [] });
  }

  // Build tree
  for (const msg of messages) {
    const node = nodeMap.get(msg.id)!;
    if (msg.parent_message_id && nodeMap.has(msg.parent_message_id)) {
      nodeMap.get(msg.parent_message_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function ThreadBranch({
  node,
  depth,
  onReply,
}: {
  node: ThreadNode;
  depth: number;
  onReply?: (message: InboxMessage) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = node.replies.length > 0;
  const manyReplies = node.replies.length >= 5;

  return (
    <div>
      <ChatBubble message={node.message} onReply={onReply} />

      {hasReplies && (
        <div className={cn('ml-6 mt-1 relative', depth > 0 && 'ml-4')}>
          {/* Vertical connector line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

          {manyReplies && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 mb-1 ml-6"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {collapsed ? `Show ${node.replies.length} replies` : 'Collapse'}
            </Button>
          )}

          {!collapsed && (
            <div className="space-y-3 pl-6">
              {node.replies.map((reply) => (
                <ThreadBranch key={reply.message.id} node={reply} depth={depth + 1} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThreadedMessages({ messages, onReply }: ThreadedMessagesProps) {
  const hasAnyThreading = messages.some(m => m.parent_message_id);

  // If no threading, render flat
  if (!hasAnyThreading) {
    return (
      <div className="space-y-3">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} onReply={onReply} />
        ))}
      </div>
    );
  }

  const tree = buildThreadTree(messages);

  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <ThreadBranch key={node.message.id} node={node} depth={0} onReply={onReply} />
      ))}
    </div>
  );
}
