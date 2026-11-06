import type { Recipe } from '../../domain/types';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

export function SavedScreen() {
  const { all, favorites, tries, loaded } = useRecipes();
  const pick = (ids: string[]) => ids.map((id) => all.find((recipe) => recipe.id === id)).filter(Boolean) as Recipe[];
  const favoriteList = pick(favorites);
  const tryList = pick(tries);

  return (
    <div className="stack">
      <h1>Salvas</h1>
      {loaded && !favoriteList.length && !tryList.length && (
        <p className="muted">Toque em Favoritar ou Quero testar em qualquer receita para ela aparecer aqui.</p>
      )}
      {favoriteList.length > 0 && (
        <section className="stack">
          <h2>Favoritos</h2>
          <div className="list">
            {favoriteList.map((recipe) => <RecipeRow key={recipe.id} recipe={recipe} />)}
          </div>
        </section>
      )}
      {tryList.length > 0 && (
        <section className="stack">
          <h2>Quero testar</h2>
          <div className="list">
            {tryList.map((recipe) => <RecipeRow key={recipe.id} recipe={recipe} />)}
          </div>
        </section>
      )}
    </div>
  );
}
