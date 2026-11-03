import type { CoachEvent, DailyTargets } from '@/domain/coach';
import type { TrainingPlan } from '@/domain/plan';
import type { Goal, Profile } from '@/domain/profile';
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
  profiles: Repository<Profile>;
  goals: Repository<Goal>;
  dailyTargets: Repository<DailyTargets>;
  trainingPlans: Repository<TrainingPlan>;
  coachEvents: Repository<CoachEvent>;
}

export function createDataLayer(
  store: KeyValueStore,
  userId: string = LOCAL_USER_ID,
  now?: () => Date,
): DataLayer {
  function repo<T extends Settings | Profile | Goal | DailyTargets | TrainingPlan | CoachEvent>(
    collection: string,
  ) {
    return createCollectionRepository<T>({ store, collection, userId, now });
  }
  return {
    settings: repo<Settings>('settings'),
    profiles: repo<Profile>('profiles'),
    goals: repo<Goal>('goals'),
    dailyTargets: repo<DailyTargets>('daily_targets'),
    trainingPlans: repo<TrainingPlan>('training_plans'),
    coachEvents: repo<CoachEvent>('coach_events'),
  };
}
