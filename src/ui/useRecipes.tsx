import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { catalog } from '../catalog';
import type { Recipe } from '../domain/types';
import type { MarkKind } from '../storage/db';
import { listMarks, toggleMark } from '../storage/marks';
import { listMine } from '../storage/recipes';

type RecipesValue = {
  all: Recipe[];
  mine: Recipe[];
  favorites: string[];
  tries: string[];
  loaded: boolean;
  reload: () => Promise<void>;
  toggle: (recipeId: string, kind: MarkKind) => Promise<void>;
};

const RecipesContext = createContext<RecipesValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tries, setTries] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [recipes, favoriteIds, tryIds] = await Promise.all([listMine(), listMarks('favorite'), listMarks('try')]);
    setMine(recipes);
    setFavorites(favoriteIds);
    setTries(tryIds);
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
    () => ({ all: [...mine, ...catalog], mine, favorites, tries, loaded, reload, toggle }),
    [mine, favorites, tries, loaded, reload, toggle],
  );
  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesValue {
  const value = useContext(RecipesContext);
  if (!value) throw new Error('useRecipes precisa de RecipesProvider');
  return value;
}
