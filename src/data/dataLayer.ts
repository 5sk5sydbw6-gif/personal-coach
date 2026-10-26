import type { Settings } from '@/domain/records';

import type { KeyValueStore } from './keyValueStore';
import { createCollectionRepository, type Repository } from './repository';

/**
 * Until accounts exist there is exactly one user. A fixed ID keeps things
 * simple; when accounts arrive, records with this ID get reassigned to the
 * signed-in user during the first sync.
 */
export const LOCAL_USER_ID = 'local-user';

/** Everything the app can read or write. New collections get added here. */
export interface DataLayer {
  settings: Repository<Settings>;
}

export function createDataLayer(
  store: KeyValueStore,
  userId: string = LOCAL_USER_ID,
  now?: () => Date,
): DataLayer {
  return {
    settings: createCollectionRepository<Settings>({ store, collection: 'settings', userId, now }),
  };
}
