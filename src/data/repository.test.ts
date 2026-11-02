import type { BaseRecord } from '@/domain/records';

import { createMemoryKeyValueStore, type KeyValueStore } from './keyValueStore';
import { createCollectionRepository, storageKey } from './repository';

interface Note extends BaseRecord {
  text: string;
}

function setup(store: KeyValueStore = createMemoryKeyValueStore(), userId = 'user-a') {
  let tick = 0;
  // Each call to the clock advances one second, so timestamps are predictable.
  const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));
  const repo = createCollectionRepository<Note>({ store, collection: 'notes', userId, now });
  return { store, repo };
}

describe('collection repository', () => {
  it('creates records with id, user and timestamps', async () => {
    const { repo } = setup();
    const note = await repo.create({ text: 'hello' });

    expect(note.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(note.userId).toBe('user-a');
    expect(note.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(note.updatedAt).toBe(note.createdAt);
    expect(await repo.get(note.id)).toEqual(note);
  });

  it('updates fields and bumps updatedAt only', async () => {
    const { repo } = setup();
    const note = await repo.create({ text: 'hello' });
    const updated = await repo.update(note.id, { text: 'bye' });

    expect(updated.text).toBe('bye');
    expect(updated.createdAt).toBe(note.createdAt);
    expect(updated.updatedAt).toBe('2026-01-01T00:00:01.000Z');
  });

  it('throws when updating a missing record', async () => {
    const { repo } = setup();
    await expect(repo.update('nope', { text: 'x' })).rejects.toThrow('not found');
  });

  it('soft-deletes: hidden from reads but kept in storage', async () => {
    const { repo, store } = setup();
    const note = await repo.create({ text: 'hello' });
    await repo.remove(note.id);

    expect(await repo.list()).toEqual([]);
    expect(await repo.get(note.id)).toBeUndefined();
    const stored = JSON.parse((await store.getItem(storageKey('notes')))!);
    expect(stored[0].deletedAt).toBe('2026-01-01T00:00:01.000Z');
  });

  it("only returns the current user's records", async () => {
    const store = createMemoryKeyValueStore();
    const a = setup(store, 'user-a').repo;
    const b = setup(store, 'user-b').repo;
    await a.create({ text: 'from a' });
    await b.create({ text: 'from b' });

    expect((await a.list()).map((n) => n.text)).toEqual(['from a']);
    expect((await b.list()).map((n) => n.text)).toEqual(['from b']);
  });

  it('does not lose writes made at the same time', async () => {
    const { repo } = setup();
    await Promise.all([1, 2, 3, 4, 5].map((i) => repo.create({ text: `note ${i}` })));
    expect(await repo.list()).toHaveLength(5);
  });

  it('persists across repository instances (like an app restart)', async () => {
    const store = createMemoryKeyValueStore();
    await setup(store).repo.create({ text: 'saved' });
    const reopened = setup(store).repo;
    expect((await reopened.list()).map((n) => n.text)).toEqual(['saved']);
  });
});
