import type { Meal, PlanEntry } from '../domain/types';
import { openDb } from './db';
import { newId } from './recipes';

/** Entradas do plano entre dois dias, inclusive. */
export async function listPlan(from: string, to: string): Promise<PlanEntry[]> {
  const db = await openDb();
  return db.getAllFromIndex('plan', 'date', IDBKeyRange.bound(from, to));
}

export async function addToPlan(entry: { date: string; meal: Meal; recipeId: string; servings: number | null }): Promise<PlanEntry> {
  const db = await openDb();
  const saved: PlanEntry = { id: newId(), ...entry };
  await db.put('plan', saved);
  return saved;
}

export async function removeFromPlan(id: string): Promise<void> {
  const db = await openDb();
  await db.delete('plan', id);
}

export async function setPlanServings(id: string, servings: number): Promise<void> {
  const db = await openDb();
  const entry = await db.get('plan', id);
  if (entry) await db.put('plan', { ...entry, servings });
}
