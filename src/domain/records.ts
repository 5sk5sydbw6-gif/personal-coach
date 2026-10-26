/**
 * Fields every stored record carries.
 *
 * - `id` is a UUID generated on the device, so records can be created offline
 *   and later synced without ID clashes.
 * - `userId` ties each record to its owner. Today there is one local user;
 *   with accounts later, the same field scopes data per user.
 * - Timestamps are ISO-8601 UTC strings. `updatedAt` lets a future sync
 *   decide which copy is newer; `deletedAt` (soft delete) lets a deletion
 *   sync too, instead of the record silently vanishing.
 */
export interface BaseRecord {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Fields the caller supplies when creating a record; the rest are filled in. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>;

export type WeightUnit = 'kg' | 'lb' | 'st';

export interface Settings extends BaseRecord {
  /** Display unit for bodyweight. Data is always stored in kg. */
  weightUnit: WeightUnit;
}

export const DEFAULT_SETTINGS: NewRecord<Settings> = {
  weightUnit: 'kg',
};
