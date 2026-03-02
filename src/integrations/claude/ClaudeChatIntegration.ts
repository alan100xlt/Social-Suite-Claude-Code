import { useState, useEffect, useCallback } from 'react';

// Claude API Types
export interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface ClaudeConversation {
  id: string;
  title: string;
  messages: ClaudeMessage[];
  createdAt: number;
  updatedAt: number;
  context?: {
    mediaCompanyId?: string;
    companyId?: string;
    contentType?: string;
    taskId?: string;
  };
}

export interface ClaudeAPIConfig {
  apiKey: string;
  model: 'claude-3-5-sonnet' | 'claude-3-haiku' | 'claude-3-opus';
  maxTokens: number;
  temperature: number;
}

export interface ClaudeIntegrationOptions {
  enableCoworkerMode?: boolean;
  enableContextSharing?: boolean;
  enableRealTimeCollaboration?: boolean;
  customInstructions?: string;
}

export class ClaudeChatIntegration {
  private config: ClaudeAPIConfig | null = null;
  private conversations: Map<string, ClaudeConversation> = new Map();
  private activeConversationId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private wsConnection: WebSocket | null = null;

  constructor(private options: ClaudeIntegrationOptions = {}) {
    this.loadConfig();
    this.loadConversations();
  }

  // Configuration Management
  async setConfig(config: Partial<ClaudeAPIConfig>): Promise<void> {
    const newConfig = { ...this.getDefaultConfig(), ...config };
    this.config = newConfig;
    await this.saveConfig();
    this.emit('config-updated', newConfig);
  }

  private getDefaultConfig(): ClaudeAPIConfig {
    return {
      apiKey: localStorage.getItem('claude-api-key') || '',
      model: 'claude-3-5-sonnet',
      maxTokens: 4096,
      temperature: 0.7
    };
  }

  private async saveConfig(): Promise<void> {
    if (this.config) {
      localStorage.setItem('claude-config', JSON.stringify(this.config));
      if (this.config.apiKey) {
        localStorage.setItem('claude-api-key', this.config.apiKey);
      }
    }
  }

  private loadConfig(): void {
    const saved = localStorage.getItem('claude-config');
    if (saved) {
      this.config = JSON.parse(saved);
    } else {
      this.config = this.getDefaultConfig();
    }
  }

  // Conversation Management
  async createConversation(title?: string, context?: ClaudeConversation['context']): Promise<string> {
    const conversationId = crypto.randomUUID();
    const conversation: ClaudeConversation = {
      id: conversationId,
      title: title || 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context
    };

    this.conversations.set(conversationId, conversation);
    this.activeConversationId = conversationId;
    await this.saveConversations();
    this.emit('conversation-created', conversation);
    return conversationId;
  }

  async sendMessage(content: string, context?: any): Promise<ClaudeMessage> {
    if (!this.config?.apiKey) {
      throw new Error('Claude API key not configured');
    }

    if (!this.activeConversationId) {
      await this.createConversation();
    }

    const userMessage: ClaudeMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // Add user message to conversation
    const conversation = this.conversations.get(this.activeConversationId!);
    if (conversation) {
      conversation.messages.push(userMessage);
      conversation.updatedAt = Date.now();
      this.emit('message-added', userMessage);
    }

    try {
      // Prepare system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Get conversation history
      const messages = conversation?.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })) || [];

      // Call Claude API
      const response = await this.callClaudeAPI(messages, systemPrompt);
      
      const assistantMessage: ClaudeMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          model: this.config.model,
          usage: response.usage
        }
      };

      // Add assistant message to conversation
      if (conversation) {
        conversation.messages.push(assistantMessage);
        conversation.updatedAt = Date.now();
        await this.saveConversations();
        this.emit('message-added', assistantMessage);
      }

      return assistantMessage;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private buildSystemPrompt(context?: any): string {
    let systemPrompt = `You are Claude, an AI assistant integrated with the Social Suite media management platform. 

Current Context:
- Platform: Social Suite Enterprise
- User Role: Media Company Administrator
- Available Features: Content creation, analytics, team management, automation

Your capabilities include:
- Helping with content strategy and creation
- Analyzing social media performance
- Assisting with team management
- Providing automation recommendations
- Answering questions about social media marketing

Be helpful, professional, and provide actionable insights. When relevant, suggest specific actions within the Social Suite platform.`;

    if (context) {
      systemPrompt += `\n\nCurrent Session Context:\n${JSON.stringify(context, null, 2)}`;
    }

    if (this.options.customInstructions) {
      systemPrompt += `\n\nCustom Instructions:\n${this.options.customInstructions}`;
    }

    return systemPrompt;
  }

  private async callClaudeAPI(messages: any[], systemPrompt: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config!.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config!.model,
        max_tokens: this.config!.maxTokens,
        temperature: this.config!.temperature,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  // Coworker Mode Integration
  async enableCoworkerMode(): Promise<void> {
    if (!this.options.enableCoworkerMode) {
      throw new Error('Coworker mode not enabled in options');
    }

    // Initialize WebSocket for real-time collaboration
    this.wsConnection = new WebSocket('wss://api.anthropic.com/v1/coworker');
    
    this.wsConnection.onopen = () => {
      this.emit('coworker-connected');
    };

    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit('coworker-message', data);
    };

    this.wsConnection.onerror = (error) => {
      this.emit('coworker-error', error);
    };
  }

  async shareContextWithCoworker(context: any): Promise<void> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('Coworker connection not established');
    }

    this.wsConnection.send(JSON.stringify({
      type: 'context-share',
      data: context,
      timestamp: Date.now()
    }));
  }

  // Context-Aware Assistance
  async getContextualHelp(currentPage: string, elementData?: any): Promise<string> {
    const contextPrompt = `I need help with the "${currentPage}" page in the Social Suite platform.

Current element/context data:
${JSON.stringify(elementData, null, 2)}

Please provide specific guidance for this page, including:
1. Best practices for using this feature
2. Common workflows and tips
3. Related features that might be helpful
4. Any recommendations based on current data`;

    const response = await this.sendMessage(contextPrompt);
    return response.content;
  }

  // Content Generation Integration
  async generateContent(
    type: 'post' | 'campaign' | 'strategy' | 'analysis',
    parameters: any
  ): Promise<string> {
    const contentPrompt = `Generate ${type} content with the following parameters:

${JSON.stringify(parameters, null, 2)}

Requirements:
- Follow social media best practices
- Be engaging and professional
- Include relevant hashtags if applicable
- Consider the target audience
- Provide multiple options if appropriate`;

    const response = await this.sendMessage(contentPrompt);
    return response.content;
  }

  // Analytics Integration
  async analyzeData(data: any, analysisType: 'performance' | 'trends' | 'recommendations'): Promise<string> {
    const analysisPrompt = `Analyze the following social media data for ${analysisType}:

${JSON.stringify(data, null, 2)}

Please provide:
1. Key insights and patterns
2. Performance highlights
3. Actionable recommendations
4. Areas for improvement
5. Next steps to consider`;

    const response = await this.sendMessage(analysisPrompt);
    return response.content;
  }

  // Event Management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Storage Management
  private async saveConversations(): Promise<void> {
    const conversationsArray = Array.from(this.conversations.entries());
    localStorage.setItem('claude-conversations', JSON.stringify(conversationsArray));
  }

  private loadConversations(): void {
    const saved = localStorage.getItem('claude-conversations');
    if (saved) {
      const conversationsArray = JSON.parse(saved);
      this.conversations = new Map(conversationsArray);
    }
  }

  // Public Getters
  getConversations(): ClaudeConversation[] {
    return Array.from(this.conversations.values());
  }

  getActiveConversation(): ClaudeConversation | null {
    return this.activeConversationId ? this.conversations.get(this.activeConversationId) : null;
  }

  getConfig(): ClaudeAPIConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }

  // Cleanup
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

// React Hook for Claude Integration
export function useClaudeIntegration(options?: ClaudeIntegrationOptions) {
  const [claude, setClaude] = useState<ClaudeChatIntegration | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ClaudeConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ClaudeConversation | null>(null);

  useEffect(() => {
    const integration = new ClaudeChatIntegration(options);
    setClaude(integration);

    // Set up event listeners
    integration.on('conversation-created', (conv: ClaudeConversation) => {
      setConversations(prev => [...prev, conv]);
    });

    integration.on('message-added', () => {
      setConversations(integration.getConversations());
      setActiveConversation(integration.getActiveConversation());
    });

    integration.on('coworker-connected', () => {
      setIsConnected(true);
    });

    integration.on('coworker-error', () => {
      setIsConnected(false);
    });

    // Load initial data
    setConversations(integration.getConversations());
    setActiveConversation(integration.getActiveConversation());

    return () => {
      integration.disconnect();
    };
  }, [options]);

  const sendMessage = useCallback(async (content: string, context?: any) => {
    if (!claude) return null;
    return await claude.sendMessage(content, context);
  }, [claude]);

  const getContextualHelp = useCallback(async (currentPage: string, elementData?: any) => {
    if (!claude) return null;
    return await claude.getContextualHelp(currentPage, elementData);
  }, [claude]);

  const generateContent = useCallback(async (type: any, parameters: any) => {
    if (!claude) return null;
    return await claude.generateContent(type, parameters);
  }, [claude]);

  const analyzeData = useCallback(async (data: any, analysisType: any) => {
    if (!claude) return null;
    return await claude.analyzeData(data, analysisType);
  }, [claude]);

  return {
    claude,
    isConnected,
    conversations,
    activeConversation,
    sendMessage,
    getContextualHelp,
    generateContent,
    analyzeData
  };
}

export default ClaudeChatIntegration;
