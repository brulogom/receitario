import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { catalog } from '../catalog';
import type { Collection, CookedEntry, Recipe } from '../domain/types';
import { listCollections } from '../storage/collections';
import { listCooked } from '../storage/cooked';
import type { MarkKind } from '../storage/db';
import { listMarks, toggleMark } from '../storage/marks';
import { listMine } from '../storage/recipes';

type RecipesValue = {
  all: Recipe[];
  mine: Recipe[];
  favorites: string[];
  tries: string[];
  /** Todas as vezes em que alguma receita foi feita. */
  cooked: CookedEntry[];
  collections: Collection[];
  loaded: boolean;
  reload: () => Promise<void>;
  toggle: (recipeId: string, kind: MarkKind) => Promise<void>;
};

const RecipesContext = createContext<RecipesValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tries, setTries] = useState<string[]>([]);
  const [cooked, setCooked] = useState<CookedEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [recipes, favoriteIds, tryIds, cookedEntries, collectionList] = await Promise.all([
      listMine(),
      listMarks('favorite'),
      listMarks('try'),
      listCooked(),
      listCollections(),
    ]);
    setMine(recipes);
    setFavorites(favoriteIds);
    setTries(tryIds);
    setCooked(cookedEntries);
    setCollections(collectionList);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    async (recipeId: string, kind: MarkKind) => {
      await toggleMark(recipeId, kind);
      await reload();
    },
    [reload],
  );

  const value = useMemo(
    () => {
      // Receita pronta editada usa o mesmo id da original e toma o lugar dela.
      const edited = new Set(mine.map((recipe) => recipe.id));
      const all = [...mine, ...catalog.filter((recipe) => !edited.has(recipe.id))];
      return { all, mine, favorites, tries, cooked, collections, loaded, reload, toggle };
    },
    [mine, favorites, tries, cooked, collections, loaded, reload, toggle],
  );
  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesValue {
  const value = useContext(RecipesContext);
  if (!value) throw new Error('useRecipes precisa de RecipesProvider');
  return value;
}
