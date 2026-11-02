import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { asyncStorageKeyValueStore } from './asyncStorageKeyValueStore';
import { createDataLayer, type DataLayer } from './dataLayer';

const DataContext = createContext<DataLayer | null>(null);

/** Makes the data layer available to every screen via `useData()`. */
export function DataProvider({ children }: { children: ReactNode }) {
  const data = useMemo(() => createDataLayer(asyncStorageKeyValueStore), []);
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useData(): DataLayer {
  const data = useContext(DataContext);
  if (!data) {
    throw new Error('useData must be used inside <DataProvider>');
  }
  return data;
}
