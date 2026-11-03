import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { type CoachProvider, RuleBasedCoach } from '@/domain/coach';

import { asyncStorageKeyValueStore } from './asyncStorageKeyValueStore';
import { createDataLayer, type DataLayer } from './dataLayer';

interface AppServices {
  data: DataLayer;
  coach: CoachProvider;
}

const ServicesContext = createContext<AppServices | null>(null);

/**
 * Makes the data layer and the coach available to every screen via
 * `useData()` and `useCoach()`. Swapping the coach (e.g. for an AI one
 * later) means changing one line here.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const services = useMemo<AppServices>(
    () => ({ data: createDataLayer(asyncStorageKeyValueStore), coach: new RuleBasedCoach() }),
    [],
  );
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useData/useCoach must be used inside <DataProvider>');
  }
  return services;
}

export function useData(): DataLayer {
  return useServices().data;
}

export function useCoach(): CoachProvider {
  return useServices().coach;
}
