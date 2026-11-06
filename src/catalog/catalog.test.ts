import { normalize } from '../domain/text';
import { catalog } from './index';

const names = (r: (typeof catalog)[number]) =>
  r.ingredients.map((i) => normalize(`${i.name} ${i.base ?? ''}`).replaceAll('leite de coco', 'coco'));
const has = (r: (typeof catalog)[number], terms: string[]) =>
  names(r).find((n) => terms.some((t) => new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(n)));

test('tem o tamanho previsto, com doces e salgados equilibrados', () => {
  expect(catalog.length).toBeGreaterThanOrEqual(55);
  const doces = catalog.filter((r) => r.kind === 'doce').length / catalog.length;
  expect(doces).toBeGreaterThanOrEqual(0.4);
  expect(doces).toBeLessThanOrEqual(0.6);
});

test('ids são únicos e em kebab-case', () => {
  const ids = catalog.map((r) => r.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test.each(catalog.map((r) => [r.id, r] as const))('%s está completa', (_id, r) => {
  expect(r.source).toBe('catalog');
  expect(r.name).toBeTruthy();
  expect(r.ingredients.length).toBeGreaterThan(1);
  expect(r.steps.length).toBeGreaterThan(1);
  expect(r.minutes).toBeGreaterThan(0);
  expect(r.servings).toBeGreaterThan(0);
  expect(r.categories.length).toBeGreaterThan(0);
  for (const i of r.ingredients) {
    expect(i.name).not.toMatch(/^\d/);
    expect(i.base, `${r.id}: ${i.name} sem base`).toBeTruthy();
  }
});

const MEAT = ['carne', 'carne-seca', 'carne moida', 'frango', 'bacon', 'peixe', 'bacalhau', 'camarao', 'linguica', 'atum', 'presunto', 'sardinha', 'paio', 'costelinha', 'calabresa', 'charque', 'peito', 'coxa', 'salsicha', 'lombo', 'alcatra', 'acem', 'patinho', 'maminha', 'file'];
const DAIRY = ['leite', 'leite condensado', 'manteiga', 'queijo', 'queijo ralado', 'creme de leite', 'requeijao', 'iogurte', 'catupiry', 'doce de leite'];
const GLUTEN = ['farinha de trigo', 'macarrao', 'pao', 'pao de forma', 'biscoito', 'fermento biologico', 'farinha de rosca', 'massa de lasanha', 'massa', 'espaguete', 'trigo'];

test.each(catalog.filter((r) => r.diet.vegetarian).map((r) => [r.id, r] as const))('%s: vegetariana sem carne', (_id, r) => {
  expect(has(r, MEAT)).toBeUndefined();
});
test.each(catalog.filter((r) => r.diet.lactoseFree).map((r) => [r.id, r] as const))('%s: sem lactose de verdade', (_id, r) => {
  expect(has(r, DAIRY)).toBeUndefined();
});
test.each(catalog.filter((r) => r.diet.glutenFree).map((r) => [r.id, r] as const))('%s: sem glúten de verdade', (_id, r) => {
  expect(has(r, GLUTEN)).toBeUndefined();
});

test('a categoria vegetariano bate com a marcação', () => {
  for (const r of catalog) {
    if (r.categories.includes('vegetariano')) expect(r.diet.vegetarian).toBe(true);
  }
});
