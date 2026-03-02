import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Image as ImageIcon, 
  MessageSquare, 
  ThumbsUp, 
  Eye,
  Clock,
  MoreHorizontal,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiPlatformPreviewProps {
  content: {
    title: string;
    body: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      alt?: string;
    }>;
    platforms?: string[];
  };
  className?: string;
}

export function MultiPlatformPreview({ content, className }: MultiPlatformPreviewProps) {
  const [activeTab, setActiveTab] = useState('facebook');

  // Platform-specific rendering logic
  const renderFacebookPreview = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Facebook Header */}
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Facebook className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Social Suite</div>
            <div className="text-xs text-gray-500">Sponsored</div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Facebook Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
        
        {/* Text content with truncation logic */}
        <div className="text-gray-700 text-sm leading-relaxed">
          {content.body.length > 480 ? (
            <>
              {content.body.substring(0, 480)}
              <span className="text-blue-600 hover:underline cursor-pointer">
                {' '}... See More
              </span>
            </>
          ) : (
            content.body
          )}
        </div>

        {/* Media content */}
        {content.media && content.media.length > 0 && (
          <div className="mt-3 space-y-2">
            {content.media.map((media, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                {media.type === 'image' ? (
                  <img 
                    src={media.url} 
                    alt={media.alt || ''}
                    className="w-full object-cover"
                  />
                ) : (
                  <div className="bg-black aspect-video flex items-center justify-center">
                    <Youtube className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Facebook Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ThumbsUp className="w-4 h-4 mr-1" />
              Like
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <MessageSquare className="w-4 h-4 mr-1" />
              Comment
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Eye className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Instagram Header */}
      <div className="bg-white p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
            <Instagram className="w-4 h-4 text-white" />
          </div>
          <div className="font-semibold text-sm">socialsuite</div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </div>

      {/* Instagram Content - Square format */}
      <div className="aspect-square bg-gray-50">
        {content.media && content.media.length > 0 ? (
          <div className="relative w-full h-full">
            {/* First media as background */}
            <img 
              src={content.media[0].url} 
              alt={content.media[0].alt || ''}
              className="w-full h-full object-cover"
            />
            
            {/* Instagram overlay info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Instagram className="w-3 h-3 text-pink-500" />
                  </div>
                  <span className="text-sm font-semibold">socialsuite</span>
                </div>
                <div className="text-xs">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Text-only post */
          <div className="p-4 h-full flex flex-col justify-center">
            <h3 className="font-semibold text-lg mb-2 text-center">{content.title}</h3>
            <p className="text-gray-700 text-sm text-center leading-relaxed">
              {content.body}
            </p>
          </div>
        )}
      </div>

      {/* Instagram Actions */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderYouTubePreview = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* YouTube Header */}
      <div className="bg-gray-900 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <Youtube className="w-4 h-4 text-white" />
          </div>
          <div className="text-white font-semibold text-sm">Social Suite</div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </div>

      {/* YouTube Content */}
      <div className="p-4">
        {/* Thumbnail + Title layout */}
        {content.media && content.media.length > 0 ? (
          <div className="flex space-x-4">
            {/* Video Thumbnail */}
            <div className="relative w-40 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={content.media[0].url} 
                alt={content.media[0].alt || ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white" />
              </div>
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                {content.media[0].type === 'video' ? 'LIVE' : 'HD'}
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 line-clamp-2">{content.title}</h3>
              <p className="text-gray-600 text-sm line-clamp-3 mb-2">{content.body}</p>
              
              {/* YouTube Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  1.2K views
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  2 days ago
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Text-only content */
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{content.body}</p>
          </div>
        )}
      </div>

      {/* YouTube Actions */}
      <div className="flex items-center justify-between p-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <ThumbsUp className="w-4 h-4 mr-1" />
            234
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <MessageSquare className="w-4 h-4 mr-1" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <Eye className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
        <Button variant="outline" size="sm">
          Subscribe
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <span>Platform Preview</span>
          <Badge variant="secondary" className="ml-auto">
            {activeTab === 'facebook' ? 'Facebook' : 
             activeTab === 'instagram' ? 'Instagram' : 'YouTube'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="facebook" className="flex items-center space-x-2">
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center space-x-2">
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center space-x-2">
              <Youtube className="w-4 h-4" />
              <span>YouTube</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px]">
            <TabsContent value="facebook" className="mt-0">
              <div className="p-4">
                {renderFacebookPreview()}
              </div>
            </TabsContent>
            
            <TabsContent value="instagram" className="mt-0">
              <div className="p-4">
                {renderInstagramPreview()}
              </div>
            </TabsContent>
            
            <TabsContent value="youtube" className="mt-0">
              <div className="p-4">
                {renderYouTubePreview()}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default MultiPlatformPreview;
