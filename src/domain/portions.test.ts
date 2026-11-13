import { formatIngredient, formatQuantity, scaleQuantity, servingsText } from './portions';

test('scaleQuantity recalcula pela proporção de porções', () => {
  expect(scaleQuantity(2, 4, 6)).toBe(3);
});

test.each([
  [1.5, '1 ½'],
  [0.33, '⅓'],
  [0.25, '¼'],
  [2, '2'],
  [2.95, '2,95'],
  [750, '750'],
  [12.4, '12,4'],
  [0.05, '0,05'],
  [0.1, '0,1'],
  [0.9, '0,9'],
  [1.2, '1,2'],
  [1 / 3, '⅓'],
  [2 + 2 / 3, '2 ⅔'],
])('formatQuantity(%s) = %s', (q, text) => {
  expect(formatQuantity(q)).toBe(text);
});

test.each([
  [{ quantity: 0.05, unit: 'l', name: 'leite' }, '0,05 l de leite'],
  [{ quantity: 0.1, unit: 'kg', name: 'carne' }, '0,1 kg de carne'],
  [{ quantity: 0.5, unit: 'kg', name: 'carne' }, '0,5 kg de carne'],
  [{ quantity: 1.25, unit: 'l', name: 'água' }, '1,25 l de água'],
  [{ quantity: 0.5, unit: 'xícara', name: 'leite' }, '½ xícara de leite'],
])('quantidade pequena continua como é: %o', (ingredient, text) => {
  expect(formatIngredient(ingredient)).toBe(text);
});

test.each([
  [{ quantity: 2, quantityMax: 3, unit: '', name: 'ovo' }, '2 a 3 ovos'],
  [{ quantity: 2, unit: '', name: 'limão' }, '2 limões'],
  [{ quantity: 2, unit: '', name: 'pão francês' }, '2 pães franceses'],
  [{ quantity: 3, unit: '', name: 'maçã' }, '3 maçãs'],
  [{ quantity: 1, unit: '', name: 'gemas' }, '1 gema'],
  [{ quantity: 1, quantityMax: 2, unit: 'xícara', name: 'leite' }, '1 a 2 xícaras de leite'],
])('plural correto: %o', (ingredient, text) => {
  expect(formatIngredient(ingredient)).toBe(text);
});

test('faixa acompanha o ajuste de quantidade', () => {
  expect(formatIngredient({ quantity: 2, quantityMax: 3, unit: '', name: 'ovo' }, 2)).toBe('4 a 6 ovos');
});

test.each([
  ['docinho', 1, 'Rende 1 docinho'],
  ['docinho', 20, 'Rende 20 docinhos'],
  ['docinhos', 1, 'Rende 1 docinho'],
  ['docinhos', 20, 'Rende 20 docinhos'],
  ['Pessoa', 4, 'Serve 4 pessoas'],
  ['pão de queijo', 12, 'Rende 12 pães de queijo'],
])('unidade digitada "%s" com %s', (servingsUnit, servings, text) => {
  expect(servingsText({ servings, servingsUnit })).toBe(text);
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

test.each([
  [{ servings: 4, servingsUnit: undefined }, 'Serve 4 pessoas'],
  [{ servings: 1.5, servingsUnit: 'pessoas' }, 'Serve 1,5 pessoa'],
  [{ servings: 20, servingsUnit: 'docinhos' }, 'Rende 20 docinhos'],
  [{ servings: 1, servingsUnit: 'fatias' }, 'Rende 1 fatia'],
  [{ servings: 1, servingsUnit: 'pães de queijo' }, 'Rende 1 pão de queijo'],
  [{ servings: 1, servingsUnit: 'quindins' }, 'Rende 1 quindim'],
  [{ servings: null, servingsUnit: 'fatias' }, ''],
])('servingsText de %o', (recipe, expected) => {
  expect(servingsText(recipe)).toBe(expected);
});
