import { formatIngredient, formatQuantity, scaleQuantity } from './portions';

test('scaleQuantity recalcula pela proporção de porções', () => {
  expect(scaleQuantity(2, 4, 6)).toBe(3);
});

test.each([
  [1.5, '1 ½'],
  [0.33, '⅓'],
  [0.25, '¼'],
  [2, '2'],
  [2.95, '3'],
  [750, '750'],
  [12.4, '12'],
])('formatQuantity(%s) = %s', (q, text) => {
  expect(formatQuantity(q)).toBe(text);
});

test('unidade vai para o plural a partir de 2', () => {
  expect(formatIngredient({ quantity: 2, unit: 'xícara', name: 'açúcar' })).toBe('2 xícaras de açúcar');
  expect(formatIngredient({ quantity: 2, unit: 'colher de sopa', name: 'óleo' })).toBe('2 colheres de sopa de óleo');
});

test('ingrediente sem unidade vai para o plural', () => {
  expect(formatIngredient({ quantity: 3, unit: '', name: 'ovo' })).toBe('3 ovos');
  expect(formatIngredient({ quantity: 1, unit: '', name: 'ovo' })).toBe('1 ovo');
});

test('quantidade fracionária mantém o singular', () => {
  expect(formatIngredient({ quantity: 1, unit: 'xícara', name: 'leite' }, 1.5)).toBe('1 ½ xícara de leite');
});

test('ingrediente sem quantidade não é recalculado', () => {
  expect(formatIngredient({ quantity: null, unit: 'a gosto', name: 'sal' }, 2)).toBe('sal a gosto');
  expect(formatIngredient({ quantity: null, unit: '', name: 'um punhado de amor' })).toBe('um punhado de amor');
});

test('kg e g não mudam no plural', () => {
  expect(formatIngredient({ quantity: 500, unit: 'g', name: 'feijão preto' })).toBe('500 g de feijão preto');
});
