/**
 * The lowest storage layer: string keys to string values.
 *
 * Repositories are written against this interface rather than against
 * AsyncStorage directly, so tests can use the in-memory version and a
 * different backend (e.g. SQLite on the phone) can be swapped in later.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Non-persistent store for tests. */
export function createMemoryKeyValueStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}
