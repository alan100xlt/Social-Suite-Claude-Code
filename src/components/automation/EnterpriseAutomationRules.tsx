import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Clock, 
  Calendar, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Play, 
  Pause, 
  AlertCircle,
  CheckCircle,
  Users,
  Target,
  Zap,
  Filter,
  Save,
  X
} from 'lucide-react';
import { useSecurityContext } from '@/hooks/useSecurityContext';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'content' | 'engagement' | 'manual';
    conditions: Record<string, any>;
    schedule?: string;
  };
  actions: {
    type: 'publish' | 'schedule' | 'notify' | 'analyze';
    parameters: Record<string, any>;
  };
  targetCompanies: string[];
  companyExceptions: string[];
  status: 'active' | 'paused' | 'disabled';
  priority: 'low' | 'medium' | 'high';
  performance: {
    executions: number;
    successRate: number;
    avgProcessingTime: number;
    lastExecuted: string;
  };
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  platforms: string[];
  role: 'admin' | 'member' | 'viewer';
}

interface EnterpriseAutomationRulesProps {
  mediaCompanyId: string;
}

export function EnterpriseAutomationRules({ mediaCompanyId }: EnterpriseAutomationRulesProps) {
  const { securityContext } = useSecurityContext();
  
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [portfolioCompanies, setPortfolioCompanies] = useState<Company[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock automation rules - replace with actual API calls
  useEffect(() => {
    const loadAutomationRules = async () => {
      try {
        // Mock data - replace with actual API call
        const mockRules: AutomationRule[] = [
          {
            id: '1',
            name: 'Optimal Time Publishing',
            description: 'Automatically publish content at optimal engagement times for each platform',
            trigger: {
              type: 'schedule',
              conditions: { time: 'optimal' },
              schedule: '0 14 * * *' // Daily at 2 PM
            },
            actions: {
              type: 'publish',
              parameters: { 
                platforms: ['twitter', 'facebook', 'linkedin'],
                optimization: 'engagement'
              }
            },
            targetCompanies: ['1', '2', '3'],
            companyExceptions: [],
            status: 'active',
            priority: 'high',
            performance: {
              executions: 156,
              successRate: 98.7,
              avgProcessingTime: 2.3,
              lastExecuted: '2024-03-01T14:00:00Z'
            },
            created_at: '2024-02-15T10:30:00Z',
            updated_at: '2024-02-28T16:45:00Z'
          },
          {
            id: '2',
            name: 'Content Repurposing',
            description: 'Automatically repurpose high-performing content for other platforms',
            trigger: {
              type: 'engagement',
              conditions: { 
                metric: 'engagement_rate',
                threshold: 5.0,
                timeWindow: '24h'
              }
            },
            actions: {
              type: 'publish',
              parameters: {
                repurpose: true,
                platforms: ['instagram', 'tiktok'],
                delay: '2h'
              }
            },
            targetCompanies: ['1', '3'],
            companyExceptions: ['2'],
            status: 'active',
            priority: 'medium',
            performance: {
              executions: 89,
              successRate: 94.6,
              avgProcessingTime: 3.1,
              lastExecuted: '2024-03-01T09:30:00Z'
            },
            created_at: '2024-02-20T14:20:00Z',
            updated_at: '2024-02-25T11:15:00Z'
          },
          {
            id: '3',
            name: 'Weekly Analytics Report',
            description: 'Generate and email weekly performance analytics',
            trigger: {
              type: 'schedule',
              conditions: {},
              schedule: '0 9 * * 1' // Monday at 9 AM
            },
            actions: {
              type: 'notify',
              parameters: {
                type: 'email',
                recipients: ['admin@company.com'],
                template: 'weekly_analytics'
              }
            },
            targetCompanies: ['1', '2', '3'],
            companyExceptions: [],
            status: 'active',
            priority: 'low',
            performance: {
              executions: 12,
              successRate: 100,
              avgProcessingTime: 45.2,
              lastExecuted: '2024-02-26T09:00:00Z'
            },
            created_at: '2024-02-10T08:45:00Z',
            updated_at: '2024-02-22T13:30:00Z'
          }
        ];
        setRules(mockRules);
      } catch (error) {
        console.error('Failed to load automation rules:', error);
      }
    };

    const loadPortfolioCompanies = async () => {
      try {
        // Mock data - replace with actual API call
        const mockCompanies: Company[] = [
          {
            id: '1',
            name: 'Holly Springs Update',
            platforms: ['twitter', 'facebook', 'linkedin'],
            role: 'admin'
          },
          {
            id: '2',
            name: 'Wake County News',
            platforms: ['twitter', 'facebook', 'instagram'],
            role: 'admin'
          },
          {
            id: '3',
            name: 'Triangle Business Daily',
            platforms: ['twitter', 'facebook', 'linkedin', 'instagram'],
            role: 'member'
          }
        ];
        setPortfolioCompanies(mockCompanies);
      } catch (error) {
        console.error('Failed to load portfolio companies:', error);
      }
    };

    if (mediaCompanyId) {
      loadAutomationRules();
      loadPortfolioCompanies();
    }
  }, [mediaCompanyId]);

  // Filter rules based on status and search
  const filteredRules = rules.filter(rule => {
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateRule = () => {
    setIsCreating(true);
    setShowCreateForm(true);
  };

  const handleSaveRule = async (ruleData: Partial<AutomationRule>) => {
    try {
      // Mock save - replace with actual API call
      const newRule: AutomationRule = {
        id: Date.now().toString(),
        name: ruleData.name || 'New Automation Rule',
        description: ruleData.description || '',
        trigger: ruleData.trigger || {
          type: 'manual',
          conditions: {}
        },
        actions: ruleData.actions || {
          type: 'publish',
          parameters: {}
        },
        targetCompanies: ruleData.targetCompanies || [],
        companyExceptions: ruleData.companyExceptions || [],
        status: 'active',
        priority: 'medium',
        performance: {
          executions: 0,
          successRate: 0,
          avgProcessingTime: 0,
          lastExecuted: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setRules(prev => [...prev, newRule]);
      setShowCreateForm(false);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
      setIsCreating(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, status: rule.status === 'active' ? 'paused' : 'active' }
          : rule
      ));
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      if (selectedRule?.id === ruleId) {
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      const duplicatedRule: AutomationRule = {
        ...rule,
        id: Date.now().toString(),
        name: `${rule.name} (Copy)`,
        status: 'paused',
        performance: {
          executions: 0,
          successRate: 0,
          avgProcessingTime: 0,
          lastExecuted: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setRules(prev => [...prev, duplicatedRule]);
    } catch (error) {
      console.error('Failed to duplicate rule:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'schedule': return <Clock className="h-4 w-4" />;
      case 'content': return <Bot className="h-4 w-4" />;
      case 'engagement': return <Target className="h-4 w-4" />;
      case 'manual': return <Play className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'publish': return <Bot className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      case 'notify': return <AlertCircle className="h-4 w-4" />;
      case 'analyze': return <Target className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Automation Rules</h1>
          <p className="text-gray-600 mt-1">Portfolio-level automation with company-specific exceptions</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreateRule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Create Rule Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Automation Rule</CardTitle>
            <CardDescription>Define automation logic for your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    placeholder="Enter rule name..."
                  />
                </div>
                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    placeholder="Describe what this rule does..."
                    className="min-h-20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger-type">Trigger Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="content">Content Event</SelectItem>
                      <SelectItem value="engagement">Engagement Threshold</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action-type">Action Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish">Publish Content</SelectItem>
                      <SelectItem value="schedule">Schedule Content</SelectItem>
                      <SelectItem value="notify">Send Notification</SelectItem>
                      <SelectItem value="analyze">Analyze Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Target Companies</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {portfolioCompanies.map(company => (
                    <div key={company.id} className="flex items-center space-x-2">
                      <Checkbox id={company.id} />
                      <Label htmlFor={company.id} className="text-sm">
                        {company.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleSaveRule({})}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search automation rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rules</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRules.map(rule => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge className={getStatusColor(rule.status)}>
                      {rule.status}
                    </Badge>
                    <Badge className={getPriorityColor(rule.priority)}>
                      {rule.priority}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">{rule.description}</CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicateRule(rule)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRule(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleRule(rule.id)}>
                    {rule.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="trigger">Trigger</TabsTrigger>
                  <TabsTrigger value="action">Action</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{rule.performance.executions}</div>
                      <div className="text-sm text-gray-600">Executions</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{rule.performance.successRate}%</div>
                      <div className="text-sm text-green-700">Success Rate</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last executed: {new Date(rule.performance.lastExecuted).toLocaleString()}
                  </div>
                </TabsContent>
                
                <TabsContent value="trigger" className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getTriggerIcon(rule.trigger.type)}
                    <div>
                      <div className="font-medium capitalize">{rule.trigger.type}</div>
                      <div className="text-sm text-gray-600">
                        {rule.trigger.schedule && `Schedule: ${rule.trigger.schedule}`}
                      </div>
                    </div>
                  </div>
                  {rule.targetCompanies.length > 0 && (
                    <div>
                      <Label>Target Companies</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.targetCompanies.map(companyId => {
                          const company = portfolioCompanies.find(c => c.id === companyId);
                          return company ? (
                            <Badge key={companyId} variant="outline" className="text-xs">
                              {company.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="action" className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    {getActionIcon(rule.actions.type)}
                    <div>
                      <div className="font-medium capitalize">{rule.actions.type}</div>
                      <div className="text-sm text-gray-600">
                        Automated action execution
                      </div>
                    </div>
                  </div>
                  {rule.companyExceptions.length > 0 && (
                    <div>
                      <Label>Company Exceptions</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.companyExceptions.map(companyId => {
                          const company = portfolioCompanies.find(c => c.id === companyId);
                          return company ? (
                            <Badge key={companyId} variant="destructive" className="text-xs">
                              {company.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRules.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Automation Rules</h3>
          <p className="text-gray-600">Create your first automation rule to streamline portfolio management</p>
          <Button onClick={handleCreateRule} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Rule
          </Button>
        </div>
      )}
    </div>
  );
}
