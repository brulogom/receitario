import type { CookedEntry } from '../domain/types';
import { openDb } from './db';
import { newId } from './recipes';

export async function listCooked(): Promise<CookedEntry[]> {
  const db = await openDb();
  return db.getAll('cooked');
}

export async function addCooked(entry: { recipeId: string; date: string; rating: number | null; comment: string }): Promise<CookedEntry> {
  const db = await openDb();
  const saved: CookedEntry = { id: newId(), ...entry, comment: entry.comment.trim(), at: new Date().toISOString() };
  await db.put('cooked', saved);
  return saved;
}

export async function deleteCooked(id: string): Promise<void> {
  const db = await openDb();
  await db.delete('cooked', id);
}
