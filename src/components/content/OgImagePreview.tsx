import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Image, RefreshCw, ChevronDown, Sparkles, Loader2, Search, Check } from 'lucide-react';
import { useRegenerateOgImage, OG_TEMPLATES } from '@/hooks/useOgImage';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

interface OgImagePreviewProps {
  feedItemId: string;
  ogImageUrl: string | null;
  ogTemplateId: string | null;
  ogAiReasoning: string | null;
  hasArticleImage: boolean;
}

const CATEGORIES = ['photo', 'gradient', 'news', 'stats', 'editorial', 'brand'] as const;

export function OgImagePreview({
  feedItemId,
  ogImageUrl,
  ogTemplateId,
  ogAiReasoning,
  hasArticleImage,
}: OgImagePreviewProps) {
  const [imgError, setImgError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(0);
  const regenerate = useRegenerateOgImage();
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  const [search, setSearch] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  const currentTemplate = OG_TEMPLATES.find(t => t.id === ogTemplateId);
  const availableTemplates = OG_TEMPLATES.filter(t => !t.requiresImage || hasArticleImage);

  const filteredTemplates = useMemo(() => {
    if (!search) return availableTemplates;
    const q = search.toLowerCase();
    return availableTemplates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [availableTemplates, search]);

  // Append cache-buster to force browser to refetch after regeneration
  const displayUrl = ogImageUrl && cacheBuster > 0
    ? `${ogImageUrl}?t=${cacheBuster}`
    : ogImageUrl;

  const onMutationSuccess = () => {
    setImgError(false);
    setCacheBuster(Date.now());
  };

  const handleTemplateChange = (templateId: string) => {
    regenerate.mutate({ feedItemId, templateId }, { onSuccess: onMutationSuccess });
  };

  const handleRegenerate = () => {
    regenerate.mutate({ feedItemId }, { onSuccess: onMutationSuccess });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Image className="h-4 w-4" />
          OG Preview Image
        </div>
        <div className="flex items-center gap-2">
          {currentTemplate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {currentTemplate.name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{ogAiReasoning || 'AI-selected template'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Image preview */}
      {(ogImageUrl || regenerate.isSuccess) && !imgError ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={displayUrl || ogImageUrl || ''}
            alt="OG preview"
            className="w-full aspect-[1200/630] object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 aspect-[1200/630]">
          <div className="text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {regenerate.isPending ? 'Generating...' : 'No OG image generated yet'}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerate.isPending || isDemo}
        >
          {regenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {regenerate.isPending ? 'Generating...' : 'Regenerate'}
        </Button>

        <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={regenerate.isPending || isDemo}>
              Change Template
              <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {CATEGORIES.map(category => {
                const categoryTemplates = filteredTemplates.filter(t => t.category === category);
                if (categoryTemplates.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground capitalize">
                      {category} ({categoryTemplates.length})
                    </div>
                    {categoryTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          handleTemplateChange(t.id);
                          setTemplateOpen(false);
                          setSearch('');
                        }}
                        className="flex items-center w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {t.id === ogTemplateId && <Check className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                        <span className={t.id === ogTemplateId ? 'font-medium' : ''}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No templates match "{search}"
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
