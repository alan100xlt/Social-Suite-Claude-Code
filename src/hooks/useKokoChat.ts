import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useKoko } from '@/contexts/KokoContext';

export interface KokoAction {
  label: string;
  action_type: 'send_message' | 'navigate' | 'open_draft';
  payload: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result: Record<string, unknown>;
}

export interface KokoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: KokoAction[];
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  created_at: string;
}

interface SSEEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'actions' | 'done' | 'error';
  content?: string;
  // tool_call events have name + args at top level
  name?: string;
  args?: Record<string, unknown>;
  // tool_result events have name + result at top level
  result?: Record<string, unknown>;
  actions?: KokoAction[];
  thread_id?: string;
  message_id?: string;
  tokens_used?: number;
  error?: string;
}

export function useKokoChat(threadId: string | null) {
  const { session } = useAuth();
  const { data: company } = useCompany();
  const { pageContext } = useKoko();
  const [messages, setMessages] = useState<KokoMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCall[]>([]);
  const [streamingToolResults, setStreamingToolResults] = useState<ToolResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch existing messages when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('Failed to fetch Koko messages:', error);
        return;
      }

      if (data) {
        setMessages(data.map((row: any) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          actions: row.actions ?? undefined,
          tool_calls: row.tool_calls ?? undefined,
          tool_results: row.tool_results ?? undefined,
          created_at: row.created_at,
        })));
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const sendMessage = useCallback(async (text: string, action?: KokoAction) => {
    if (!session?.access_token || !company?.id || isStreaming) return;

    const userMessage: KokoMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingToolCalls([]);
    setStreamingToolResults([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-copilot`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: text,
          company_id: company.id,
          context: pageContext,
          action,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedToolCalls: ToolCall[] = [];
      let accumulatedToolResults: ToolResult[] = [];
      let accumulatedActions: KokoAction[] | undefined;
      let finalMessage: KokoMessage | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const event: SSEEvent = JSON.parse(jsonStr);

            switch (event.type) {
              case 'text':
                if (event.content) {
                  accumulatedContent += event.content;
                  setStreamingContent(accumulatedContent);
                }
                break;

              case 'tool_call':
                if (event.name) {
                  const tc: ToolCall = { name: event.name, arguments: event.args || {} };
                  accumulatedToolCalls = [...accumulatedToolCalls, tc];
                  setStreamingToolCalls(accumulatedToolCalls);
                }
                break;

              case 'tool_result':
                if (event.name) {
                  const tr: ToolResult = { name: event.name, result: event.result || {} };
                  accumulatedToolResults = [...accumulatedToolResults, tr];
                  setStreamingToolResults(accumulatedToolResults);
                }
                break;

              case 'actions':
                if (event.actions) {
                  accumulatedActions = event.actions;
                }
                break;

              case 'done':
                // Edge function sends thread_id + message_id, not full message
                finalMessage = {
                  id: event.message_id || crypto.randomUUID(),
                  role: 'assistant',
                  content: accumulatedContent,
                  actions: accumulatedActions,
                  tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                  tool_results: accumulatedToolResults.length > 0 ? accumulatedToolResults : undefined,
                  created_at: new Date().toISOString(),
                };
                break;

              case 'error':
                console.error('SSE error:', event.error);
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Finalize the assistant message
      const assistantMessage: KokoMessage = finalMessage ?? {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulatedContent,
        actions: accumulatedActions,
        tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
        tool_results: accumulatedToolResults.length > 0 ? accumulatedToolResults : undefined,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Koko chat error:', error);

      const errorMessage: KokoMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingToolCalls([]);
      setStreamingToolResults([]);
      abortControllerRef.current = null;
    }
  }, [session?.access_token, company?.id, threadId, pageContext, isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    streamingContent,
    streamingToolCalls,
    streamingToolResults,
  };
}
