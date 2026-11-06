import type { Recipe } from '../domain/types';

export function aRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    source: 'mine',
    name: 'Bolo',
    kind: 'doce',
    categories: ['bolos'],
    diet: { vegetarian: true, lactoseFree: false, glutenFree: false },
    minutes: 40,
    servings: 8,
    ingredients: [{ quantity: 2, unit: 'xícara', name: 'açúcar' }],
    steps: ['Misture.', 'Asse por 30 minutos.'],
    notes: '',
    videoUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
