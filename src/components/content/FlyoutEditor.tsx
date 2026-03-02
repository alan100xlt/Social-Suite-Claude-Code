import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Eye, Edit3, Send } from 'lucide-react';
import MultiPlatformPreview from './MultiPlatformPreview';

interface FlyoutEditorProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    content: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      alt?: string;
    }>;
  };
  onSave?: (updatedArticle: any) => void;
}

export function FlyoutEditor({ isOpen, onClose, article, onSave }: FlyoutEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editedTitle, setEditedTitle] = useState(article.title);
  const [editedContent, setEditedContent] = useState(article.content);

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...article,
        title: editedTitle,
        content: editedContent
      });
    }
    onClose();
  };

  const previewContent = {
    title: editedTitle,
    body: editedContent,
    media: article.media
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* Left Side - Editor */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Edit Article</h2>
            <div className="flex items-center space-x-2">
              <Badge variant={activeTab === 'edit' ? 'default' : 'secondary'}>
                Edit Mode
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
              >
                <Eye className="w-4 h-4 mr-1" />
                {activeTab === 'edit' ? 'Preview' : 'Edit'}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Editor Content */}
          {activeTab === 'edit' && (
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Enter article title"
                    className="w-full"
                  />
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Write your content here..."
                    rows={12}
                    className="w-full resize-none"
                  />
                </div>

                {/* Media Preview */}
                {article.media && article.media.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Media</label>
                    <div className="grid grid-cols-2 gap-2">
                      {article.media.map((media, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            {media.type === 'image' ? (
                              <img 
                                src={media.url} 
                                alt={media.alt || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-black flex items-center justify-center">
                                <div className="text-white text-2xl">▶</div>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Edit3 className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Send className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Content */}
          {activeTab === 'preview' && (
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Platform Preview</h3>
                  <Badge variant="secondary">Live Preview</Badge>
                </div>
                
                {/* Multi-Platform Preview Component */}
                <MultiPlatformPreview content={previewContent} />
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Preview (always visible in edit mode) */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Live Preview</h3>
                <Badge variant="outline">Updating</Badge>
              </div>
              
              {/* Always show preview */}
              <MultiPlatformPreview content={previewContent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlyoutEditor;
