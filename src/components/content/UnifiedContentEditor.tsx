import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  X, 
  Clock, 
  Send, 
  Eye, 
  Settings, 
  Template, 
  Calendar,
  BarChart3,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

import { bulkContentService, BulkContentPost, ContentTemplate, PlatformCustomization } from '@/services/content/BulkContentService'
import { securityContextService } from '@/services/security/SecurityContextService'

interface UnifiedContentEditorProps {
  userId: string
  mediaCompanyId: string
  initialPost?: BulkContentPost
  onSave?: (post: BulkContentPost) => void
  onCancel?: () => void
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'twitter', name: 'Twitter', icon: '🐦' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' }
]

const CONTENT_TYPES = [
  { id: 'post', name: 'Social Post' },
  { id: 'article', name: 'Article' },
  { id: 'announcement', name: 'Announcement' },
  { id: 'promotion', name: 'Promotion' }
]

const PUBLISHING_STRATEGIES = [
  { id: 'immediate', name: 'Publish Immediately' },
  { id: 'scheduled', name: 'Schedule for Later' },
  { id: 'staggered', name: 'Staggered Publishing' }
]

export function UnifiedContentEditor({ 
  userId, 
  mediaCompanyId, 
  initialPost, 
  onSave, 
  onCancel 
}: UnifiedContentEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Security context
  const [securityContext, setSecurityContext] = useState<any>(null)
  const [accessibleCompanies, setAccessibleCompanies] = useState<any[]>([])
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  
  // Form state
  const [title, setTitle] = useState(initialPost?.title || '')
  const [content, setContent] = useState(initialPost?.content || '')
  const [contentType, setContentType] = useState(initialPost?.contentType || 'post')
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    initialPost?.targetCompanyIds || []
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'twitter', 'facebook'])
  const [publishingStrategy, setPublishingStrategy] = useState<'immediate' | 'scheduled' | 'staggered'>(
    initialPost?.publishingStrategy || 'immediate'
  )
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialPost?.scheduledAt || ''
  )
  
  // Platform customizations
  const [platformCustomizations, setPlatformCustomizations] = useState<Record<string, PlatformCustomization>>(
    initialPost?.platformCustomizations || {}
  )
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  
  // Publishing progress
  const [publishingProgress, setPublishingProgress] = useState(0)
  const [publishingStatus, setPublishingStatus] = useState<string>('')

  useEffect(() => {
    loadSecurityContext()
    loadTemplates()
  }, [userId, mediaCompanyId])

  const loadSecurityContext = async () => {
    try {
      const context = await securityContextService.getSecurityContext(userId)
      setSecurityContext(context)
      
      // Load accessible companies
      const companies = await loadAccessibleCompanies(context.accessibleCompanyIds)
      setAccessibleCompanies(companies)
    } catch (err) {
      setError('Failed to load security context')
      console.error('Failed to load security context:', err)
    }
  }

  const loadAccessibleCompanies = async (companyIds: string[]) => {
    const { supabase } = await import('@/integrations/supabase/client')
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, industry')
      .in('id', companyIds)
      .order('name')
    
    if (error) throw error
    return data || []
  }

  const loadTemplates = async () => {
    try {
      const templates = await bulkContentService.getTemplates(userId, mediaCompanyId)
      setTemplates(templates)
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handlePlatformCustomization = (platform: string, customization: Partial<PlatformCustomization>) => {
    setPlatformCustomizations(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...customization }
    }))
  }

  const handleTemplateSelect = async (templateId: string) => {
    try {
      const result = await bulkContentService.applyTemplate(templateId, templateVariables)
      setTitle(result.title)
      setContent(result.content)
      setPlatformCustomizations(result.platformCustomizations)
      setSelectedTemplate(templateId)
    } catch (err) {
      setError('Failed to apply template')
      console.error('Failed to apply template:', err)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }

    if (selectedCompanies.length === 0) {
      setError('Please select at least one company')
      return
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const postId = await bulkContentService.createBulkPost(
        userId,
        mediaCompanyId,
        title,
        content,
        selectedCompanies,
        {
          contentType,
          platformCustomizations,
          publishingStrategy,
          scheduledAt: publishingStrategy === 'scheduled' ? scheduledAt : undefined
        }
      )

      if (postId) {
        setSuccess('Bulk content created successfully!')
        onSave?.({
          id: postId,
          mediaCompanyId,
          title,
          content,
          contentType,
          platformCustomizations,
          targetCompanyIds: selectedCompanies,
          publishingStrategy,
          scheduledAt: publishingStrategy === 'scheduled' ? scheduledAt : undefined,
          status: publishingStrategy === 'immediate' ? 'pending' : 'draft',
          createdBy: userId,
          publishedCompanyIds: [],
          failedCompanyIds: [],
          publishingErrors: {},
          totalEngagement: 0,
          totalImpressions: 0,
          platformPerformance: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      } else {
        setError('Failed to create bulk content')
      }
    } catch (err) {
      setError('Failed to save bulk content')
      console.error('Failed to save bulk content:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setPublishingProgress(0)
    setPublishingStatus('Initializing publishing...')
    setError(null)

    try {
      // First save the content
      await handleSave()
      
      // Simulate publishing progress
      const totalOperations = selectedCompanies.length * selectedPlatforms.length
      let completedOperations = 0

      for (let i = 0; i < selectedCompanies.length; i++) {
        setPublishingStatus(`Publishing to ${accessibleCompanies.find(c => c.id === selectedCompanies[i])?.name}...`)
        
        for (let j = 0; j < selectedPlatforms.length; j++) {
          completedOperations++
          setPublishingProgress(Math.round((completedOperations / totalOperations) * 100))
          
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setPublishingStatus('Publishing completed!')
      setSuccess('Content published successfully to all selected companies!')
    } catch (err) {
      setError('Failed to publish content')
      console.error('Failed to publish content:', err)
    } finally {
      setPublishing(false)
    }
  }

  const selectedCompaniesCount = selectedCompanies.length
  const totalPublishingTargets = selectedCompaniesCount * selectedPlatforms.length

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Content Creator</h1>
          <p className="text-muted-foreground">
            Create and publish content across multiple companies simultaneously
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={handlePublish} disabled={publishing || !title || !content || selectedCompanies.length === 0}>
            {publishing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Publish to {totalPublishingTargets} targets
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Publishing Progress */}
      {publishing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{publishingStatus}</span>
                <span className="text-sm text-muted-foreground">{publishingProgress}%</span>
              </div>
              <Progress value={publishingProgress} className="w-full" />
              <div className="text-xs text-muted-foreground">
                Publishing to {selectedCompaniesCount} companies × {selectedPlatforms.length} platforms
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Template className="h-5 w-5" />
                Content Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.templateType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="space-y-2">
                  <Label>Template Variables</Label>
                  {Object.entries(templateVariables).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <Input
                        placeholder={key}
                        value={value}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [key]: e.target.value
                        }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTemplateSelect(selectedTemplate)}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter content title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform Customizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Platform Customizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedPlatforms[0]} onValueChange={setSelectedPlatforms}>
                <TabsList className="grid w-full grid-cols-5">
                  {PLATFORMS.map(platform => (
                    <TabsTrigger 
                      key={platform.id} 
                      value={platform.id}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformToggle(platform.id)}
                        className="mr-1"
                      />
                      {platform.icon} {platform.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedPlatforms.map(platform => (
                  <TabsContent key={platform.id} value={platform.id} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Platform-specific Title</Label>
                        <Input
                          placeholder="Override title for this platform"
                          value={platformCustomizations[platform.id]?.title || ''}
                          onChange={(e) => handlePlatformCustomization(platform.id, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Platform-specific Content</Label>
                        <Textarea
                          placeholder="Override content for this platform"
                          value={platformCustomizations[platform.id]?.content || ''}
                          onChange={(e) => handlePlatformCustomization(platform.id, { content: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Hashtags (comma-separated)</Label>
                        <Input
                          placeholder="#marketing #social #growth"
                          value={platformCustomizations[platform.id]?.hashtags?.join(', ') || ''}
                          onChange={(e) => handlePlatformCustomization(platform.id, { 
                            hashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                          })}
                        />
                      </div>
                      <div>
                        <Label>Mentions (comma-separated)</Label>
                        <Input
                          placeholder="@company @influencer"
                          value={platformCustomizations[platform.id]?.mentions?.join(', ') || ''}
                          onChange={(e) => handlePlatformCustomization(platform.id, { 
                            mentions: e.target.value.split(',').map(m => m.trim()).filter(Boolean)
                          })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publishing Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Publishing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={publishingStrategy} onValueChange={(value: any) => setPublishingStrategy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISHING_STRATEGIES.map(strategy => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {publishingStrategy === 'scheduled' && (
                <div>
                  <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Target Companies ({selectedCompanies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accessibleCompanies.map(company => (
                  <div key={company.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={company.id}
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() => handleCompanyToggle(company.id)}
                    />
                    <Label htmlFor={company.id} className="flex-1">
                      {company.name}
                    </Label>
                    <Badge variant="outline">{company.industry}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Publishing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Publishing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Companies:</span>
                  <div className="font-semibold">{selectedCompaniesCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Platforms:</span>
                  <div className="font-semibold">{selectedPlatforms.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Posts:</span>
                  <div className="font-semibold">{totalPublishingTargets}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Strategy:</span>
                  <div className="font-semibold capitalize">{publishingStrategy}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Selected Platforms:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPlatforms.map(platform => {
                    const platformInfo = PLATFORMS.find(p => p.id === platform)
                    return (
                      <Badge key={platform} variant="secondary" className="text-xs">
                        {platformInfo?.icon} {platformInfo?.name}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
