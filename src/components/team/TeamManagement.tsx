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
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Settings, 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Crown,
  User,
  Eye,
  Download,
  Upload,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { useSecurityContext } from '@/hooks/useSecurityContext';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  companies: CompanyAccess[];
  permissions: Permission[];
  lastActive: string;
  joinedAt: string;
  invitedBy?: string;
  avatar?: string;
}

interface CompanyAccess {
  companyId: string;
  companyName: string;
  role: 'admin' | 'member' | 'viewer';
  permissions: string[];
  inherited: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'analytics' | 'team' | 'automation' | 'settings';
  granted: boolean;
  inherited: boolean;
}

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  usageCount: number;
}

interface TeamManagementProps {
  mediaCompanyId: string;
}

export function TeamManagement({ mediaCompanyId }: TeamManagementProps) {
  const { securityContext } = useSecurityContext();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [portfolioCompanies, setPortfolioCompanies] = useState<any[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('members');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        // Mock team members
        const mockMembers: TeamMember[] = [
          {
            id: '1',
            email: 'admin@company.com',
            name: 'Alex Johnson',
            role: 'admin',
            status: 'active',
            companies: [
              {
                companyId: '1',
                companyName: 'Holly Springs Update',
                role: 'admin',
                permissions: ['content.create', 'content.edit', 'content.delete', 'analytics.view', 'team.manage'],
                inherited: false
              },
              {
                companyId: '2',
                companyName: 'Wake County News',
                role: 'admin',
                permissions: ['content.create', 'content.edit', 'content.delete', 'analytics.view', 'team.manage'],
                inherited: true
              }
            ],
            permissions: [
              { id: '1', name: 'Content Management', description: 'Create, edit, and delete content', category: 'content', granted: true, inherited: false },
              { id: '2', name: 'Analytics Access', description: 'View portfolio analytics', category: 'analytics', granted: true, inherited: false },
              { id: '3', name: 'Team Management', description: 'Manage team members and permissions', category: 'team', granted: true, inherited: false },
              { id: '4', name: 'Automation Control', description: 'Create and manage automation rules', category: 'automation', granted: true, inherited: false }
            ],
            lastActive: '2 hours ago',
            joinedAt: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            email: 'editor@company.com',
            name: 'Sarah Chen',
            role: 'editor',
            status: 'active',
            companies: [
              {
                companyId: '1',
                companyName: 'Holly Springs Update',
                role: 'member',
                permissions: ['content.create', 'content.edit', 'analytics.view'],
                inherited: false
              }
            ],
            permissions: [
              { id: '1', name: 'Content Management', description: 'Create, edit, and delete content', category: 'content', granted: true, inherited: false },
              { id: '2', name: 'Analytics Access', description: 'View portfolio analytics', category: 'analytics', granted: true, inherited: false }
            ],
            lastActive: '1 hour ago',
            joinedAt: '2024-02-01T14:20:00Z'
          },
          {
            id: '3',
            email: 'viewer@company.com',
            name: 'Mike Davis',
            role: 'viewer',
            status: 'pending',
            companies: [
              {
                companyId: '3',
                companyName: 'Triangle Business Daily',
                role: 'viewer',
                permissions: ['analytics.view'],
                inherited: false
              }
            ],
            permissions: [
              { id: '2', name: 'Analytics Access', description: 'View portfolio analytics', category: 'analytics', granted: true, inherited: false }
            ],
            lastActive: 'Never',
            joinedAt: '2024-02-28T09:15:00Z',
            invitedBy: 'Alex Johnson'
          }
        ];
        setTeamMembers(mockMembers);

        // Mock portfolio companies
        const mockCompanies = [
          { id: '1', name: 'Holly Springs Update', platforms: ['twitter', 'facebook', 'linkedin'] },
          { id: '2', name: 'Wake County News', platforms: ['twitter', 'facebook', 'instagram'] },
          { id: '3', name: 'Triangle Business Daily', platforms: ['twitter', 'facebook', 'linkedin', 'instagram'] }
        ];
        setPortfolioCompanies(mockCompanies);

        // Mock role templates
        const mockTemplates: RoleTemplate[] = [
          {
            id: '1',
            name: 'Portfolio Admin',
            description: 'Full access to all portfolio companies and features',
            permissions: ['content.create', 'content.edit', 'content.delete', 'analytics.view', 'team.manage', 'automation.control'],
            isDefault: false,
            usageCount: 3
          },
          {
            id: '2',
            name: 'Content Manager',
            description: 'Manage content across assigned companies',
            permissions: ['content.create', 'content.edit', 'content.delete', 'analytics.view'],
            isDefault: true,
            usageCount: 8
          },
          {
            id: '3',
            name: 'Content Editor',
            description: 'Create and edit content for assigned companies',
            permissions: ['content.create', 'content.edit', 'analytics.view'],
            isDefault: false,
            usageCount: 12
          },
          {
            id: '4',
            name: 'Analytics Viewer',
            description: 'View-only access to portfolio analytics',
            permissions: ['analytics.view'],
            isDefault: false,
            usageCount: 5
          }
        ];
        setRoleTemplates(mockTemplates);
      } catch (error) {
        console.error('Failed to load team data:', error);
      }
    };

    if (mediaCompanyId) {
      loadTeamData();
    }
  }, [mediaCompanyId]);

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleInviteMember = async (inviteData: any) => {
    try {
      // Mock invite - replace with actual API call
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: inviteData.email,
        name: inviteData.name || inviteData.email.split('@')[0],
        role: inviteData.role || 'viewer',
        status: 'pending',
        companies: inviteData.companies || [],
        permissions: inviteData.permissions || [],
        lastActive: 'Never',
        joinedAt: new Date().toISOString(),
        invitedBy: 'Current User'
      };

      setTeamMembers(prev => [...prev, newMember]);
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleBulkInvite = async (emails: string[], template: RoleTemplate) => {
    try {
      // Mock bulk invite - replace with actual API call
      const newMembers = emails.map(email => ({
        id: Date.now().toString() + Math.random(),
        email,
        name: email.split('@')[0],
        role: (template.name.toLowerCase().includes('admin') ? 'admin' : 
              template.name.toLowerCase().includes('editor') ? 'editor' : 'viewer') as 'admin' | 'manager' | 'editor' | 'viewer',
        status: 'pending' as const,
        companies: portfolioCompanies.map(company => ({
          companyId: company.id,
          companyName: company.name,
          role: 'member' as const,
          permissions: template.permissions,
          inherited: false
        })),
        permissions: template.permissions.map((perm, index) => ({
          id: (index + 1).toString(),
          name: perm,
          description: `Permission for ${perm}`,
          category: 'content' as const,
          granted: true,
          inherited: false
        })),
        lastActive: 'Never',
        joinedAt: new Date().toISOString(),
        invitedBy: 'Current User'
      }));

      setTeamMembers(prev => [...prev, ...newMembers]);
      setShowBulkInvite(false);
    } catch (error) {
      console.error('Failed to bulk invite:', error);
    }
  };

  const handleUpdateMember = async (memberId: string, updates: Partial<TeamMember>) => {
    try {
      setTeamMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, ...updates, updated_at: new Date().toISOString() }
          : member
      ));
    } catch (error) {
      console.error('Failed to update member:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      if (selectedMember?.id === memberId) {
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleResendInvite = async (memberId: string) => {
    try {
      // Mock resend - replace with actual API call
      console.log(`Resending invite to member ${memberId}`);
    } catch (error) {
      console.error('Failed to resend invite:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and permissions across your portfolio</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowBulkInvite(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Invite
          </Button>
          <Button onClick={() => setShowInviteForm(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Across portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Templates</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleTemplates.length}</div>
            <p className="text-xs text-muted-foreground">Available templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="templates">Role Templates</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription className="text-sm">{member.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMember(member)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(member.role)}
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      <Badge className={getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div>Companies: {member.companies.length}</div>
                      <div>Last active: {member.lastActive}</div>
                      <div>Joined: {new Date(member.joinedAt).toLocaleDateString()}</div>
                    </div>

                    {member.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleResendInvite(member.id)}
                        className="w-full"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Invite
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roleTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    {template.isDefault && (
                      <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.permissions.map(perm => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Used {template.usageCount} times</span>
                      <Button variant="outline" size="sm">
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Categories</CardTitle>
              <CardDescription>Manage permissions across your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Content Permissions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Content Creation</div>
                        <div className="text-sm text-gray-600">Create new content</div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Content Editing</div>
                        <div className="text-sm text-gray-600">Edit existing content</div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Content Deletion</div>
                        <div className="text-sm text-gray-600">Delete content</div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Management Permissions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Team Management</div>
                        <div className="text-sm text-gray-600">Manage team members</div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Analytics Access</div>
                        <div className="text-sm text-gray-600">View analytics</div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Automation Control</div>
                        <div className="text-sm text-gray-600">Manage automation rules</div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Recent team member activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium">Alex Johnson invited Sarah Chen</div>
                    <div className="text-sm text-gray-600">2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Settings className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium">Mike Davis accepted invitation</div>
                    <div className="text-sm text-gray-600">4 hours ago</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <div className="flex-1">
                    <div className="font-medium">Role template "Content Manager" updated</div>
                    <div className="text-sm text-gray-600">1 day ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>Send an invitation to join your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address..."
                />
              </div>
              <div>
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Companies</Label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {portfolioCompanies.map(company => (
                    <div key={company.id} className="flex items-center space-x-2">
                      <Checkbox id={company.id} defaultChecked />
                      <Label htmlFor={company.id} className="text-sm">
                        {company.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleInviteMember({})}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Bulk Invite Team Members</CardTitle>
              <CardDescription>Invite multiple team members at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="Enter email addresses, one per line..."
                  className="min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="template">Role Template</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role template" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowBulkInvite(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleBulkInvite([], roleTemplates[0])}>
                  <Upload className="h-4 w-4 mr-2" />
                  Send Invites
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
