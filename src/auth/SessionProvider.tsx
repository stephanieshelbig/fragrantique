
import React, { createContext, useContext } from 'react';
import { useSession } from './useSession';

const SessionContext = createContext<any>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const sessionState = useSession();
  return <SessionContext.Provider value={sessionState}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  return useContext(SessionContext);
}
