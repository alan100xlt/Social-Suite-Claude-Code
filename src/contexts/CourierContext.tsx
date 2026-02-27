import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CourierContextType {
  courierToken: string | null;
  isLoading: boolean;
}

const CourierContext = createContext<CourierContextType>({ courierToken: null, isLoading: true });

export function useCourierToken() {
  return useContext(CourierContext);
}

export function CourierTokenProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [courierToken, setCourierToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    if (!user) {
      setCourierToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("courier-token");
      if (error) {
        console.error("Failed to fetch Courier token:", error);
        setCourierToken(null);
      } else {
        setCourierToken(data?.token || null);
      }
    } catch (e) {
      console.error("Courier token error:", e);
      setCourierToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchToken();
    // Refresh token every 12 hours
    const interval = setInterval(fetchToken, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchToken]);

  return (
    <CourierContext.Provider value={{ courierToken, isLoading }}>
      {children}
    </CourierContext.Provider>
  );
}
