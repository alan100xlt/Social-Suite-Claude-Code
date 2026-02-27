import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { FaFacebook, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface RssFeed {
  url: string;
  title: string;
  type: string;
  itemCount?: number;
}

interface SamplePostsSidebarProps {
  rssFeeds: RssFeed[];
  articleTitle?: string;
  articleDescription?: string;
  articleLink?: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <FaFacebook className="w-4 h-4" style={{ color: '#1877F2' }} />,
  linkedin: <FaLinkedin className="w-4 h-4" style={{ color: '#0A66C2' }} />,
  twitter: <FaTwitter className="w-4 h-4" style={{ color: '#1DA1F2' }} />,
};

export function SamplePostsSidebar({ rssFeeds, articleTitle, articleDescription, articleLink }: SamplePostsSidebarProps) {
  const [posts, setPosts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [feedArticle, setFeedArticle] = useState<{ title: string; description: string; link: string } | null>(null);

  // Use article info passed from the server (no CORS issues)
  useEffect(() => {
    if (articleTitle && articleDescription) {
      setFeedArticle({ title: articleTitle, description: articleDescription, link: articleLink || '' });
    }
  }, [articleTitle, articleDescription, articleLink]);

  // Generate sample posts when we have an article
  useEffect(() => {
    if (!feedArticle || generated || loading) return;

    const generatePosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-social-post', {
          body: {
            mode: 'posts',
            title: feedArticle.title,
            description: feedArticle.description,
            link: feedArticle.link,
            objective: 'reach',
            platforms: ['facebook', 'linkedin', 'twitter'],
            approvedStrategy: `Write engaging social posts about: ${feedArticle.title}. Key points: ${feedArticle.description}`,
          },
        });

        if (!error && data?.posts) {
          setPosts(data.posts);
        }
      } catch (e) {
        console.log('Sample post generation failed:', e);
      } finally {
        setLoading(false);
        setGenerated(true);
      }
    };
    generatePosts();
  }, [feedArticle, generated, loading]);

  const hasPosts = Object.keys(posts).length > 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-fuchsia-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI-Generated Posts</h3>
      </div>

      {feedArticle && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs text-zinc-500 mb-1">Based on article:</p>
          <p className="text-sm text-zinc-300 font-medium line-clamp-2">{feedArticle.title}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          <span className="ml-2 text-sm text-zinc-400">Generating posts...</span>
        </div>
      )}

      {!loading && !hasPosts && !feedArticle && (
        <div className="text-center py-12">
          <Sparkles className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">Waiting for RSS feed discovery to generate sample posts...</p>
        </div>
      )}

      {hasPosts && (
        <div className="space-y-3">
          {Object.entries(posts).map(([platform, content]) => (
            <Card key={platform} className="border-zinc-800 bg-zinc-800/40 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {platformIcons[platform] || null}
                  <span className="text-xs font-semibold text-zinc-400 capitalize">{platform}</span>
                  <Badge variant="outline" className="ml-auto border-fuchsia-500/30 text-fuchsia-400 text-[10px]">AI Generated</Badge>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
