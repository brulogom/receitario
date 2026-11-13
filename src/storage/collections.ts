import type { Collection } from '../domain/types';
import { openDb } from './db';
import { newId } from './recipes';

export async function listCollections(): Promise<Collection[]> {
  const db = await openDb();
  const all = await db.getAll('collections');
  return all.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function createCollection(name: string, recipeIds: string[] = []): Promise<Collection> {
  const db = await openDb();
  const now = new Date().toISOString();
  const collection: Collection = { id: newId(), name: name.trim(), recipeIds, createdAt: now, updatedAt: now };
  await db.put('collections', collection);
  return collection;
}

async function change(id: string, update: (collection: Collection) => Partial<Collection>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('collections', 'readwrite');
  const collection = await tx.store.get(id);
  if (collection) await tx.store.put({ ...collection, ...update(collection), updatedAt: new Date().toISOString() });
  await tx.done;
}

export function renameCollection(id: string, name: string): Promise<void> {
  return change(id, () => ({ name: name.trim() }));
}

/** Põe ou tira a receita da coleção. */
export function toggleInCollection(id: string, recipeId: string): Promise<void> {
  return change(id, ({ recipeIds }) => ({
    recipeIds: recipeIds.includes(recipeId) ? recipeIds.filter((item) => item !== recipeId) : [...recipeIds, recipeId],
  }));
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await openDb();
  await db.delete('collections', id);
}
