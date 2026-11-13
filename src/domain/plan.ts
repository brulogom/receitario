import type { Meal, PlanEntry, Recipe } from './types';

export const MEALS: [Meal, string][] = [
  ['almoco', 'Almoço'],
  ['jantar', 'Jantar'],
];

export type Selection = { recipeId: string; servings: number | null };

/**
 * O que o plano pede de cada receita. A mesma receita em dois dias soma os rendimentos:
 * bolo para 8 na segunda e para 8 na sexta vira bolo para 16 na lista de compras.
 */
export function planSelections(entries: PlanEntry[], recipes: Recipe[]): Selection[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const totals = new Map<string, number | null>();
  for (const entry of entries) {
    const recipe = byId.get(entry.recipeId);
    if (!recipe) continue;
    const amount = recipe.servings ? entry.servings ?? recipe.servings : null;
    const current = totals.get(entry.recipeId);
    if (current === undefined) totals.set(entry.recipeId, amount);
    else totals.set(entry.recipeId, current === null || amount === null ? null : current + amount);
  }
  return [...totals].map(([recipeId, servings]) => ({ recipeId, servings }));
}

/** Põe as receitas do plano na lista. Uma receita que já estava lá passa a valer o total do plano. */
export function mergeSelections(current: Selection[], incoming: Selection[]): Selection[] {
  const replaced = new Map(incoming.map((selection) => [selection.recipeId, selection]));
  const kept = current.map((selection) => replaced.get(selection.recipeId) ?? selection);
  const known = new Set(current.map((selection) => selection.recipeId));
  return [...kept, ...incoming.filter((selection) => !known.has(selection.recipeId))];
}
