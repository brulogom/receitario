import { catalog } from '../catalog';
import { aRecipe } from '../storage/testRecipe';
import { createSearch, type Filters } from './search';

const none: Filters = { categories: [], maxMinutes: null, diet: [] };
const search = createSearch(catalog);
const ids = (query: string, filters = none) => search(query, filters).map((r) => r.id);

test('acucar, açúcar e açucar dão o mesmo resultado', () => {
  const expected = ids('açúcar');
  expect(expected.length).toBeGreaterThan(0);
  expect(ids('acucar')).toEqual(expected);
  expect(ids('açucar')).toEqual(expected);
});

test('erro pequeno de digitação ainda encontra', () => {
  expect(ids('brigadeio')).toContain('brigadeiro');
});

test('resultado parcial enquanto digita', () => {
  expect(ids('briga')).toContain('brigadeiro');
});

test('nome pesa mais que ingrediente', () => {
  expect(ids('fubá')[0]).toBe('bolo-de-fuba');
});

test('palavras como "de" não atrapalham', () => {
  expect(ids('bolo de cenoura')[0]).toBe('bolo-de-cenoura');
});

test('com vírgula, a receita precisa ter todos os ingredientes', () => {
  const found = search('frango, cebola', none);
  expect(found.length).toBeGreaterThan(0);
  for (const r of found) {
    const bases = r.ingredients.map((i) => i.base);
    expect(bases).toContain('frango');
    expect(bases).toContain('cebola');
  }
  expect(ids('frango, açúcar')).toEqual([]);
});

test('busca vazia lista tudo', () => {
  expect(search('   ', none)).toHaveLength(catalog.length);
});

test('filtra por categoria', () => {
  const found = search('', { ...none, categories: ['bebidas'] });
  expect(found.length).toBeGreaterThan(0);
  for (const r of found) expect(r.categories).toContain('bebidas');
});

test('filtra por restrição', () => {
  const found = search('', { ...none, diet: ['vegetarian', 'glutenFree'] });
  expect(found.length).toBeGreaterThan(0);
  for (const r of found) expect(r.diet).toMatchObject({ vegetarian: true, glutenFree: true });
});

test('filtro de tempo deixa de fora receita sem tempo', () => {
  const own = createSearch([aRecipe({ id: 'sem-tempo', minutes: null }), aRecipe({ id: 'rapida', minutes: 10 })]);
  expect(own('', { ...none, maxMinutes: 30 }).map((r) => r.id)).toEqual(['rapida']);
});

test('receita sem ingredientes não quebra a busca', () => {
  const own = createSearch([aRecipe({ id: 'vazia', name: 'Só o nome', ingredients: [], steps: [] })]);
  expect(own('nome', none).map((r) => r.id)).toEqual(['vazia']);
  expect(own('ovo, leite', none)).toEqual([]);
});

test('só palavras vazias não some com a lista', () => {
  expect(search('de', none)).toHaveLength(catalog.length);
});
