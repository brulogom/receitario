import { aRecipe } from '../storage/testRecipe';
import { aisleOf } from './aisles';
import { cookedSummary, cookedText } from './cooked';
import { addDays, dateKey, dayLabel, isDateKey, shortDate } from './dates';
import { mergeSelections, planSelections } from './plan';
import { createSearch, type Filters } from './search';
import { allTags, parseTags } from './tags';
import type { CookedEntry, PlanEntry } from './types';

describe('datas', () => {
  test('dia local, sem virar o dia à noite', () => {
    expect(dateKey(new Date(2026, 10, 13, 23, 30))).toBe('2026-11-13');
  });

  test('somar dias atravessa mês e ano', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('nomes curtos dos dias', () => {
    expect(dayLabel('2026-11-13', '2026-11-13')).toBe('Hoje');
    expect(dayLabel('2026-11-14', '2026-11-13')).toBe('Amanhã');
    expect(dayLabel('2026-11-12', '2026-11-13')).toBe('Ontem');
    expect(dayLabel('2026-11-16', '2026-11-13')).toBe('seg. 16/11');
    expect(shortDate('2025-02-01', '2026-11-13')).toBe('01/02/2025');
  });

  test('reconhece só datas que existem', () => {
    expect(isDateKey('2026-02-28')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('13/11/2026')).toBe(false);
  });
});

describe('plano da semana', () => {
  const bolo = aRecipe({ id: 'bolo', servings: 8 });
  const sopa = aRecipe({ id: 'sopa', servings: null });
  const entry = (recipeId: string, servings: number | null, date = '2026-11-13'): PlanEntry => ({
    id: `${recipeId}-${date}`,
    date,
    meal: 'almoco',
    recipeId,
    servings,
  });

  test('a mesma receita em dois dias soma os rendimentos', () => {
    expect(planSelections([entry('bolo', 8), entry('bolo', 4, '2026-11-14')], [bolo])).toEqual([{ recipeId: 'bolo', servings: 12 }]);
  });

  test('sem rendimento escolhido, usa o da receita; receita sem rendimento fica sem número', () => {
    expect(planSelections([entry('bolo', null), entry('sopa', null)], [bolo, sopa])).toEqual([
      { recipeId: 'bolo', servings: 8 },
      { recipeId: 'sopa', servings: null },
    ]);
  });

  test('receita excluída não vai para a lista', () => {
    expect(planSelections([entry('sumiu', 2)], [bolo])).toEqual([]);
  });

  test('juntar com a lista atual troca a mesma receita e mantém as outras', () => {
    expect(
      mergeSelections(
        [{ recipeId: 'bolo', servings: 8 }, { recipeId: 'pao', servings: 2 }],
        [{ recipeId: 'bolo', servings: 16 }, { recipeId: 'sopa', servings: null }],
      ),
    ).toEqual([
      { recipeId: 'bolo', servings: 16 },
      { recipeId: 'pao', servings: 2 },
      { recipeId: 'sopa', servings: null },
    ]);
  });
});

describe('Fiz hoje', () => {
  const cooked = (date: string, rating: number | null): CookedEntry => ({ id: date, recipeId: 'r1', date, rating, comment: '', at: date });

  test('conta, guarda a última vez e faz a média só das notas dadas', () => {
    const summary = cookedSummary([cooked('2026-11-02', 5), cooked('2026-10-01', null), cooked('2026-10-20', 4)]);
    expect(summary).toEqual({ count: 3, last: '2026-11-02', rating: 4.5 });
    expect(cookedText(summary, '2026-11-13')).toBe('Feita 3 vezes · última em 02/11');
  });

  test('nunca feita não mostra nada', () => {
    expect(cookedText(cookedSummary([]), '2026-11-13')).toBe('');
    expect(cookedText(cookedSummary([cooked('2026-11-02', null)]), '2026-11-13')).toBe('Feita 1 vez · última em 02/11');
  });
});

describe('etiquetas', () => {
  test('separa por vírgula, tira # e não repete', () => {
    expect(parseTags('Natal, #rápida,  natal ,, da   vó')).toEqual(['Natal', 'rápida', 'da vó']);
    expect(parseTags('Rapida, rápida')).toEqual(['Rapida']);
  });

  test('lista as etiquetas das mais usadas para as menos usadas', () => {
    const recipes = [aRecipe({ id: 'a', tags: ['Natal', 'fácil'] }), aRecipe({ id: 'b', tags: ['natal'] }), aRecipe({ id: 'c' })];
    expect(allTags(recipes)).toEqual(['Natal', 'fácil']);
  });

  test('busca filtra e encontra por etiqueta', () => {
    const none: Filters = { categories: [], maxMinutes: null, diet: [] };
    const search = createSearch([aRecipe({ id: 'a', name: 'Rabanada', tags: ['Natal'] }), aRecipe({ id: 'b', name: 'Pavê' })]);
    expect(search('', { ...none, tags: ['natal'] }).map((r) => r.id)).toEqual(['a']);
    expect(search('natal', none).map((r) => r.id)).toEqual(['a']);
  });
});

describe('seções do mercado', () => {
  test.each([
    ['tomate', 'hortifruti'],
    ['molho de tomate', 'mercearia'],
    ['peito de frango', 'carnes'],
    ['peito de peru', 'frios'],
    ['ovos', 'frios'],
    ['leite', 'frios'],
    ['leite condensado', 'mercearia'],
    ['creme de leite', 'frios'],
    ['farinha de trigo', 'mercearia'],
    ['pães franceses', 'padaria'],
    ['Açúcar', 'mercearia'],
    ['sal a gosto', 'temperos'],
    ['pimenta-do-reino', 'temperos'],
    ['coco ralado', 'mercearia'],
    ['suco de laranja', 'bebidas'],
    ['água morna', 'outros'],
  ])('%s fica em %s', (name, aisle) => {
    expect(aisleOf(name)).toBe(aisle);
  });
});
