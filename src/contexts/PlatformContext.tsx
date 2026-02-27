import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  id: string;
  platform_name: string;
  platform_logo_url: string | null;
  platform_favicon_url: string | null;
  platform_domain: string | null;
  support_email: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

const defaults: PlatformSettings = {
  id: "",
  platform_name: "Longtale.ai",
  platform_logo_url: null,
  platform_favicon_url: null,
  platform_domain: "social.longtale.ai",
  support_email: "support@longtale.ai",
  primary_color: "#667eea",
  secondary_color: "#764ba2",
};

const PlatformContext = createContext<PlatformSettings>(defaults);

export function usePlatform() {
  return useContext(PlatformContext);
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["platform-settings-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("*")
        .single();
      if (error) return null;
      return data as unknown as PlatformSettings;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
    retry: 1,
  });

  const value: PlatformSettings = data
    ? { ...defaults, ...data }
    : defaults;

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
