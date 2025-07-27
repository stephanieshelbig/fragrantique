
import React, { createContext, useContext, useEffect } from 'react';
import { useSession } from './useSession';

const SessionContext = createContext<any>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const sessionState = useSession();

  useEffect(() => {
    // Cleanup URL after OAuth redirect
    if (window.location.hash.includes('access_token')) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  return <SessionContext.Provider value={sessionState}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  return useContext(SessionContext);
}
