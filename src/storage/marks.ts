import { openDb, type MarkKind } from './db';

export async function toggleMark(recipeId: string, kind: MarkKind): Promise<boolean> {
  const db = await openDb();
  const key = `${kind}:${recipeId}`;
  if (await db.get('marks', key)) {
    await db.delete('marks', key);
    return false;
  }
  await db.put('marks', { key, kind, recipeId, at: new Date().toISOString() });
  return true;
}

export async function setMark(recipeId: string, kind: MarkKind): Promise<void> {
  const db = await openDb();
  await db.put('marks', { key: `${kind}:${recipeId}`, kind, recipeId, at: new Date().toISOString() });
}

export async function listMarks(kind: MarkKind): Promise<string[]> {
  const db = await openDb();
  const entries = await db.getAllFromIndex('marks', 'kind', kind);
  return entries.sort((a, b) => b.at.localeCompare(a.at)).map((entry) => entry.recipeId);
}
