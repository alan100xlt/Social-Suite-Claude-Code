import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Send, 
  Settings, 
  Bot, 
  User, 
  Clock, 
  Zap, 
  TrendingUp, 
  FileText, 
  BarChart3, 
  Users, 
  HelpCircle, 
  Sparkles, 
  Brain, 
  Share2, 
  Lightbulb, 
  Target, 
  Activity,
  ChevronDown,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useClaudeIntegration } from '@/integrations/claude/ClaudeChatIntegration';
import { ClaudeMessage } from '@/integrations/claude/ClaudeChatIntegration';

interface ClaudeAssistantProps {
  context?: {
    currentPage?: string;
    mediaCompanyId?: string;
    companyId?: string;
    contentType?: string;
    elementData?: any;
  };
  className?: string;
}

export function ClaudeAssistant({ context, className }: ClaudeAssistantProps) {
  const {
    claude,
    isConnected,
    conversations,
    activeConversation,
    sendMessage,
    getContextualHelp,
    generateContent,
    analyzeData
  } = useClaudeIntegration({
    enableCoworkerMode: true,
    enableContextSharing: true,
    enableRealTimeCollaboration: true,
    customInstructions: "You are a specialized assistant for Social Suite, helping users manage their social media presence effectively."
  });

  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quickActions, setQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !claude) return;

    setIsTyping(true);
    try {
      await sendMessage(message, context);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!claude) return;

    setIsTyping(true);
    try {
      switch (action) {
        case 'content-help':
          await getContextualHelp(context?.currentPage || 'dashboard', context?.elementData);
          break;
        case 'generate-post':
          await generateContent('post', {
            platforms: ['twitter', 'facebook', 'linkedin'],
            tone: 'professional',
            topic: 'industry news'
          });
          break;
        case 'analyze-performance':
          await analyzeData({
            timeframe: '30d',
            metrics: ['engagement', 'reach', 'conversions']
          }, 'performance');
          break;
        case 'team-strategy':
          await generateContent('strategy', {
            focus: 'team-management',
            companySize: 'medium'
          });
          break;
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (msg: ClaudeMessage) => (
    <div
      key={msg.id}
      className={`flex items-start space-x-3 mb-4 ${
        msg.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {msg.role === 'assistant' && (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          msg.role === 'user'
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
        <div className="text-xs opacity-70 mt-1">
          {formatTimestamp(msg.timestamp)}
          {msg.metadata?.usage && (
            <span className="ml-2">
              {msg.metadata.usage.input_tokens + msg.metadata.usage.output_tokens} tokens
            </span>
          )}
        </div>
      </div>

      {msg.role === 'user' && (
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Claude Assistant
          <div className="ml-2 w-2 h-2 bg-green-400 rounded-full"></div>
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-900 border rounded-lg shadow-2xl flex flex-col z-50 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <div>
            <div className="font-medium">Claude Assistant</div>
            <div className="text-xs opacity-90">
              {isConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:bg-white/20"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="text-white hover:bg-white/20"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quick Actions</label>
              <Switch
                checked={quickActions}
                onCheckedChange={setQuickActions}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Context Sharing</label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Coworker Mode</label>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {quickActions && (
        <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('content-help')}
              className="text-xs h-8"
            >
              <HelpCircle className="w-3 h-3 mr-1" />
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('generate-post')}
              className="text-xs h-8"
            >
              <FileText className="w-3 h-3 mr-1" />
              Generate Post
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('analyze-performance')}
              className="text-xs h-8"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Analyze
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('team-strategy')}
              className="text-xs h-8"
            >
              <Users className="w-3 h-3 mr-1" />
              Strategy
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeConversation?.messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="font-medium mb-2">Welcome to Claude Assistant</div>
            <div className="text-sm">
              I'm here to help you manage your social media presence.
              Ask me anything about content, analytics, or team management!
            </div>
          </div>
        ) : (
          activeConversation?.messages.map(renderMessage)
        )}
        
        {isTyping && (
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Badge */}
      {context && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t">
          <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
            <Target className="w-3 h-3" />
            <span>Context: {context.currentPage || 'General'}</span>
            {context.mediaCompanyId && (
              <Badge variant="secondary" className="text-xs">
                Media Company
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Claude anything..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isTyping}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Powered by Claude 3.5 Sonnet • Context-aware assistance
        </div>
      </div>
    </div>
  );
}

// Floating Action Button for Claude
export function ClaudeFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg rounded-full w-14 h-14 p-0 z-40"
    >
      <MessageCircle className="w-6 h-6" />
      <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
    </Button>
  );
}

// Contextual Help Component
export function ClaudeContextualHelp({ 
  currentPage, 
  elementData, 
  children 
}: { 
  currentPage: string; 
  elementData?: any; 
  children: React.ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const { getContextualHelp } = useClaudeIntegration();
  const [helpContent, setHelpContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetHelp = async () => {
    setIsLoading(true);
    try {
      const content = await getContextualHelp(currentPage, elementData);
      setHelpContent(content);
      setShowHelp(true);
    } catch (error) {
      console.error('Failed to get contextual help:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        {children}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGetHelp}
          className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity"
          disabled={isLoading}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      {showHelp && (
        <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-h-[80vh] overflow-y-auto z-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Contextual Help</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              Help for {currentPage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert">
                {helpContent}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
