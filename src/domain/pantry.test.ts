import { aRecipe } from '../storage/testRecipe';
import { whatCanIMake } from './pantry';
import type { Ingredient } from './types';

const ing = (name: string): Ingredient => ({ quantity: 1, unit: '', name });
const withIngredients = (id: string, ...names: string[]) => aRecipe({ id, ingredients: names.map(ing) });

test('sal, água e óleo nunca contam como falta', () => {
  const [result] = whatCanIMake(['ovo'], [withIngredients('a', 'ovo', 'sal', 'água', 'óleo')]);
  expect(result.missing).toEqual([]);
});

test('mostra primeiro o que dá para fazer, depois falta 1, depois falta 2', () => {
  const results = whatCanIMake(
    ['ovo'],
    [withIngredients('dois', 'ovo', 'leite', 'fubá'), withIngredients('zero', 'ovo'), withIngredients('um', 'ovo', 'leite')],
  );
  expect(results.map((r) => r.recipe.id)).toEqual(['zero', 'um', 'dois']);
  expect(results[2].missing).toEqual(['leite', 'fubá']);
});

test('faltando 3 ou mais, a receita não aparece', () => {
  expect(whatCanIMake(['ovo'], [withIngredients('a', 'ovo', 'leite', 'fubá', 'açúcar')])).toEqual([]);
});

test('receita sem ingredientes não aparece como "dá para fazer"', () => {
  expect(whatCanIMake(['ovo'], [withIngredients('vazia')])).toEqual([]);
});

test('sem nada informado, não sugere nada', () => {
  expect(whatCanIMake([], [withIngredients('a', 'ovo')])).toEqual([]);
  expect(whatCanIMake(['  '], [withIngredients('a', 'ovo')])).toEqual([]);
});
