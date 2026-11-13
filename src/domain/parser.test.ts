import { parseIngredientLine, parseIngredientLines, parseRecipeText, parseSteps } from './parser';

describe('parseIngredientLine', () => {
  test('quantidade, unidade no plural e nome', () => {
    expect(parseIngredientLine('2 xícaras de farinha')).toEqual({ quantity: 2, unit: 'xícara', name: 'farinha' });
  });
  test('fração', () => {
    expect(parseIngredientLine('1/2 kg de carne')).toEqual({ quantity: 0.5, unit: 'kg', name: 'carne' });
  });
  test('número misto com "e"', () => {
    expect(parseIngredientLine('1 e 1/2 colher de sopa de manteiga')).toEqual({ quantity: 1.5, unit: 'colher de sopa', name: 'manteiga' });
  });
  test('símbolo de fração, sem unidade', () => {
    expect(parseIngredientLine('½ cebola')).toEqual({ quantity: 0.5, unit: '', name: 'cebola' });
  });
  test('decimal com vírgula e unidade colada', () => {
    expect(parseIngredientLine('1,5kg de aipim')).toEqual({ quantity: 1.5, unit: 'kg', name: 'aipim' });
  });
  test('a gosto', () => {
    expect(parseIngredientLine('sal a gosto')).toEqual({ quantity: null, unit: 'a gosto', name: 'sal' });
  });
  test('linha não reconhecida vira nome inteiro', () => {
    expect(parseIngredientLine('um punhado de amor')).toEqual({ quantity: null, unit: '', name: 'um punhado de amor' });
  });
  test('tira marcador de lista', () => {
    expect(parseIngredientLine('- 3 ovos')).toEqual({ quantity: 3, unit: '', name: 'ovos' });
    expect(parseIngredientLine('• 3 ovos')).toEqual({ quantity: 3, unit: '', name: 'ovos' });
  });
  test('nome que começa como uma unidade não é confundido', () => {
    expect(parseIngredientLine('2 gemas')).toEqual({ quantity: 2, unit: '', name: 'gemas' });
    expect(parseIngredientLine('1 limão')).toEqual({ quantity: 1, unit: '', name: 'limão' });
  });
});

test.each([
  ['1.000 g de farinha', { quantity: 1000, unit: 'g', name: 'farinha' }],
  ['1.500 ml de leite', { quantity: 1500, unit: 'ml', name: 'leite' }],
  ['1.5 l de leite', { quantity: 1.5, unit: 'l', name: 'leite' }],
  ['2 xícaras (chá) de farinha', { quantity: 2, unit: 'xícara', name: 'farinha' }],
  ['1 xícara de chá de açúcar', { quantity: 1, unit: 'xícara', name: 'açúcar' }],
])('quantidades como aparecem em legendas: %s', (line, expected) => {
  expect(parseIngredientLine(line)).toEqual(expected);
});

test.each(['180º por 40 minutos', '10 - 15 minutos no forno', '1.5 litro de água', '30 minutos no forno'])(
  'parseSteps não corta números que fazem parte do passo: %s',
  (step) => {
    expect(parseSteps(step)).toEqual([step]);
  },
);

test('parseSteps tira numeração sem espaço e por extenso', () => {
  expect(parseSteps('1.Misture\n2º Asse\n3 - Sirva')).toEqual(['Misture', 'Asse', 'Sirva']);
});

test('parseIngredientLines ignora linhas vazias', () => {
  expect(parseIngredientLines('2 ovos\n\n  \n1 xícara de leite')).toHaveLength(2);
});

test('parseSteps tira numeração e linhas vazias', () => {
  expect(parseSteps('1. Misture.\n\n2) Asse.\n3 - Sirva.')).toEqual(['Misture.', 'Asse.', 'Sirva.']);
});

test('parseSteps mantém número que faz parte do texto', () => {
  expect(parseSteps('30 minutos no forno')).toEqual(['30 minutos no forno']);
});

describe('parseRecipeText', () => {
  test('legenda com emoji e hashtag não perde linhas', () => {
    const r = parseRecipeText('Bolo fofinho 😍\nIngredientes:\n2 ovos\nModo de preparo:\nMisture\nAsse\n#bolo @fulana');
    expect(r.name).toBe('Bolo fofinho 😍');
    expect(r.ingredients).toHaveLength(1);
    expect(r.steps).toEqual(['Misture', 'Asse']);
    expect(r.unrecognized).toEqual(['#bolo @fulana']);
  });
  test('títulos sem acento e em maiúsculas', () => {
    const r = parseRecipeText('INGREDIENTES\n1 ovo\nCOMO FAZER\nFrite');
    expect(r.ingredients).toEqual([{ quantity: 1, unit: '', name: 'ovo' }]);
    expect(r.steps).toEqual(['Frite']);
  });
  test('texto sem títulos fica todo disponível para conferência', () => {
    const r = parseRecipeText('Bata tudo e asse');
    expect(r.name).toBe('');
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
    expect(r.unrecognized).toEqual(['Bata tudo e asse']);
  });
  test('várias linhas antes dos títulos: a primeira vira nome, as outras não somem', () => {
    const r = parseRecipeText('Pão de queijo\nReceita da vovó!\nIngredientes\n1 ovo');
    expect(r.name).toBe('Pão de queijo');
    expect(r.unrecognized).toEqual(['Receita da vovó!']);
  });
});

test.each([
  ['2 a 3 ovos', { quantity: 2, quantityMax: 3, unit: '', name: 'ovos' }],
  ['2-3 ovos', { quantity: 2, quantityMax: 3, unit: '', name: 'ovos' }],
  ['1 ou 2 xícaras de leite', { quantity: 1, quantityMax: 2, unit: 'xícara', name: 'leite' }],
  ['0,05 l de leite', { quantity: 0.05, unit: 'l', name: 'leite' }],
])('faixa e quantidade pequena: %s', (line, expected) => {
  expect(parseIngredientLine(line)).toEqual(expected);
});

test('"a gosto" depois de um número não vira faixa', () => {
  expect(parseIngredientLine('2 a gosto')).toEqual({ quantity: 2, unit: '', name: 'a gosto' });
});
