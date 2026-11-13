import { linesFromPieces, type TextPiece } from './bookLines';
import { parseBook, type BookPage } from './bookParser';

const page = (number: number, ...texts: (string | [string, number])[]): BookPage => ({
  page: number,
  lines: texts.map((item) => (typeof item === 'string' ? { text: item, size: 10 } : { text: item[0], size: item[1] })),
});

const simple = page(
  10,
  ['Bolo de Teste', 16],
  'INGREDIENTES',
  '2 xícaras de farinha',
  '1 maçã picada (deixar de molho na água',
  'com limão)',
  'MODO DE PREPARO',
  'Misture tudo no liqui-',
  'dificador. Asse por 30 minutos.',
  'RENDIMENTO: 12 fatias.',
  'DICA: Sirva mor-',
  'no.',
);

test('separa nome, ingredientes, passos, rendimento e dica', () => {
  expect(parseBook([simple])).toEqual([
    {
      name: 'Bolo de Teste',
      page: 10,
      ingredients: ['2 xícaras de farinha', '1 maçã picada (deixar de molho na água com limão)'],
      steps: ['Misture tudo no liquidificador.', 'Asse por 30 minutos.'],
      servings: 12,
      servingsUnit: 'fatias',
      notes: 'DICA: Sirva morno.',
      complete: true,
    },
  ]);
});

test('não inventa: o que o livro não diz fica vazio', () => {
  const [recipe] = parseBook([page(1, ['Sem Rendimento', 16], 'Ingredientes', 'sal', 'Modo de preparo', 'Misture.')]);
  expect(recipe).toMatchObject({ servings: null, servingsUnit: '', notes: '' });
});

test('faixa de rendimento fica nas anotações, como no livro', () => {
  const [recipe] = parseBook([page(1, ['Receita', 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', 'Misture.', 'RENDIMENTO: 8 a 10 porções.')]);
  expect(recipe).toMatchObject({ servings: null, notes: 'Rendimento no livro: 8 a 10 porções.' });
});

test('várias receitas, atravessando páginas', () => {
  const recipes = parseBook([
    page(1, ['Primeira', 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', 'Misture bem e'),
    page(2, 'leve ao fogo.', ['Segunda', 16], 'INGREDIENTES', 'açúcar', 'MODO DE PREPARO', 'Mexa.'),
  ]);
  expect(recipes.map((r) => [r.name, r.page, r.steps])).toEqual([
    ['Primeira', 1, ['Misture bem e leve ao fogo.']],
    ['Segunda', 2, ['Mexa.']],
  ]);
});

test('o nome de capítulo acima do nome da receita não vira o nome', () => {
  const [recipe] = parseBook([page(1, ['Molhos', 24], ['Molho Verde', 16], 'INGREDIENTES', 'salsa', 'MODO DE PREPARO', 'Bata.')]);
  expect(recipe.name).toBe('Molho Verde');
});

test('sem diferença de letra, usa a linha logo acima (arquivo de texto)', () => {
  const lines = ['Capítulo', 'Pão Simples', 'Ingredientes', 'farinha', 'Modo de preparo', 'Asse.'].map((text) => ({ text, size: 0 }));
  expect(parseBook([{ page: null, lines }])[0]).toMatchObject({ name: 'Pão Simples', page: null, complete: true });
});

test('massa e recheio com títulos próprios são uma receita só', () => {
  const recipes = parseBook([
    page(
      1,
      ['Rocambole', 16],
      'INGREDIENTES',
      'farinha',
      'MODO DE PREPARO',
      'Faça a massa e abra.',
      'INGREDIENTES',
      'frango',
      'MODO DE PREPARO',
      'Cozinhe o frango.',
    ),
  ]);
  expect(recipes).toHaveLength(1);
  expect(recipes[0]).toMatchObject({ ingredients: ['farinha', 'frango'], steps: ['Faça a massa e abra.', 'Cozinhe o frango.'] });
});

test('passos numerados continuam separados', () => {
  const [recipe] = parseBook([page(1, ['Receita', 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', '1. Misture o sal', 'na água;', '2. Ferva.')]);
  expect(recipe.steps).toEqual(['Misture o sal na água;', 'Ferva.']);
});

test('título grande depois do preparo encerra a receita', () => {
  const [recipe] = parseBook([page(1, ['Receita', 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', 'Misture.', ['Referências', 20], 'BRASIL. Ministério.')]);
  expect(recipe.steps).toEqual(['Misture.']);
});

test('cabeçalhos repetidos e números de página saem do texto', () => {
  const recipes = parseBook([
    page(1, 'Meu Livro de Teste', ['Um', 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', 'Faça.', '11'),
    page(2, 'Meu Livro de Teste', ['Dois', 16], 'INGREDIENTES', 'açúcar', 'MODO DE PREPARO', 'Mexa.', '12'),
    page(3, 'Meu Livro de Teste', ['Três', 16], 'INGREDIENTES', 'mel', 'MODO DE PREPARO', 'Bata.', '13'),
  ]);
  expect(recipes.map((r) => r.steps)).toEqual([['Faça.'], ['Mexa.'], ['Bata.']]);
});

describe('pede conferência', () => {
  const base = (steps: string[], name = 'Receita') => parseBook([page(1, [name, 16], 'INGREDIENTES', 'sal', 'MODO DE PREPARO', ...steps)])[0];

  test('sem ingredientes ou sem preparo', () => {
    expect(parseBook([page(1, ['Receita', 16], 'INGREDIENTES', 'MODO DE PREPARO', 'Faça.')])[0].complete).toBe(false);
    expect(parseBook([page(1, ['Receita', 16], 'INGREDIENTES', 'sal')])[0].complete).toBe(false);
  });

  test('colunas misturadas no mesmo passo', () => {
    expect(base(['1. Bata o ovo e 5. Misture a farinha;', '2. Asse.']).complete).toBe(false);
  });

  test('nome com letras ilegíveis', () => {
    expect(base(['Faça.'], 'Fʝə').complete).toBe(false);
  });

  test('acentos e letras de outras línguas não pedem conferência', () => {
    expect(base(['Faça.'], 'Sopa de shōyu à moda crème').complete).toBe(true);
  });

  test('texto longo demais para uma receita', () => {
    expect(base(Array.from({ length: 60 }, (_, index) => `${index + 1}. Passo número.`)).complete).toBe(false);
  });
});

describe('leitura da página do PDF', () => {
  const piece = (text: string, x: number, y: number, width = 50, height = 10): TextPiece => ({ text, x, y, width, height });

  test('ordena de cima para baixo e da esquerda para a direita', () => {
    const lines = linesFromPieces([piece('baixo', 0, 100), piece('direita', 60, 200), piece('cima', 0, 200)]);
    expect(lines.map((line) => line.text)).toEqual(['cima direita', 'baixo']);
  });

  test('lê uma coluna inteira antes da outra', () => {
    const lines = linesFromPieces([piece('A1', 10, 200), piece('B1', 320, 200), piece('A2', 10, 180), piece('B2', 320, 180)], 600);
    expect(lines.map((line) => line.text)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  test('guarda o tamanho da letra', () => {
    expect(linesFromPieces([piece('Título', 0, 200, 50, 18)])).toEqual([{ text: 'Título', size: 18 }]);
  });
});
