import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('basket-routine.db', {
  enableChangeListener: true,
});
// SQLite has foreign keys off by default.
expoDb.execSync('PRAGMA foreign_keys = ON;');
expoDb.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(expoDb, { schema });
