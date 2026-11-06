import type { Category, Ingredient, Recipe, RecipeKind } from '../domain/types';

const STAMP = '2026-11-06T00:00:00.000Z';

/** Ingrediente com quantidade. `base` é o nome usado para comparar ("peito de frango" tem base "frango"). */
export function i(quantity: number, unit: string, name: string, base: string = name): Ingredient {
  return { quantity, unit, name, base };
}

/** Ingrediente sem quantidade definida, como "sal a gosto". */
export function g(name: string, base: string = name): Ingredient {
  return { quantity: null, unit: 'a gosto', name, base };
}

type Definition = {
  id: string;
  name: string;
  kind: RecipeKind;
  categories: Category[];
  /** V = vegetariana, L = sem lactose, G = sem glúten. */
  diet?: string;
  minutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
};

export function recipe(def: Definition): Recipe {
  const diet = def.diet ?? '';
  return {
    id: def.id,
    source: 'catalog',
    name: def.name,
    kind: def.kind,
    categories: def.categories,
    diet: { vegetarian: diet.includes('V'), lactoseFree: diet.includes('L'), glutenFree: diet.includes('G') },
    minutes: def.minutes,
    servings: def.servings,
    ingredients: def.ingredients,
    steps: def.steps,
    notes: '',
    videoUrl: '',
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}
