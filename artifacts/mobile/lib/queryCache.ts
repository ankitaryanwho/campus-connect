/**
 * Shared constants for TanStack Query persistence.
 *
 * Centralised here so _layout.tsx (persister setup) and useBatchStartup.ts
 * (ownership verification / cache clearing) stay in sync automatically.
 */

/** Time-to-live for the persisted query cache, in milliseconds (5 minutes). */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * AsyncStorage key used by the AsyncStorage persister.
 * Must match the `key` option in createAsyncStoragePersister.
 */
export const PERSISTED_CACHE_STORAGE_KEY = "campusconnect-query-cache";

/**
 * AsyncStorage key that records which user ID owns the persisted cache.
 * Written after each successful batch; checked on startup to prevent one
 * account's data being shown to another account.
 */
export const CACHE_OWNER_KEY = "@campusconnect-cache-owner";

/**
 * Query keys for startup batch data that should be persisted to AsyncStorage.
 * Only these keys are dehydrated by PersistQueryClientProvider.
 */
export const STARTUP_QUERY_KEYS = [
  ["posts"],
  ["notifications"],
  ["chatrooms"],
  ["conversations"],
  ["marketplace", "all"],
] as const;
