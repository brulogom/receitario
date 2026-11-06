import { IDBFactory } from 'fake-indexeddb';
import type { Recipe } from '../domain/types';
import { closeDb } from './db';
import { toggleMark, listMarks } from './marks';
import { copyFromCatalog, deleteMine, getMine, listMine, listVersions, restoreVersion, saveMine } from './recipes';
import { aRecipe } from './testRecipe';

beforeEach(() => {
  closeDb();
  globalThis.indexedDB = new IDBFactory();
});

test('salvar pela primeira vez não cria versão', async () => {
  const saved = await saveMine(aRecipe());
  expect(await getMine(saved.id)).toMatchObject({ name: 'Bolo' });
  expect(await listVersions(saved.id)).toEqual([]);
});

test('editar guarda a versão anterior', async () => {
  const first = await saveMine(aRecipe());
  await saveMine({ ...first, name: 'Bolo novo' });
  const versions = await listVersions(first.id);
  expect(versions).toHaveLength(1);
  expect(versions[0].snapshot.name).toBe('Bolo');
  expect((await getMine(first.id))?.name).toBe('Bolo novo');
});

test('guarda no máximo 50 versões, mantendo as mais recentes', async () => {
  let current = await saveMine(aRecipe());
  for (let i = 0; i < 55; i++) current = await saveMine({ ...current, name: `Bolo ${i}` });
  const versions = await listVersions(current.id);
  expect(versions).toHaveLength(50);
  expect(versions[0].snapshot.name).toBe('Bolo 53');
});

test('voltar a uma versão cria nova versão e não apaga as outras', async () => {
  const first = await saveMine(aRecipe());
  const second = await saveMine({ ...first, name: 'Segundo' });
  await saveMine({ ...second, name: 'Terceiro' });
  const before = await listVersions(first.id);
  const oldest = before[before.length - 1];
  const restored = await restoreVersion(oldest.id);
  expect(restored.name).toBe('Bolo');
  const after = await listVersions(first.id);
  expect(after).toHaveLength(3);
  expect(after[0].snapshot.name).toBe('Terceiro');
});

test('copiar do catálogo cria id novo, guarda originId e vira da pessoa', async () => {
  const catalog: Recipe = aRecipe({ id: 'bolo-de-fuba', source: 'catalog' });
  const copy = await copyFromCatalog(catalog);
  expect(copy.id).not.toBe('bolo-de-fuba');
  expect(copy.originId).toBe('bolo-de-fuba');
  expect(copy.source).toBe('mine');
  expect(await listMine()).toHaveLength(1);
});

test('excluir remove receita, histórico e marcações', async () => {
  const first = await saveMine(aRecipe());
  await saveMine({ ...first, name: 'Outro' });
  await toggleMark(first.id, 'favorite');
  await deleteMine(first.id);
  expect(await getMine(first.id)).toBeUndefined();
  expect(await listVersions(first.id)).toEqual([]);
  expect(await listMarks('favorite')).toEqual([]);
});

test('marcar e desmarcar', async () => {
  expect(await toggleMark('x', 'try')).toBe(true);
  expect(await listMarks('try')).toEqual(['x']);
  expect(await toggleMark('x', 'try')).toBe(false);
  expect(await listMarks('try')).toEqual([]);
});

test('a mesma receita pode ser favorita e quero testar ao mesmo tempo', async () => {
  await toggleMark('x', 'try');
  await toggleMark('x', 'favorite');
  expect(await listMarks('try')).toEqual(['x']);
  expect(await listMarks('favorite')).toEqual(['x']);
});
