import { ingredientKey } from './ingredientMatch';
import { formatIngredient } from './portions';
import type { Ingredient, Recipe } from './types';

/** Unidades conversíveis ficam na menor delas; as demais só somam com a mesma unidade. */
const CONVERT: Record<string, { family: string; factor: number }> = {
  g: { family: 'g', factor: 1 },
  kg: { family: 'g', factor: 1000 },
  ml: { family: 'ml', factor: 1 },
  l: { family: 'ml', factor: 1000 },
};

const LARGER: Record<string, string> = { g: 'kg', ml: 'l' };

function display(name: string, unit: string, quantity: number | null): string {
  const large = LARGER[unit];
  const ingredient: Ingredient =
    quantity !== null && large && quantity >= 1000
      ? { name, unit: large, quantity: quantity / 1000 }
      : { name, unit, quantity };
  return formatIngredient(ingredient);
}

export function buildShoppingList(
  selections: { recipe: Recipe; servings: number | null }[],
): { key: string; label: string }[] {
  const lines = new Map<string, { name: string; unit: string; quantity: number | null }>();
  for (const { recipe, servings } of selections) {
    const factor = servings && recipe.servings ? servings / recipe.servings : 1;
    for (const ingredient of recipe.ingredients) {
      const conversion = CONVERT[ingredient.unit];
      const unit = conversion?.family ?? ingredient.unit;
      const key = `${ingredientKey(ingredient)}|${unit}`;
      const amount = ingredient.quantity === null ? null : ingredient.quantity * factor * (conversion?.factor ?? 1);
      const line = lines.get(key);
      if (!line) lines.set(key, { name: ingredient.name, unit, quantity: amount });
      else if (line.quantity !== null && amount !== null) line.quantity += amount;
    }
  }
  return [...lines].map(([key, line]) => ({ key, label: display(line.name, line.unit, line.quantity) }));
}
