import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ACTIVE_THREAD_KEY = 'koko_active_thread_id';

interface PageContext {
  page: string;
  draftId?: string;
}

interface KokoContextType {
  isOpen: boolean;
  activeThreadId: string | null;
  pageContext: PageContext;
  toggle: () => void;
  open: (context?: { draftId?: string }) => void;
  close: () => void;
  setActiveThread: (id: string | null) => void;
}

const KokoContext = createContext<KokoContextType | undefined>(undefined);

export function KokoProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [openDraftId, setOpenDraftId] = useState<string | undefined>(undefined);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_THREAD_KEY);
    }
    return null;
  });

  const pageContext = useMemo<PageContext>(() => ({
    page: location.pathname,
    draftId: openDraftId,
  }), [location.pathname, openDraftId]);

  const setActiveThread = useCallback((id: string | null) => {
    setActiveThreadIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_THREAD_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const open = useCallback((context?: { draftId?: string }) => {
    if (context?.draftId) {
      setOpenDraftId(context.draftId);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setOpenDraftId(undefined);
  }, []);

  // Clear draftId when navigating away
  useEffect(() => {
    setOpenDraftId(undefined);
  }, [location.pathname]);

  const value = useMemo<KokoContextType>(() => ({
    isOpen,
    activeThreadId,
    pageContext,
    toggle,
    open,
    close,
    setActiveThread,
  }), [isOpen, activeThreadId, pageContext, toggle, open, close, setActiveThread]);

  return (
    <KokoContext.Provider value={value}>
      {children}
    </KokoContext.Provider>
  );
}

export function useKoko() {
  const context = useContext(KokoContext);
  if (context === undefined) {
    throw new Error('useKoko must be used within a KokoProvider');
  }
  return context;
}
