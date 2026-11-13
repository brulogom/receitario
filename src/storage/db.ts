import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Collection, CookedEntry, PlanEntry, Recipe } from '../domain/types';

export type RecipeVersion = {
  id: string;
  recipeId: string;
  savedAt: string;
  seq: number;
  snapshot: Recipe;
};

export type MarkKind = 'favorite' | 'try';
export type MarkEntry = { key: string; kind: MarkKind; recipeId: string; at: string };

export type ShoppingState = {
  selections: { recipeId: string; servings: number | null }[];
  checked: string[];
  /** Seção do mercado escolhida pela pessoa para um ingrediente, pelo nome no singular. */
  sections?: Record<string, string>;
};

export interface ReceitarioDb extends DBSchema {
  recipes: { key: string; value: Recipe };
  versions: { key: string; value: RecipeVersion; indexes: { recipeId: string } };
  marks: { key: string; value: MarkEntry; indexes: { kind: MarkKind; recipeId: string } };
  shopping: { key: string; value: ShoppingState };
  plan: { key: string; value: PlanEntry; indexes: { date: string; recipeId: string } };
  cooked: { key: string; value: CookedEntry; indexes: { recipeId: string } };
  collections: { key: string; value: Collection };
}

/** Lojas que uma transação de escrita completa abre: salvar, excluir e importar backup. */
export const ALL_STORES = ['recipes', 'versions', 'marks', 'shopping', 'plan', 'cooked', 'collections'] as const;
export type StoreName = (typeof ALL_STORES)[number];

const DB_NAME = 'receitario';
const DB_VERSION = 2;

let opening: Promise<IDBPDatabase<ReceitarioDb>> | null = null;

export function openDb(): Promise<IDBPDatabase<ReceitarioDb>> {
  opening ??= openDB<ReceitarioDb>(DB_NAME, DB_VERSION, {
    // Toda mudança de esquema entra aqui como um novo `if (oldVersion < N)`,
    // sem nunca recriar stores: uma atualização não pode apagar dados da pessoa.
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('recipes', { keyPath: 'id' });
        const versions = db.createObjectStore('versions', { keyPath: 'id' });
        versions.createIndex('recipeId', 'recipeId');
        const marks = db.createObjectStore('marks', { keyPath: 'key' });
        marks.createIndex('kind', 'kind');
        marks.createIndex('recipeId', 'recipeId');
        db.createObjectStore('shopping');
      }
      if (oldVersion < 2) {
        const plan = db.createObjectStore('plan', { keyPath: 'id' });
        plan.createIndex('date', 'date');
        plan.createIndex('recipeId', 'recipeId');
        const cooked = db.createObjectStore('cooked', { keyPath: 'id' });
        cooked.createIndex('recipeId', 'recipeId');
        db.createObjectStore('collections', { keyPath: 'id' });
      }
    },
  });
  return opening;
}

export function closeDb(): void {
  if (opening) void opening.then((db) => db.close());
  opening = null;
}
