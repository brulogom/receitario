import { useState, type FormEvent } from 'react';
import type { Recipe } from '../../domain/types';
import { createCollection } from '../../storage/collections';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

export function SavedScreen() {
  const { all, favorites, tries, collections, loaded, reload } = useRecipes();
  const [name, setName] = useState('');
  const known = new Set(all.map((recipe) => recipe.id));
  const pick = (ids: string[]) => ids.map((id) => all.find((recipe) => recipe.id === id)).filter(Boolean) as Recipe[];
  const favoriteList = pick(favorites);
  const tryList = pick(tries);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createCollection(name);
    setName('');
    await reload();
  };

  return (
    <div className="stack">
      <h1>Salvas</h1>
      <section className="stack">
        <h2>Coleções</h2>
        {loaded && collections.length === 0 && (
          <p className="muted small">Junte receitas por ocasião, como Ceia de Natal ou Marmitas. Também dá para criar pela própria receita.</p>
        )}
        {collections.length > 0 && (
          <div className="list">
            {collections.map((collection) => {
              const count = collection.recipeIds.filter((id) => known.has(id)).length;
              return (
                <a className="collection-row" key={collection.id} href={`#/colecao/${collection.id}`}>
                  <span className="recipe-row-name">{collection.name}</span>
                  <span className="muted small">{count === 1 ? '1 receita' : `${count} receitas`}</span>
                </a>
              );
            })}
          </div>
        )}
        <form className="inline-form" onSubmit={(event) => void create(event)}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nova coleção" aria-label="Nome da nova coleção" />
          <button type="submit" className="button" disabled={!name.trim()}>Criar</button>
        </form>
      </section>
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
