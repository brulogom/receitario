import { ingredientMatches } from './ingredientMatch';

test('compara pelo nome-base do catálogo', () => {
  expect(ingredientMatches('frango', { quantity: 1, unit: 'kg', name: 'peito de frango', base: 'frango' })).toBe(true);
});
test('batata não equivale a batata-doce', () => {
  expect(ingredientMatches('batata', { quantity: 1, unit: '', name: 'batata-doce' })).toBe(false);
});
test('frango não equivale a caldo de frango', () => {
  expect(ingredientMatches('frango', { quantity: 1, unit: '', name: 'caldo de frango' })).toBe(false);
});
test('ignora acentos', () => {
  expect(ingredientMatches('acucar', { quantity: 1, unit: 'xícara', name: 'açúcar' })).toBe(true);
});
test('aceita plural e erro pequeno', () => {
  expect(ingredientMatches('ovos', { quantity: 1, unit: '', name: 'ovo' })).toBe(true);
  expect(ingredientMatches('tomates', { quantity: 1, unit: '', name: 'tomate' })).toBe(true);
  expect(ingredientMatches('cebolla', { quantity: 1, unit: '', name: 'cebola' })).toBe(true);
});
test('palavra curta não aceita erro', () => {
  expect(ingredientMatches('sol', { quantity: null, unit: '', name: 'sal' })).toBe(false);
});
test('leite não equivale a leite condensado', () => {
  expect(ingredientMatches('leite', { quantity: 1, unit: 'lata', name: 'leite condensado', base: 'leite condensado' })).toBe(false);
});
test('nome digitado também vale para receita do catálogo', () => {
  expect(ingredientMatches('peito de frango', { quantity: 1, unit: 'kg', name: 'peito de frango', base: 'frango' })).toBe(true);
});
