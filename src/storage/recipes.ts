import type { IDBPTransaction } from 'idb';
import type { Recipe } from '../domain/types';
import { openDb, type ReceitarioDb, type RecipeVersion } from './db';

export const MAX_VERSIONS = 50;

type VersionsTx = IDBPTransaction<ReceitarioDb, ('recipes' | 'versions' | 'marks' | 'shopping')[], 'readwrite'>;

export function newId(): string {
  return crypto.randomUUID();
}

export async function listMine(): Promise<Recipe[]> {
  const db = await openDb();
  const all = await db.getAll('recipes');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMine(id: string): Promise<Recipe | undefined> {
  const db = await openDb();
  return db.get('recipes', id);
}

function sortVersions(versions: RecipeVersion[]): RecipeVersion[] {
  return versions.sort((a, b) => b.seq - a.seq);
}

/** Acrescenta uma versão ao histórico e apaga as que passarem do limite. */
export async function pushVersion(tx: VersionsTx, snapshot: Recipe, savedAt: string): Promise<void> {
  const store = tx.objectStore('versions');
  const current = sortVersions(await store.index('recipeId').getAll(snapshot.id));
  const seq = (current[0]?.seq ?? 0) + 1;
  await store.put({ id: newId(), recipeId: snapshot.id, savedAt, seq, snapshot });
  for (const old of current.slice(MAX_VERSIONS - 1)) await store.delete(old.id);
}

export async function saveMine(recipe: Recipe): Promise<Recipe> {
  const db = await openDb();
  const tx = db.transaction(['recipes', 'versions', 'marks', 'shopping'], 'readwrite');
  const now = new Date().toISOString();
  const previous = await tx.objectStore('recipes').get(recipe.id);
  if (previous) await pushVersion(tx, previous, now);
  const saved: Recipe = { ...recipe, source: 'mine', updatedAt: now };
  await tx.objectStore('recipes').put(saved);
  await tx.done;
  return saved;
}

export async function copyFromCatalog(recipe: Recipe): Promise<Recipe> {
  const now = new Date().toISOString();
  return saveMine({ ...recipe, id: newId(), originId: recipe.id, source: 'mine', createdAt: now });
}

export async function deleteMine(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['recipes', 'versions', 'marks'], 'readwrite');
  await tx.objectStore('recipes').delete(id);
  const versions = tx.objectStore('versions');
  for (const key of await versions.index('recipeId').getAllKeys(id)) await versions.delete(key);
  const marks = tx.objectStore('marks');
  for (const key of await marks.index('recipeId').getAllKeys(id)) await marks.delete(key);
  await tx.done;
}

/** Desfaz a edição de uma receita pronta. Favorita, Quero testar e compras continuam valendo para a original. */
export async function discardEdits(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['recipes', 'versions'], 'readwrite');
  await tx.objectStore('recipes').delete(id);
  const versions = tx.objectStore('versions');
  for (const key of await versions.index('recipeId').getAllKeys(id)) await versions.delete(key);
  await tx.done;
}

export async function listVersions(id: string): Promise<RecipeVersion[]> {
  const db = await openDb();
  return sortVersions(await db.getAllFromIndex('versions', 'recipeId', id));
}

export async function restoreVersion(versionId: string): Promise<Recipe> {
  const db = await openDb();
  const version = await db.get('versions', versionId);
  if (!version) throw new Error('Versão não encontrada.');
  return saveMine(version.snapshot);
}
