import { aRecipe } from '../storage/testRecipe';
import { buildShoppingList } from './shopping';
import type { Ingredient } from './types';

const sel = (ingredients: Ingredient[], servings: number | null = 8) => ({ recipe: aRecipe({ ingredients, servings: 8 }), servings });
const labels = (...selections: ReturnType<typeof sel>[]) => buildShoppingList(selections).map((item) => item.label);

test('soma ingredientes iguais', () => {
  expect(
    labels(sel([{ quantity: 2, unit: 'xícara', name: 'açúcar' }]), sel([{ quantity: 1, unit: 'xícara', name: 'açucar' }])),
  ).toEqual(['3 xícaras de açúcar']);
});

test('soma pelo nome-base', () => {
  expect(
    labels(
      sel([{ quantity: 500, unit: 'g', name: 'peito de frango', base: 'frango' }]),
      sel([{ quantity: 500, unit: 'g', name: 'frango', base: 'frango' }]),
    ),
  ).toEqual(['1 kg de peito de frango']);
});

test('converte g e kg', () => {
  expect(labels(sel([{ quantity: 500, unit: 'g', name: 'aipim' }]), sel([{ quantity: 1, unit: 'kg', name: 'aipim' }]))).toEqual(['1 ½ kg de aipim']);
});

test('converte ml e l', () => {
  expect(labels(sel([{ quantity: 200, unit: 'ml', name: 'leite' }]), sel([{ quantity: 1, unit: 'l', name: 'leite' }]))).toEqual(['1 ¼ l de leite']);
});

test('não converte xícara para grama: linhas separadas', () => {
  expect(labels(sel([{ quantity: 1, unit: 'xícara', name: 'açúcar' }]), sel([{ quantity: 100, unit: 'g', name: 'açúcar' }]))).toEqual([
    '1 xícara de açúcar',
    '100 g de açúcar',
  ]);
});

test('respeita as porções escolhidas', () => {
  expect(labels(sel([{ quantity: 2, unit: 'xícara', name: 'açúcar' }], 16))).toEqual(['4 xícaras de açúcar']);
});

test('receita sem porções usa as quantidades como estão', () => {
  const recipe = aRecipe({ servings: null, ingredients: [{ quantity: 2, unit: '', name: 'ovo' }] });
  expect(buildShoppingList([{ recipe, servings: null }]).map((i) => i.label)).toEqual(['2 ovos']);
});

test('"a gosto" aparece uma vez, sem quantidade', () => {
  const salt: Ingredient = { quantity: null, unit: 'a gosto', name: 'sal' };
  expect(labels(sel([salt]), sel([salt]))).toEqual(['sal a gosto']);
});

test('as chaves não mudam com as quantidades, para manter o que já foi marcado', () => {
  const a = buildShoppingList([sel([{ quantity: 1, unit: 'xícara', name: 'açúcar' }])]);
  const b = buildShoppingList([sel([{ quantity: 2, unit: 'xícara', name: 'açúcar' }])]);
  expect(a[0].key).toBe(b[0].key);
});
