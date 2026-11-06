import { openDb, type ShoppingState } from './db';

const KEY = 'state';

export async function getShopping(): Promise<ShoppingState> {
  const db = await openDb();
  return (await db.get('shopping', KEY)) ?? { selections: [], checked: [] };
}

export async function setShopping(state: ShoppingState): Promise<void> {
  const db = await openDb();
  await db.put('shopping', state, KEY);
}

/** Põe ou tira a receita da lista. Retorna true se ela ficou na lista. */
export async function toggleShoppingRecipe(recipeId: string, servings: number | null): Promise<boolean> {
  const state = await getShopping();
  const present = state.selections.some((selection) => selection.recipeId === recipeId);
  await setShopping({
    ...state,
    selections: present
      ? state.selections.filter((selection) => selection.recipeId !== recipeId)
      : [...state.selections, { recipeId, servings }],
  });
  return !present;
}
