import { ingredientMatches } from './ingredientMatch';
import type { Ingredient, Recipe } from './types';

export const BASICS = ['sal', 'água', 'óleo'];

const isBasic = (ingredient: Ingredient) => BASICS.some((basic) => ingredientMatches(basic, ingredient));

export function whatCanIMake(have: string[], recipes: Recipe[]): { recipe: Recipe; missing: string[] }[] {
  const available = have.map((item) => item.trim()).filter(Boolean);
  if (!available.length) return [];
  return recipes
    .filter((recipe) => recipe.ingredients.length > 0)
    .map((recipe) => ({
      recipe,
      missing: recipe.ingredients
        .filter((ingredient) => !isBasic(ingredient) && !available.some((item) => ingredientMatches(item, ingredient)))
        .map((ingredient) => ingredient.name),
    }))
    .filter(({ recipe, missing }) => missing.length <= 2 && missing.length < recipe.ingredients.length)
    .sort((a, b) => a.missing.length - b.missing.length);
}
