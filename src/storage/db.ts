import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Recipe } from '../domain/types';

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
};

export interface ReceitarioDb extends DBSchema {
  recipes: { key: string; value: Recipe };
  versions: { key: string; value: RecipeVersion; indexes: { recipeId: string } };
  marks: { key: string; value: MarkEntry; indexes: { kind: MarkKind; recipeId: string } };
  shopping: { key: string; value: ShoppingState };
}

const DB_NAME = 'receitario';
const DB_VERSION = 1;

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
    },
  });
  return opening;
}

export function closeDb(): void {
  if (opening) void opening.then((db) => db.close());
  opening = null;
}
