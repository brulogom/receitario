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

test('coisas diferentes não se somam, mesmo com o mesmo nome-base', () => {
  expect(
    labels(
      sel([{ quantity: 500, unit: 'g', name: 'peito de frango', base: 'frango' }]),
      sel([{ quantity: 500, unit: 'g', name: 'sobrecoxa de frango', base: 'frango' }]),
    ),
  ).toEqual(['500 g de peito de frango', '500 g de sobrecoxa de frango']);
});

test('singular e plural são a mesma coisa', () => {
  expect(labels(sel([{ quantity: 1, unit: '', name: 'ovo' }]), sel([{ quantity: 2, unit: '', name: 'ovos' }]))).toEqual(['3 ovos']);
  expect(labels(sel([{ quantity: 1, unit: '', name: 'pão francês' }]), sel([{ quantity: 1, unit: '', name: 'pães franceses' }]))).toEqual(['2 pães franceses']);
});

test('converte g e kg', () => {
  expect(labels(sel([{ quantity: 500, unit: 'g', name: 'aipim' }]), sel([{ quantity: 1, unit: 'kg', name: 'aipim' }]))).toEqual(['1,5 kg de aipim']);
});

test('converte ml e l sem arredondar', () => {
  expect(labels(sel([{ quantity: 200, unit: 'ml', name: 'leite' }]), sel([{ quantity: 1, unit: 'l', name: 'leite' }]))).toEqual(['1,2 l de leite']);
});

test('quantidade continua na unidade em que foi escrita', () => {
  expect(labels(sel([{ quantity: 0.05, unit: 'l', name: 'leite' }]))).toEqual(['0,05 l de leite']);
  expect(labels(sel([{ quantity: 0.1, unit: 'kg', name: 'carne' }]))).toEqual(['0,1 kg de carne']);
  expect(labels(sel([{ quantity: 50, unit: 'ml', name: 'leite' }]))).toEqual(['50 ml de leite']);
  expect(labels(sel([{ quantity: 0.1, unit: 'kg', name: 'carne' }]), sel([{ quantity: 0.2, unit: 'kg', name: 'carne' }]))).toEqual(['0,3 kg de carne']);
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

describe('receita que não diz a quantidade', () => {
  const unknown: Ingredient = { quantity: null, unit: '', name: 'ovos' };
  const three: Ingredient = { quantity: 3, unit: '', name: 'ovos' };

  test('não perde a quantidade conhecida, em qualquer ordem', () => {
    expect(labels(sel([unknown]), sel([three]))).toEqual(['3 ovos + quantidade não informada']);
    expect(labels(sel([three]), sel([unknown]))).toEqual(['3 ovos + quantidade não informada']);
  });

  test('avisa quando nenhuma receita diz', () => {
    expect(labels(sel([unknown]))).toEqual(['ovos (quantidade não informada)']);
  });

  test('avisa também quando a outra receita usa outra medida', () => {
    expect(labels(sel([{ quantity: null, unit: '', name: 'açúcar' }]), sel([{ quantity: 2, unit: 'xícara', name: 'açúcar' }]))).toEqual([
      '2 xícaras de açúcar + quantidade não informada',
    ]);
  });
});

test('soma faixas de quantidade', () => {
  expect(labels(sel([{ quantity: 2, quantityMax: 3, unit: '', name: 'ovo' }]), sel([{ quantity: 1, unit: '', name: 'ovo' }]))).toEqual(['3 a 4 ovos']);
});

test('as chaves não mudam com as quantidades, para manter o que já foi marcado', () => {
  const a = buildShoppingList([sel([{ quantity: 1, unit: 'xícara', name: 'açúcar' }])]);
  const b = buildShoppingList([sel([{ quantity: 2, unit: 'xícara', name: 'açúcar' }])]);
  expect(a[0].key).toBe(b[0].key);
});
