import { DEFAULT_SETTINGS, type Settings } from '@/domain/records';

import type { Repository } from './repository';

/**
 * Settings are a single record per user. This helper returns it,
 * creating it with defaults the first time.
 */
export async function getOrCreateSettings(repo: Repository<Settings>): Promise<Settings> {
  const [existing] = await repo.list();
  return existing ?? repo.create(DEFAULT_SETTINGS);
}
