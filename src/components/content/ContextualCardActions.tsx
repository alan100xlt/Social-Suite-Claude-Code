import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit3, 
  Send, 
  BarChart3, 
  Eye, 
  MessageSquare, 
  ThumbsUp, 
  Users,
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostAnalyticsInfo {
  platform: string;
  post_url: string | null;
  post_id: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement_rate?: number;
}

interface ContextualCardActionsProps {
  postState?: 'future' | 'published' | 'draft' | 'processing';
  postId?: string;
  analytics?: {
    platform?: string;
    post_url?: string | null;
    post_id?: string;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    engagement_rate?: number;
  };
  onEdit?: () => void;
  onSchedule?: () => void;
  onPublish?: () => void;
  onViewAnalytics?: () => void;
  className?: string;
}

export function ContextualCardActions({ 
  postState, 
  postId, 
  analytics, 
  onEdit, 
  onSchedule, 
  onPublish, 
  onViewAnalytics,
  className 
}: ContextualCardActionsProps) {
  
  // Future posts - Show CTAs for action
  const renderFutureActions = () => (
    <div className="flex flex-col space-y-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onEdit}
        className="w-full justify-start"
      >
        <Edit3 className="w-4 h-4 mr-2" />
        Edit Caption
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onSchedule}
        className="w-full justify-start"
      >
        <Calendar className="w-4 h-4 mr-2" />
        Schedule Post
      </Button>
      
      <Button 
        variant="default" 
        size="sm" 
        onClick={onPublish}
        className="w-full justify-start"
      >
        <Send className="w-4 h-4 mr-2" />
        Publish Now
      </Button>
    </div>
  );

  // Published posts - Show engagement analytics
  const renderPublishedAnalytics = () => (
    <div className="space-y-3">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-blue-500" />
          <div>
            <div className="font-semibold">{analytics?.views || 0}</div>
            <div className="text-muted-foreground">Views</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThumbsUp className="w-4 h-4 text-green-500" />
          <div>
            <div className="font-semibold">{analytics?.likes || 0}</div>
            <div className="text-muted-foreground">Likes</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <div>
            <div className="font-semibold">{analytics?.comments || 0}</div>
            <div className="text-muted-foreground">Comments</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-orange-500" />
          <div>
            <div className="font-semibold">{analytics?.shares || 0}</div>
            <div className="text-muted-foreground">Shares</div>
          </div>
        </div>
      </div>

      {/* Engagement Rate */}
      {analytics?.engagement_rate && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Engagement Rate</span>
            <Badge 
              variant={analytics.engagement_rate > 5 ? "default" : "secondary"}
              className="text-xs"
            >
              {analytics.engagement_rate.toFixed(1)}%
            </Badge>
          </div>
        </div>
      )}

      {/* View Detailed Analytics */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onViewAnalytics}
        className="w-full"
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        View Detailed Analytics
      </Button>
    </div>
  );

  // Draft posts - Show editing options
  const renderDraftActions = () => (
    <div className="flex flex-col space-y-2">
      <Button 
        variant="default" 
        size="sm" 
        onClick={onEdit}
        className="w-full justify-start"
      >
        <Edit3 className="w-4 h-4 mr-2" />
        Continue Editing
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onSchedule}
        className="w-full justify-start"
      >
        <Calendar className="w-4 h-4 mr-2" />
        Schedule for Later
      </Button>
    </div>
  );

  // Processing posts - Show progress and status
  const renderProcessingActions = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
          <div>
            <div className="font-medium text-sm">Processing</div>
            <div className="text-xs text-muted-foreground">AI working on your post</div>
          </div>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          In Progress
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Content generated</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Media rendering</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span>Awaiting approval</span>
        </div>
      </div>
    </div>
  );

  // Render appropriate content based on post state
  const renderContent = () => {
    switch (postState) {
      case 'future':
        return renderFutureActions();
      case 'published':
        return renderPublishedAnalytics();
      case 'draft':
        return renderDraftActions();
      case 'processing':
        return renderProcessingActions();
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge 
            variant={
              postState === 'published' ? 'default' :
              postState === 'processing' ? 'secondary' : 'outline'
            }
            className="text-xs"
          >
            {postState === 'published' && '✅ Published'}
            {postState === 'processing' && '⏳ Processing'}
            {postState === 'draft' && '📝 Draft'}
            {postState === 'future' && '📅 Scheduled'}
          </Badge>
          
          <span className="text-sm font-medium capitalize">
            {postState === 'published' && 'Live Post Analytics'}
            {postState === 'processing' && 'Post Processing'}
            {postState === 'draft' && 'Draft Post Actions'}
            {postState === 'future' && 'Scheduled Post Actions'}
          </span>
        </div>
      </div>

      {/* Dynamic Content */}
      {renderContent()}
    </div>
  );
}

export default ContextualCardActions;
