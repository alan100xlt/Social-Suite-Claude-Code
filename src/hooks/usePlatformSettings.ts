import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlatformSettings {
  id: string;
  platform_name: string;
  platform_logo_url: string | null;
  platform_favicon_url: string | null;
  platform_domain: string | null;
  support_email: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as PlatformSettings;
    },
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<PlatformSettings, "id" | "created_at" | "updated_at">>) => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .update(updates as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as PlatformSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-global"] });
      toast.success("Platform settings saved");
    },
    onError: (err: Error) => {
      toast.error("Failed to save: " + err.message);
    },
  });
}
