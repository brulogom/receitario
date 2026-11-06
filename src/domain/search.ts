import MiniSearch from 'minisearch';
import { ingredientMatches } from './ingredientMatch';
import { normalize } from './text';
import type { Category, Diet, Recipe } from './types';

export type Filters = {
  categories: Category[];
  maxMinutes: number | null;
  diet: (keyof Diet)[];
};

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'em', 'na', 'no']);

function processTerm(term: string): string | null {
  const clean = normalize(term);
  return clean && !STOPWORDS.has(clean) ? clean : null;
}

function passesFilters(recipe: Recipe, filters: Filters): boolean {
  if (filters.categories.length && !filters.categories.some((c) => recipe.categories.includes(c))) return false;
  if (filters.maxMinutes !== null && (recipe.minutes === null || recipe.minutes > filters.maxMinutes)) return false;
  return filters.diet.every((key) => recipe.diet[key]);
}

export function createSearch(recipes: Recipe[]): (query: string, filters: Filters) => Recipe[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const index = new MiniSearch<{ id: string; name: string; ingredients: string }>({
    fields: ['name', 'ingredients'],
    processTerm,
  });
  index.addAll(
    recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients.map((i) => `${i.name} ${i.base ?? ''}`).join(' '),
    })),
  );

  return (query, filters) => {
    let found: Recipe[];
    if (query.includes(',')) {
      const terms = query.split(',').map((term) => term.trim()).filter(Boolean);
      found = recipes.filter((recipe) =>
        terms.every((term) => recipe.ingredients.some((ingredient) => ingredientMatches(term, ingredient))),
      );
    } else if (!query.split(/\s+/).some((word) => processTerm(word))) {
      found = recipes;
    } else {
      found = index
        .search(query, { boost: { name: 3 }, fuzzy: 0.2, prefix: true, combineWith: 'AND' })
        .map((result) => byId.get(String(result.id))!);
    }
    return found.filter((recipe) => passesFilters(recipe, filters));
  };
}
