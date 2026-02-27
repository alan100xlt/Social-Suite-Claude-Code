import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SELECTED_COMPANY_KEY = 'selected_company_id';

interface SelectedCompanyContextType {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
}

const SelectedCompanyContext = createContext<SelectedCompanyContextType | undefined>(undefined);

export function SelectedCompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SELECTED_COMPANY_KEY);
    }
    return null;
  });

  const setSelectedCompanyId = useCallback((id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(SELECTED_COMPANY_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_COMPANY_KEY);
    }
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SELECTED_COMPANY_KEY) {
        setSelectedCompanyIdState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <SelectedCompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId }}>
      {children}
    </SelectedCompanyContext.Provider>
  );
}

export function useSelectedCompany() {
  const context = useContext(SelectedCompanyContext);
  if (context === undefined) {
    throw new Error('useSelectedCompany must be used within a SelectedCompanyProvider');
  }
  return context;
}
