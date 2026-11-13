import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { exportBackup, importBackup } from './backup';
import { closeDb, openDb } from './db';
import { createCollection, deleteCollection, listCollections, renameCollection, toggleInCollection } from './collections';
import { addCooked, deleteCooked, listCooked } from './cooked';
import { addToPlan, listPlan, removeFromPlan, setPlanServings } from './plan';
import { deleteMine, getMine, saveMine } from './recipes';
import { getShopping, setShopping } from './shopping';
import { aRecipe } from './testRecipe';

function resetDb() {
  closeDb();
  globalThis.indexedDB = new IDBFactory();
}

beforeEach(resetDb);

test('o banco antigo ganha as lojas novas sem perder receitas', async () => {
  const old = await openDB('receitario', 1, {
    upgrade(db) {
      db.createObjectStore('recipes', { keyPath: 'id' });
      db.createObjectStore('versions', { keyPath: 'id' }).createIndex('recipeId', 'recipeId');
      const marks = db.createObjectStore('marks', { keyPath: 'key' });
      marks.createIndex('kind', 'kind');
      marks.createIndex('recipeId', 'recipeId');
      db.createObjectStore('shopping');
    },
  });
  await old.put('recipes', aRecipe());
  old.close();

  expect((await getMine('r1'))?.name).toBe('Bolo');
  const db = await openDb();
  expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(['plan', 'cooked', 'collections']));
});

test('plano: lista por intervalo de dias, muda rendimento e tira', async () => {
  const first = await addToPlan({ date: '2026-11-13', meal: 'almoco', recipeId: 'r1', servings: 4 });
  await addToPlan({ date: '2026-11-20', meal: 'jantar', recipeId: 'r1', servings: null });
  await addToPlan({ date: '2026-11-21', meal: 'jantar', recipeId: 'r1', servings: null });

  expect((await listPlan('2026-11-13', '2026-11-20')).map((entry) => entry.date).sort()).toEqual(['2026-11-13', '2026-11-20']);
  await setPlanServings(first.id, 6);
  expect((await listPlan('2026-11-13', '2026-11-13'))[0].servings).toBe(6);
  await removeFromPlan(first.id);
  expect(await listPlan('2026-11-13', '2026-11-13')).toEqual([]);
});

test('Fiz hoje: guarda e apaga registros', async () => {
  const entry = await addCooked({ recipeId: 'r1', date: '2026-11-13', rating: 5, comment: '  menos açúcar ' });
  expect(await listCooked()).toEqual([entry]);
  expect(entry.comment).toBe('menos açúcar');
  await deleteCooked(entry.id);
  expect(await listCooked()).toEqual([]);
});

test('coleções: criar, pôr e tirar receita, renomear e excluir', async () => {
  const natal = await createCollection(' Ceia de Natal ');
  await createCollection('Almoço de domingo');
  await toggleInCollection(natal.id, 'r1');
  await toggleInCollection(natal.id, 'r2');
  await toggleInCollection(natal.id, 'r1');
  await renameCollection(natal.id, 'Natal');

  const all = await listCollections();
  expect(all.map((collection) => collection.name)).toEqual(['Almoço de domingo', 'Natal']);
  expect(all[1].recipeIds).toEqual(['r2']);
  await deleteCollection(natal.id);
  expect((await listCollections()).map((collection) => collection.name)).toEqual(['Almoço de domingo']);
});

test('excluir a receita tira ela do plano, dos registros e das coleções', async () => {
  await saveMine(aRecipe());
  await addToPlan({ date: '2026-11-13', meal: 'almoco', recipeId: 'r1', servings: null });
  await addToPlan({ date: '2026-11-13', meal: 'jantar', recipeId: 'outra', servings: null });
  await addCooked({ recipeId: 'r1', date: '2026-11-13', rating: null, comment: '' });
  const collection = await createCollection('Natal', ['r1', 'outra']);

  await deleteMine('r1');

  expect((await listPlan('2026-11-13', '2026-11-13')).map((entry) => entry.recipeId)).toEqual(['outra']);
  expect(await listCooked()).toEqual([]);
  expect((await listCollections()).find((item) => item.id === collection.id)?.recipeIds).toEqual(['outra']);
});

test('o backup leva plano, registros, coleções, etiquetas e seções corrigidas', async () => {
  await saveMine(aRecipe({ tags: ['Natal'] }));
  await addToPlan({ date: '2026-11-13', meal: 'almoco', recipeId: 'r1', servings: 8 });
  await addCooked({ recipeId: 'r1', date: '2026-11-13', rating: 4, comment: 'boa' });
  await createCollection('Natal', ['r1']);
  await setShopping({ selections: [], checked: [], sections: { acucar: 'padaria' } });
  const json = await exportBackup();

  resetDb();
  await importBackup(json);

  expect((await getMine('r1'))?.tags).toEqual(['Natal']);
  expect(await listPlan('2026-11-13', '2026-11-13')).toHaveLength(1);
  expect((await listCooked())[0]).toMatchObject({ rating: 4, comment: 'boa' });
  expect((await listCollections())[0]).toMatchObject({ name: 'Natal', recipeIds: ['r1'] });
  expect((await getShopping()).sections).toEqual({ acucar: 'padaria' });
});

test('importar uma coleção que já existe junta as receitas das duas cópias', async () => {
  const collection = await createCollection('Natal', ['r1']);
  const json = await exportBackup();
  await toggleInCollection(collection.id, 'r2');
  await toggleInCollection(collection.id, 'r1');

  await importBackup(json);

  expect((await listCollections())[0].recipeIds.sort()).toEqual(['r1', 'r2']);
});

test('backup com registro de data inválida é recusado inteiro', async () => {
  const json = JSON.stringify({
    format: 'receitario-backup',
    version: 2,
    recipes: [],
    versions: [],
    marks: [],
    shopping: null,
    cooked: [{ id: 'c', recipeId: 'r1', date: '2026-02-30', rating: null, comment: '', at: 'x' }],
  });
  await expect(importBackup(json)).rejects.toThrow('não é um backup válido');
});
