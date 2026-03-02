import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageCircle, 
  Settings, 
  Zap, 
  TrendingUp, 
  FileText, 
  BarChart3, 
  Users, 
  Bot, 
  Key, 
  Shield, 
  Globe, 
  Clock, 
  Activity,
  Sparkles,
  Target,
  Lightbulb,
  Share2,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ClaudeAssistant } from '@/components/claude/ClaudeAssistant';
import { useClaudeIntegration } from '@/integrations/claude/ClaudeChatIntegration';

export default function ClaudeWorkspace() {
  const {
    claude,
    isConnected,
    conversations,
    activeConversation,
    generateContent,
    analyzeData
  } = useClaudeIntegration({
    enableCoworkerMode: true,
    enableContextSharing: true,
    customInstructions: "You are a specialized Social Suite AI assistant focused on social media management, content creation, and analytics."
  });

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-3-5-sonnet');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveConfig = async () => {
    if (!claude) return;
    
    try {
      await claude.setConfig({
        apiKey,
        model: model as any,
        temperature,
        maxTokens
      });
      setShowApiKey(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleGenerateSample = async (type: string) => {
    if (!claude) return;

    try {
      const result = await generateContent(type as any, {
        platforms: ['twitter', 'facebook', 'linkedin'],
        tone: 'professional',
        topic: 'industry trends',
        length: 'medium'
      });
      console.log('Generated content:', result);
    } catch (error) {
      console.error('Failed to generate content:', error);
    }
  };

  const handleAnalyzeSample = async () => {
    if (!claude) return;

    try {
      const result = await analyzeData({
        timeframe: '30d',
        metrics: {
          engagement: 1250,
          reach: 15420,
          conversions: 89,
          impressions: 45600
        },
        platforms: ['twitter', 'facebook', 'linkedin']
      }, 'performance');
      console.log('Analysis result:', result);
    } catch (error) {
      console.error('Failed to analyze data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-500" />
              Claude Integration Workspace
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Advanced AI-powered social media management assistant
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
              {isConnected ? 'Connected' : 'Offline'}
            </Badge>
            <Button onClick={() => setShowApiKey(!showApiKey)}>
              <Key className="w-4 h-4 mr-2" />
              Configure API
            </Button>
          </div>
        </div>

        {/* API Configuration */}
        {showApiKey && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                Claude API Configuration
              </CardTitle>
              <CardDescription>
                Configure your Claude API settings to enable AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet (Recommended)</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku (Fast)</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus (Most Capable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature: {temperature}</Label>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
                  <input
                    id="max-tokens"
                    type="range"
                    min="1000"
                    max="8000"
                    step="1000"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="custom-instructions">Custom Instructions</Label>
                <Textarea
                  id="custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Additional instructions for Claude..."
                  className="min-h-20"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowApiKey(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common AI-powered tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleGenerateSample('post')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Social Post
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleGenerateSample('campaign')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAnalyzeSample()}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analyze Performance
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleGenerateSample('strategy')}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Strategy Recommendations
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  Integration Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Connection</span>
                  <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Coworker Mode</span>
                  <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Context Sharing</span>
                  <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Conversations</span>
                  <span className="text-sm font-medium">{conversations.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Main Chat */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  Claude Assistant
                </CardTitle>
                <CardDescription>
                  AI-powered social media management assistant
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[500px]">
                <ClaudeAssistant
                  context={{
                    currentPage: 'claude-workspace',
                    elementData: {
                      workspace: 'claude-integration',
                      features: ['content-generation', 'analytics', 'team-management']
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Content Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                AI-powered content creation for all social platforms
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Multi-platform support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Tone customization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Hashtag optimization</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Analytics AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Intelligent analysis of social media performance
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Trend identification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Performance insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Recommendations</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-500" />
                Team Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Real-time collaboration with Claude Coworker
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Shared context</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Live collaboration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Version control</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="w-5 h-5 text-orange-500" />
                Enterprise Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Secure API integration with data protection
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>API key encryption</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Context isolation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Audit logging</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Monitor your Claude API usage and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {conversations.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Conversations
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {activeConversation?.messages.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Messages in Current
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  ∞
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Available Tokens
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  99.9%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Uptime
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
