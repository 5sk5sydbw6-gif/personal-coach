import type { BaseRecord, NewRecord } from '@/domain/records';

import { newId } from './ids';
import type { KeyValueStore } from './keyValueStore';

/**
 * The single data-access interface screens use. Every method is scoped to
 * one user, so moving to multi-user or cloud storage later means writing a
 * new implementation of this interface, not changing screens.
 */
export interface Repository<T extends BaseRecord> {
  /** Active (not deleted) records for this user. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(fields: NewRecord<T>): Promise<T>;
  update(id: string, changes: Partial<NewRecord<T>>): Promise<T>;
  /** Soft delete: sets `deletedAt` so the deletion can sync later. */
  remove(id: string): Promise<void>;
}

export interface RepositoryOptions {
  store: KeyValueStore;
  /** Collection name, e.g. 'food_logs'. Becomes part of the storage key. */
  collection: string;
  userId: string;
  /** Injectable clock so tests get predictable timestamps. */
  now?: () => Date;
}

/** Bump if the stored shape changes, so old data can be migrated. */
export const STORAGE_VERSION = 1;

export function storageKey(collection: string): string {
  return `pc:v${STORAGE_VERSION}:${collection}`;
}

/**
 * Stores a whole collection as one JSON array under a single key.
 * Simple and fast enough for one person's data (thousands of records).
 * Writes are serialised through a promise chain so two quick edits
 * can't overwrite each other.
 */
export function createCollectionRepository<T extends BaseRecord>(
  options: RepositoryOptions,
): Repository<T> {
  const { store, collection, userId, now = () => new Date() } = options;
  const key = storageKey(collection);
  let writeQueue: Promise<unknown> = Promise.resolve();

  async function readAll(): Promise<T[]> {
    const raw = await store.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  }

  function mutate<R>(fn: (records: T[]) => { records: T[]; result: R }): Promise<R> {
    const run = writeQueue.then(async () => {
      const { records, result } = fn(await readAll());
      await store.setItem(key, JSON.stringify(records));
      return result;
    });
    writeQueue = run.catch(() => undefined);
    return run;
  }

  function isVisible(record: T): boolean {
    return record.userId === userId && !record.deletedAt;
  }

  return {
    async list() {
      await writeQueue;
      return (await readAll()).filter(isVisible);
    },

    async get(id) {
      await writeQueue;
      return (await readAll()).find((r) => r.id === id && isVisible(r));
    },

    create(fields) {
      return mutate((records) => {
        const timestamp = now().toISOString();
        const record = {
          ...fields,
          id: newId(),
          userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        } as T;
        return { records: [...records, record], result: record };
      });
    },

    update(id, changes) {
      return mutate((records) => {
        const index = records.findIndex((r) => r.id === id && isVisible(r));
        if (index === -1) {
          throw new Error(`${collection}: record ${id} not found`);
        }
        const updated = {
          ...records[index],
          ...changes,
          updatedAt: now().toISOString(),
        } as T;
        const next = [...records];
        next[index] = updated;
        return { records: next, result: updated };
      });
    },

    remove(id) {
      return mutate((records) => {
        const timestamp = now().toISOString();
        const next = records.map((r) =>
          r.id === id && isVisible(r) ? { ...r, deletedAt: timestamp, updatedAt: timestamp } : r,
        );
        return { records: next, result: undefined };
      });
    },
  };
}
