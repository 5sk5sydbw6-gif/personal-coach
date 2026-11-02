import { createDataLayer } from './dataLayer';
import { createMemoryKeyValueStore } from './keyValueStore';
import { getOrCreateSettings } from './settingsRepository';

describe('getOrCreateSettings', () => {
  it('creates default settings once, then returns the same record', async () => {
    const { settings } = createDataLayer(createMemoryKeyValueStore());
    const first = await getOrCreateSettings(settings);
    const second = await getOrCreateSettings(settings);

    expect(first.weightUnit).toBe('kg');
    expect(second.id).toBe(first.id);
    expect(await settings.list()).toHaveLength(1);
  });
});
