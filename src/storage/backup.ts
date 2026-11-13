import { isDateKey } from '../domain/dates';
import type { Collection, CookedEntry, Ingredient, PlanEntry, Recipe } from '../domain/types';
import { ALL_STORES, openDb, type MarkEntry, type RecipeVersion, type ShoppingState } from './db';
import { MAX_VERSIONS, pushVersion } from './recipes';

const FORMAT = 'receitario-backup';
const VERSION = 2;
/** Backups antigos continuam valendo: a versão 1 só não tinha plano, registros e coleções. */
const READABLE = [1, 2];

type StoredPhoto = { type: string; base64: string };
type StoredRecipe = Omit<Recipe, 'photo'> & { photo?: StoredPhoto };
type StoredVersion = Omit<RecipeVersion, 'snapshot'> & { snapshot: StoredRecipe };

type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  recipes: StoredRecipe[];
  versions: StoredVersion[];
  marks: MarkEntry[];
  shopping: ShoppingState | null;
  plan?: PlanEntry[];
  cooked?: CookedEntry[];
  collections?: Collection[];
};

export class InvalidBackupError extends Error {
  constructor(message = 'Este arquivo não é um backup válido do Receitário.') {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

async function encodePhoto(photo: Blob): Promise<StoredPhoto> {
  const bytes = new Uint8Array(await photo.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { type: photo.type, base64: btoa(binary) };
}

function decodePhoto(stored: StoredPhoto): Blob {
  const binary = atob(stored.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: stored.type });
}

async function encodeRecipe(recipe: Recipe): Promise<StoredRecipe> {
  const { photo, ...rest } = recipe;
  return photo ? { ...rest, photo: await encodePhoto(photo) } : rest;
}

function decodeRecipe(stored: StoredRecipe): Recipe {
  const { photo, ...rest } = stored;
  return photo ? { ...rest, photo: decodePhoto(photo) } : rest;
}

export async function exportBackup(): Promise<string> {
  const db = await openDb();
  const [recipes, versions, marks, shopping, plan, cooked, collections] = await Promise.all([
    db.getAll('recipes'),
    db.getAll('versions'),
    db.getAll('marks'),
    db.get('shopping', 'state'),
    db.getAll('plan'),
    db.getAll('cooked'),
    db.getAll('collections'),
  ]);
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    recipes: await Promise.all(recipes.map(encodeRecipe)),
    versions: await Promise.all(
      versions.map(async (version) => ({ ...version, snapshot: await encodeRecipe(version.snapshot) })),
    ),
    marks,
    shopping: shopping ?? null,
    plan,
    cooked,
    collections,
  };
  return JSON.stringify(file);
}

const isNumberOrNull = (value: unknown) => value === null || typeof value === 'number';
const isStringList = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string');

function isIngredient(value: unknown): boolean {
  const i = value as Ingredient | null;
  return (
    !!i &&
    typeof i.name === 'string' &&
    typeof i.unit === 'string' &&
    isNumberOrNull(i.quantity) &&
    (i.quantityMax === undefined || typeof i.quantityMax === 'number')
  );
}

function isRecipe(value: unknown): value is StoredRecipe {
  const r = value as StoredRecipe | null;
  return (
    !!r &&
    typeof r.id === 'string' &&
    r.source === 'mine' &&
    typeof r.name === 'string' &&
    (r.kind === 'doce' || r.kind === 'salgado' || r.kind === 'ambos' || r.kind === 'indefinido') &&
    (r.servingsUnit === undefined || typeof r.servingsUnit === 'string') &&
    (r.book === undefined || (typeof r.book?.title === 'string' && isNumberOrNull(r.book?.page))) &&
    (r.tags === undefined || isStringList(r.tags)) &&
    isStringList(r.categories) &&
    !!r.diet &&
    typeof r.diet === 'object' &&
    isNumberOrNull(r.minutes) &&
    isNumberOrNull(r.servings) &&
    Array.isArray(r.ingredients) &&
    r.ingredients.every(isIngredient) &&
    isStringList(r.steps) &&
    typeof r.notes === 'string' &&
    typeof r.videoUrl === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string' &&
    (r.photo === undefined || (typeof r.photo?.base64 === 'string' && typeof r.photo?.type === 'string'))
  );
}

function isShopping(value: unknown): boolean {
  if (value === null) return true;
  const s = value as ShoppingState;
  return (
    !!s &&
    Array.isArray(s.selections) &&
    s.selections.every((item) => typeof item?.recipeId === 'string' && isNumberOrNull(item?.servings)) &&
    isStringList(s.checked) &&
    (s.sections === undefined ||
      (!!s.sections && typeof s.sections === 'object' && Object.values(s.sections).every((value) => typeof value === 'string')))
  );
}

function isPlanEntry(value: unknown): boolean {
  const p = value as PlanEntry | null;
  return (
    !!p &&
    typeof p.id === 'string' &&
    isDateKey(p.date) &&
    (p.meal === 'almoco' || p.meal === 'jantar') &&
    typeof p.recipeId === 'string' &&
    isNumberOrNull(p.servings)
  );
}

function isCookedEntry(value: unknown): boolean {
  const c = value as CookedEntry | null;
  return (
    !!c &&
    typeof c.id === 'string' &&
    typeof c.recipeId === 'string' &&
    isDateKey(c.date) &&
    (c.rating === null || (Number.isInteger(c.rating) && c.rating >= 1 && c.rating <= 5)) &&
    typeof c.comment === 'string' &&
    typeof c.at === 'string'
  );
}

function isCollection(value: unknown): boolean {
  const c = value as Collection | null;
  return (
    !!c &&
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    isStringList(c.recipeIds) &&
    typeof c.createdAt === 'string' &&
    typeof c.updatedAt === 'string'
  );
}

const optionalList = (value: unknown, check: (item: unknown) => boolean) =>
  value === undefined || (Array.isArray(value) && value.every(check));

function parseFile(json: string): BackupFile {
  let data: BackupFile | null;
  try {
    data = JSON.parse(json);
  } catch {
    throw new InvalidBackupError();
  }
  if (!data || data.format !== FORMAT) throw new InvalidBackupError();
  if (!READABLE.includes(data.version)) {
    throw new InvalidBackupError('Este backup foi feito em uma versão diferente do Receitário.');
  }
  const valid =
    Array.isArray(data.recipes) &&
    data.recipes.every(isRecipe) &&
    Array.isArray(data.versions) &&
    data.versions.every((v) => typeof v?.id === 'string' && typeof v?.recipeId === 'string' && isRecipe(v?.snapshot)) &&
    Array.isArray(data.marks) &&
    data.marks.every(
      (m) => typeof m?.key === 'string' && typeof m?.recipeId === 'string' && (m?.kind === 'favorite' || m?.kind === 'try'),
    ) &&
    isShopping(data.shopping ?? null) &&
    optionalList(data.plan, isPlanEntry) &&
    optionalList(data.cooked, isCookedEntry) &&
    optionalList(data.collections, isCollection);
  if (!valid) throw new InvalidBackupError();
  return data;
}

export async function importBackup(json: string): Promise<{ added: number; updated: number; kept: number }> {
  const file = parseFile(json);
  // Decodifica tudo antes de abrir a transação: um erro aqui não pode deixar nada pela metade,
  // e uma transação do IndexedDB não sobrevive a esperas fora do banco.
  let recipes: Recipe[];
  let versions: RecipeVersion[];
  try {
    recipes = file.recipes.map(decodeRecipe);
    versions = file.versions.map((v) => ({ ...v, snapshot: decodeRecipe(v.snapshot) }));
  } catch {
    throw new InvalidBackupError();
  }

  const db = await openDb();
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  const result = { added: 0, updated: 0, kept: 0 };
  const now = new Date().toISOString();
  const recipeStore = tx.objectStore('recipes');
  const versionStore = tx.objectStore('versions');

  for (const version of versions) await versionStore.put(version);

  for (const incoming of recipes) {
    const local = await recipeStore.get(incoming.id);
    if (!local) {
      await recipeStore.put(incoming);
      result.added += 1;
    } else if (incoming.updatedAt > local.updatedAt) {
      await pushVersion(tx, local, now);
      await recipeStore.put(incoming);
      result.updated += 1;
    } else {
      if (incoming.updatedAt < local.updatedAt) {
        const history = await versionStore.index('recipeId').getAll(incoming.id);
        if (!history.some((v) => v.snapshot.updatedAt === incoming.updatedAt)) await pushVersion(tx, incoming, now);
      }
      result.kept += 1;
    }
  }

  for (const recipe of recipes) {
    const history = (await versionStore.index('recipeId').getAll(recipe.id)).sort((a, b) => b.seq - a.seq);
    for (const old of history.slice(MAX_VERSIONS)) await versionStore.delete(old.id);
  }

  for (const mark of file.marks) await tx.objectStore('marks').put(mark);

  if (file.shopping) {
    const shoppingStore = tx.objectStore('shopping');
    const local = await shoppingStore.get('state');
    const known = new Set(local?.selections.map((s) => s.recipeId));
    await shoppingStore.put(
      {
        selections: [...(local?.selections ?? []), ...file.shopping.selections.filter((s) => !known.has(s.recipeId))],
        checked: [...new Set([...(local?.checked ?? []), ...file.shopping.checked])],
        // A correção feita neste aparelho vale mais que a do backup.
        sections: { ...file.shopping.sections, ...local?.sections },
      },
      'state',
    );
  }

  for (const entry of file.plan ?? []) await tx.objectStore('plan').put(entry);
  for (const entry of file.cooked ?? []) await tx.objectStore('cooked').put(entry);

  const collectionStore = tx.objectStore('collections');
  for (const incoming of file.collections ?? []) {
    const local = await collectionStore.get(incoming.id);
    if (!local) {
      await collectionStore.put(incoming);
      continue;
    }
    // Nada some: as receitas das duas cópias ficam juntas, e o nome mais recente vence.
    const newer = incoming.updatedAt > local.updatedAt ? incoming : local;
    await collectionStore.put({ ...newer, recipeIds: [...new Set([...local.recipeIds, ...incoming.recipeIds])] });
  }

  await tx.done;
  return result;
}
