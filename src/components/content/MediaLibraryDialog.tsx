import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageIcon, Upload, Link, Loader2 } from 'lucide-react';
import { useFeatureConfig } from '@/hooks/useFeatureConfig';

interface MediaLibraryDialogProps {
  onSelect: (url: string) => void;
  trigger?: React.ReactNode;
}

export function MediaLibraryDialog({ onSelect, trigger }: MediaLibraryDialogProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { data: config } = useFeatureConfig();

  const imagekitEndpoint = config?.media_library?.imagekit_url_endpoint;
  const isImageKitConfigured = config?.media_library?.enabled && !!imagekitEndpoint;

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim());
      setUrlInput('');
      setOpen(false);
    }
  }, [urlInput, onSelect]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageKitConfigured) {
      // Fallback: create object URL for preview (temporary)
      const objectUrl = URL.createObjectURL(file);
      onSelect(objectUrl);
      setOpen(false);
      return;
    }

    setIsUploading(true);
    try {
      // ImageKit upload via URL endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const response = await fetch(`${imagekitEndpoint}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      onSelect(result.url);
      setOpen(false);
    } catch {
      // Fallback to object URL
      const objectUrl = URL.createObjectURL(file);
      onSelect(objectUrl);
      setOpen(false);
    } finally {
      setIsUploading(false);
    }
  }, [isImageKitConfigured, imagekitEndpoint, onSelect]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Media Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL input */}
          <div className="space-y-2">
            <Label htmlFor="media-url" className="flex items-center gap-2">
              <Link className="h-3.5 w-3.5" />
              Image URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="media-url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" />
              Upload from device
            </Label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        PNG, JPG, GIF, WEBP up to 10MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {!isImageKitConfigured && (
            <p className="text-xs text-muted-foreground text-center">
              Configure ImageKit in Settings to enable cloud media library.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
