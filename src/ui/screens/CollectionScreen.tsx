import { useState, type FormEvent } from 'react';
import type { Recipe } from '../../domain/types';
import { deleteCollection, renameCollection, toggleInCollection } from '../../storage/collections';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

export function CollectionScreen({ id }: { id: string }) {
  const { all, collections, loaded, reload } = useRecipes();
  const collection = collections.find((item) => item.id === id);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);

  if (!collection) {
    if (!loaded) return null;
    return (
      <div className="stack">
        <p>Esta coleção não foi encontrada. Ela pode ter sido excluída.</p>
        <a className="button align-start" href="#/salvas">Voltar</a>
      </div>
    );
  }

  const recipes = collection.recipeIds.map((recipeId) => all.find((recipe) => recipe.id === recipeId)).filter(Boolean) as Recipe[];

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await renameCollection(id, name);
    await reload();
    setRenaming(false);
  };

  const remove = async () => {
    await deleteCollection(id);
    await reload();
    window.location.hash = '#/salvas';
  };

  return (
    <div className="stack">
      <a className="back" href="#/salvas">Voltar</a>
      {renaming ? (
        <form className="inline-form" onSubmit={(event) => void rename(event)}>
          <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Nome da coleção" />
          <button type="submit" className="button primary" disabled={!name.trim()}>Salvar</button>
          <button type="button" className="button" onClick={() => setRenaming(false)}>Cancelar</button>
        </form>
      ) : (
        <h1>{collection.name}</h1>
      )}
      <div className="actions">
        {!renaming && (
          <button type="button" className="button small" onClick={() => { setName(collection.name); setRenaming(true); }}>Renomear</button>
        )}
        <button type="button" className="button small danger" onClick={() => setConfirming(true)}>Excluir coleção</button>
      </div>
      {confirming && (
        <div className="confirm" role="alertdialog" aria-label="Confirmar exclusão da coleção">
          <p>{`Excluir a coleção “${collection.name}”? As receitas continuam guardadas.`}</p>
          <div className="actions">
            <button type="button" className="button danger-solid" onClick={() => void remove()}>Sim, excluir</button>
            <button type="button" className="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {recipes.length === 0 && <p className="muted">Nenhuma receita aqui ainda. Abra uma receita e toque em Coleções.</p>}
      <div className="list">
        {recipes.map((recipe) => (
          <div className="collection-item" key={recipe.id}>
            <RecipeRow recipe={recipe} />
            <button
              type="button"
              className="button small"
              aria-label={`Tirar ${recipe.name} da coleção`}
              onClick={() => void toggleInCollection(id, recipe.id).then(reload)}
            >
              Tirar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
