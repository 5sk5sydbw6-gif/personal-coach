import { useCallback, useEffect, useState } from 'react';

import { useData } from '@/data/DataProvider';
import { getOrCreateSettings } from '@/data/settingsRepository';
import type { Settings } from '@/domain/records';

/** Loads the settings record and returns it with an update function. */
export function useSettings(): [Settings | null, (changes: Partial<Settings>) => Promise<void>] {
  const data = useData();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getOrCreateSettings(data.settings).then(setSettings);
  }, [data]);

  const update = useCallback(
    async (changes: Partial<Settings>) => {
      if (!settings) return;
      const { id, userId, createdAt, updatedAt, deletedAt, ...editable } = { ...settings, ...changes };
      setSettings(await data.settings.update(id, editable));
    },
    [data, settings],
  );

  return [settings, update];
}
