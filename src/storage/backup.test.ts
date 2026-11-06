import { IDBFactory } from 'fake-indexeddb';
import { InvalidBackupError, exportBackup, importBackup } from './backup';
import { closeDb, openDb } from './db';
import { listMarks, toggleMark } from './marks';
import { getMine, listMine, listVersions, saveMine } from './recipes';
import { getShopping, setShopping } from './shopping';
import { aRecipe } from './testRecipe';

function resetDb() {
  closeDb();
  globalThis.indexedDB = new IDBFactory();
}

beforeEach(resetDb);

test('exportar e importar em banco vazio restaura tudo', async () => {
  const saved = await saveMine(aRecipe());
  await saveMine({ ...saved, name: 'Editado' });
  await toggleMark(saved.id, 'favorite');
  await setShopping({ selections: [{ recipeId: saved.id, servings: 4 }], checked: ['acucar|xícara'] });
  const json = await exportBackup();

  resetDb();
  const result = await importBackup(json);

  expect(result).toEqual({ added: 1, updated: 0, kept: 0 });
  expect((await getMine(saved.id))?.name).toBe('Editado');
  expect(await listVersions(saved.id)).toHaveLength(1);
  expect(await listMarks('favorite')).toEqual([saved.id]);
  expect((await getShopping()).checked).toEqual(['acucar|xícara']);
});

test('a foto sobrevive ao backup', async () => {
  const bytes = new Uint8Array([1, 2, 3, 250]);
  await saveMine(aRecipe({ photo: new Blob([bytes], { type: 'image/jpeg' }) }));
  const json = await exportBackup();
  resetDb();
  await importBackup(json);
  const photo = (await getMine('r1'))?.photo;
  expect(photo?.type).toBe('image/jpeg');
  expect(new Uint8Array(await photo!.arrayBuffer())).toEqual(bytes);
});

test('importar nunca apaga receita que só existe no aparelho', async () => {
  await saveMine(aRecipe({ id: 'do-backup' }));
  const json = await exportBackup();
  resetDb();
  await saveMine(aRecipe({ id: 'so-aqui', name: 'Só aqui' }));
  await importBackup(json);
  expect((await listMine()).map((r) => r.id).sort()).toEqual(['do-backup', 'so-aqui']);
});

async function putDirect(name: string, updatedAt: string) {
  const db = await openDb();
  await db.put('recipes', aRecipe({ name, updatedAt }));
}

test('backup mais recente vence e a versão do aparelho vai para o histórico', async () => {
  await putDirect('Do backup', '2026-06-01T00:00:00.000Z');
  const json = await exportBackup();
  resetDb();
  await putDirect('Do aparelho', '2026-01-01T00:00:00.000Z');
  const result = await importBackup(json);
  expect(result).toEqual({ added: 0, updated: 1, kept: 0 });
  expect((await getMine('r1'))?.name).toBe('Do backup');
  expect((await listVersions('r1'))[0].snapshot.name).toBe('Do aparelho');
});

test('aparelho mais recente vence e a versão do backup vai para o histórico', async () => {
  await putDirect('Do backup', '2026-01-01T00:00:00.000Z');
  const json = await exportBackup();
  resetDb();
  await putDirect('Do aparelho', '2026-06-01T00:00:00.000Z');
  const result = await importBackup(json);
  expect(result).toEqual({ added: 0, updated: 0, kept: 1 });
  expect((await getMine('r1'))?.name).toBe('Do aparelho');
  expect((await listVersions('r1'))[0].snapshot.name).toBe('Do backup');
});

test('importar o mesmo backup duas vezes não duplica o histórico', async () => {
  const saved = await saveMine(aRecipe());
  await saveMine({ ...saved, name: 'Editado' });
  const json = await exportBackup();
  await importBackup(json);
  await importBackup(json);
  expect(await listMine()).toHaveLength(1);
  expect(await listVersions(saved.id)).toHaveLength(1);
});

const goodRecipe = () => aRecipe({ id: 'novo' });
const fileWith = (fields: object, recipe: object = goodRecipe()) =>
  JSON.stringify({ format: 'receitario-backup', version: 1, recipes: [recipe], versions: [], marks: [], shopping: null, ...fields });

test.each([
  ['compras sem a lista de receitas', fileWith({ shopping: { checked: [] } })],
  ['compras sem os itens marcados', fileWith({ shopping: { selections: [] } })],
  ['ingrediente em texto', fileWith({}, { ...goodRecipe(), ingredients: ['2 ovos'] })],
  ['ingrediente sem nome', fileWith({}, { ...goodRecipe(), ingredients: [{ quantity: 1, unit: '' }] })],
  ['quantidade em texto', fileWith({}, { ...goodRecipe(), ingredients: [{ quantity: '1', unit: '', name: 'ovo' }] })],
  ['passo que não é texto', fileWith({}, { ...goodRecipe(), steps: [1] })],
  ['sem categorias', fileWith({}, { ...goodRecipe(), categories: undefined })],
  ['sem restrições', fileWith({}, { ...goodRecipe(), diet: undefined })],
  ['origem que não é da pessoa', fileWith({}, { ...goodRecipe(), source: undefined })],
  ['tipo desconhecido', fileWith({}, { ...goodRecipe(), kind: 'azedo' })],
  ['porções em texto', fileWith({}, { ...goodRecipe(), servings: 'quatro' })],
  ['marcação de tipo desconhecido', fileWith({ marks: [{ key: 'x', kind: 'outro', recipeId: 'novo', at: '2026-01-01' }] })],
])('conteúdo corrompido é recusado por inteiro: %s', async (_name, json) => {
  await saveMine(aRecipe());
  await expect(importBackup(json)).rejects.toBeInstanceOf(InvalidBackupError);
  expect((await listMine()).map((r) => r.id)).toEqual(['r1']);
});

test.each([
  ['não é json'],
  ['{}'],
  ['null'],
  ['{"format":"outro"}'],
  ['{"format":"receitario-backup","version":99}'],
  ['{"format":"receitario-backup","version":1,"recipes":[{"id":"x"}],"versions":[],"marks":[],"shopping":null}'],
])('backup inválido é recusado sem alterar nada: %s', async (json) => {
  await saveMine(aRecipe());
  await expect(importBackup(json)).rejects.toBeInstanceOf(InvalidBackupError);
  expect((await listMine()).map((r) => r.id)).toEqual(['r1']);
});
