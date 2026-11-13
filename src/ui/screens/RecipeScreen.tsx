import { useEffect, useState } from 'react';
import { formatIngredient, formatServings, servingsStep, servingsUnitOf, servingsVerb, unitLabel } from '../../domain/portions';
import { isHttpUrl } from '../../domain/text';
import { copyFromCatalog, deleteMine, discardEdits } from '../../storage/recipes';
import { getShopping, toggleShoppingRecipe } from '../../storage/shopping';
import { forget, recall, remember } from '../cookMemory';
import { RecipeArt } from '../RecipeArt';
import { isEditedCatalog, recipeMeta, recipeTag } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

export function RecipeScreen({ id, backHref = '#/buscar' }: { id: string; backHref?: string }) {
  const { all, loaded, favorites, tries, toggle, reload } = useRecipes();
  const recipe = all.find((item) => item.id === id);
  const servingsKey = `receitario.cozinha.rendimento.${id}`;
  // Guarda sobre qual rendimento o ajuste foi feito: se a receita for editada, ele deixa de valer.
  const [chosen, setChosen] = useState(() => recall<{ base: number; value: number }>(servingsKey));
  const [inShopping, setInShopping] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const servings = chosen && chosen.base === recipe?.servings ? chosen.value : recipe?.servings ?? null;
  const setServings = (value: number) => {
    if (!recipe?.servings) return;
    const next = { base: recipe.servings, value };
    setChosen(next);
    remember(servingsKey, next);
  };

  useEffect(() => {
    void getShopping().then((state) => setInShopping(state.selections.some((selection) => selection.recipeId === id)));
  }, [id]);

  if (!recipe) {
    if (!loaded) return null;
    return (
      <div className="stack">
        <p>Esta receita não foi encontrada. Ela pode ter sido excluída.</p>
        <a className="button" href={backHref}>Voltar</a>
      </div>
    );
  }

  const factor = servings && recipe.servings ? servings / recipe.servings : 1;
  const isMine = recipe.source === 'mine';
  const isEdited = isEditedCatalog(recipe);
  const unit = servingsUnitOf(recipe);
  const step = servingsStep(unit);
  const isFavorite = favorites.includes(id);
  const isTry = tries.includes(id);
  const canCook = recipe.steps.length > 0;

  const saveCopy = async () => {
    const copy = await copyFromCatalog(recipe);
    await reload();
    window.location.hash = `#/editar/${copy.id}`;
  };

  const remove = async () => {
    await deleteMine(id);
    await reload();
    window.location.hash = '#/minhas';
  };

  const backToOriginal = async () => {
    await discardEdits(id);
    await reload();
    setChosen(null);
    forget(servingsKey);
    setConfirming(false);
  };

  return (
    <article className="stack recipe">
      <a className="back" href={backHref}>Voltar</a>
      <div className="recipe-head">
        <RecipeArt recipe={recipe} large />
        <div>
          {isMine && <span className="tag">{recipeTag(recipe)}</span>}
          <h1>{recipe.name}</h1>
          <p className="muted">{recipeMeta(recipe)}</p>
          {recipe.book && (
            <p className="muted small">
              Fonte: {recipe.book.title}
              {recipe.book.page !== null && `, página ${recipe.book.page} do arquivo`}
            </p>
          )}
        </div>
      </div>

      <div className="actions">
        {canCook ? (
          <a className="button primary" href={`#/cozinha/${id}/${servings ?? ''}`}>Modo cozinha</a>
        ) : (
          <button type="button" className="button primary" disabled>Modo cozinha</button>
        )}
        <button type="button" className="button" aria-pressed={isFavorite} onClick={() => void toggle(id, 'favorite')}>
          {isFavorite ? 'Favorita' : 'Favoritar'}
        </button>
        <button type="button" className="button" aria-pressed={isTry} onClick={() => void toggle(id, 'try')}>
          {isTry ? 'Vou testar' : 'Quero testar'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => void toggleShoppingRecipe(id, servings).then(setInShopping)}
        >
          {inShopping ? 'Tirar das compras' : 'Adicionar às compras'}
        </button>
        <a className="button" href={`#/editar/${id}`}>Editar</a>
        {!isMine && (
          <button type="button" className="button" onClick={() => void saveCopy()}>Salvar em Minhas Receitas</button>
        )}
        {isMine && (
          <>
            <a className="button" href={`#/historico/${id}`}>Histórico</a>
            <button type="button" className="button danger" onClick={() => setConfirming(true)}>
              {isEdited ? 'Voltar à original' : 'Excluir'}
            </button>
          </>
        )}
      </div>
      {!canCook && <p className="muted small">Adicione o modo de preparo para usar o Modo cozinha.</p>}

      {confirming && (
        <div className="confirm" role="alertdialog" aria-label={isEdited ? 'Confirmar volta à original' : 'Confirmar exclusão'}>
          <p>
            {isEdited
              ? `Voltar “${recipe.name}” à versão original? Suas alterações e o histórico serão perdidos.`
              : `Excluir “${recipe.name}” e todo o histórico? Isso não pode ser desfeito.`}
          </p>
          <div className="actions">
            <button type="button" className="button danger-solid" onClick={() => void (isEdited ? backToOriginal() : remove())}>
              {isEdited ? 'Sim, voltar à original' : 'Sim, excluir'}
            </button>
            <button type="button" className="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="recipe-columns">
        <section>
          <h2>Ingredientes</h2>
          {recipe.servings && servings ? (
            <div className="servings">
              <strong>{servingsVerb(unit)}</strong>
              <div className="stepper">
                <button type="button" aria-label={`Menos ${unit}`} disabled={servings <= step} onClick={() => setServings(servings - step)}>−</button>
                <output>{formatServings(servings)}</output>
                <button type="button" aria-label={`Mais ${unit}`} onClick={() => setServings(servings + step)}>+</button>
              </div>
              <strong>{unitLabel(unit, servings)}</strong>
            </div>
          ) : (
            <p className="muted small">
              <a href={`#/editar/${id}`}>Informe quanto a receita rende</a> para poder ajustar as quantidades.
            </p>
          )}
          {recipe.ingredients.length === 0 && <p className="muted">Nenhum ingrediente informado.</p>}
          <ul className="ingredients">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{formatIngredient(ingredient, factor)}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Modo de preparo</h2>
          {recipe.steps.length === 0 && <p className="muted">Nenhum passo informado.</p>}
          <ol className="steps">
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          {recipe.notes && (
            <div className="notes">
              <strong>Minhas anotações</strong>
              <p>{recipe.notes}</p>
            </div>
          )}
          {recipe.videoUrl && (
            <p className="muted small video-link">
              Vídeo de origem:{' '}
              {isHttpUrl(recipe.videoUrl) ? (
                <a href={recipe.videoUrl} target="_blank" rel="noreferrer noopener">{recipe.videoUrl}</a>
              ) : (
                recipe.videoUrl
              )}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
