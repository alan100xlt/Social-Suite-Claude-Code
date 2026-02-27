import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';

interface StrategyParams {
  title: string | null;
  description: string | null;
  link: string | null;
  fullContent?: string | null;
  objective: string;
  platforms: string[];
  chatMessages?: Array<{ role: string; content: string }>;
}

interface PostsParams {
  title: string | null;
  description: string | null;
  link: string | null;
  fullContent?: string | null;
  imageUrl?: string | null;
  objective: string;
  platforms: string[];
  approvedStrategy: string;
}

export function useGenerateSocialPost() {
  const { selectedCompanyId } = useSelectedCompany();
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);

  const generateStrategy = async (params: StrategyParams): Promise<string | null> => {
    setIsGeneratingStrategy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-post', {
        body: { mode: 'strategy', companyId: selectedCompanyId, ...params },
      });

      if (error) {
        toast({ title: 'Strategy Generation Failed', description: error.message, variant: 'destructive' });
        return null;
      }
      if (data?.error) {
        toast({ title: 'Strategy Generation Failed', description: data.error, variant: 'destructive' });
        return null;
      }
      return data?.strategy || null;
    } catch (e) {
      toast({ title: 'Strategy Generation Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
      return null;
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const generatePosts = async (params: PostsParams): Promise<Record<string, string> | null> => {
    setIsGeneratingPosts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-post', {
        body: { mode: 'posts', companyId: selectedCompanyId, ...params },
      });

      if (error) {
        toast({ title: 'Post Generation Failed', description: error.message, variant: 'destructive' });
        return null;
      }
      if (data?.error) {
        toast({ title: 'Post Generation Failed', description: data.error, variant: 'destructive' });
        return null;
      }
      return data?.posts || null;
    } catch (e) {
      toast({ title: 'Post Generation Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
      return null;
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  const checkCompliance = async (posts: Record<string, string>): Promise<Record<string, string> | null> => {
    setIsCheckingCompliance(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-post', {
        body: { mode: 'compliance', companyId: selectedCompanyId, posts },
      });

      if (error) {
        console.error('Compliance check failed:', error.message);
        return posts; // Return originals on failure
      }
      if (data?.error) {
        console.error('Compliance check failed:', data.error);
        return posts;
      }
      return data?.posts || posts;
    } catch (e) {
      console.error('Compliance check failed:', e);
      return posts;
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  return { generateStrategy, generatePosts, checkCompliance, isGeneratingStrategy, isGeneratingPosts, isCheckingCompliance };
}
