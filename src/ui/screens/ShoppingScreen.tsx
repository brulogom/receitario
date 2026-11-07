import { useEffect, useMemo, useState } from 'react';
import { formatServings, servingsStep, servingsUnitOf, unitLabel } from '../../domain/portions';
import { buildShoppingList } from '../../domain/shopping';
import type { Recipe } from '../../domain/types';
import type { ShoppingState } from '../../storage/db';
import { getShopping, setShopping } from '../../storage/shopping';
import { useRecipes } from '../useRecipes';

export function ShoppingScreen() {
  const { all } = useRecipes();
  const [state, setState] = useState<ShoppingState | null>(null);

  useEffect(() => {
    void getShopping().then(setState);
  }, []);

  const selections = useMemo(
    () =>
      (state?.selections ?? [])
        .map((selection) => ({ recipe: all.find((recipe) => recipe.id === selection.recipeId), servings: selection.servings }))
        .filter((selection): selection is { recipe: Recipe; servings: number | null } => Boolean(selection.recipe)),
    [state, all],
  );
  const items = useMemo(() => buildShoppingList(selections), [selections]);

  if (!state) return null;

  const update = (next: ShoppingState) => {
    setState(next);
    void setShopping(next);
  };

  const setServings = (recipeId: string, servings: number) =>
    update({
      ...state,
      selections: state.selections.map((selection) => (selection.recipeId === recipeId ? { ...selection, servings } : selection)),
    });

  const toggleItem = (key: string) =>
    update({
      ...state,
      checked: state.checked.includes(key) ? state.checked.filter((item) => item !== key) : [...state.checked, key],
    });

  return (
    <div className="stack">
      <h1>Lista de compras</h1>
      {selections.length === 0 && <p className="muted">Abra uma receita e toque em Adicionar às compras. Os ingredientes repetidos são somados aqui.</p>}
      {selections.length > 0 && (
        <section className="stack">
          <h2>Receitas</h2>
          {selections.map(({ recipe, servings }) => {
            const unit = servingsUnitOf(recipe);
            const step = servingsStep(unit);
            return (
              <div className="shopping-recipe" key={recipe.id}>
                <span className="shopping-name">{recipe.name}</span>
                {servings !== null && (
                  <div className="stepper">
                    <button type="button" aria-label={`Menos ${unit} de ${recipe.name}`} disabled={servings <= step} onClick={() => setServings(recipe.id, servings - step)}>−</button>
                    <output>{formatServings(servings)}</output>
                    <button type="button" aria-label={`Mais ${unit} de ${recipe.name}`} onClick={() => setServings(recipe.id, servings + step)}>+</button>
                    <span className="muted small">{unitLabel(unit, servings)}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="button small"
                  aria-label={`Tirar ${recipe.name} da lista`}
                  onClick={() => update({ ...state, selections: state.selections.filter((selection) => selection.recipeId !== recipe.id) })}
                >
                  Tirar
                </button>
              </div>
            );
          })}
        </section>
      )}
      {items.length > 0 && (
        <section className="stack">
          <h2>Ingredientes</h2>
          <p className="muted small">Marque o que você já tem em casa ou já comprou.</p>
          <div>
            {items.map((item) => (
              <label className={state.checked.includes(item.key) ? 'shopping-item checked' : 'shopping-item'} key={item.key}>
                <input type="checkbox" checked={state.checked.includes(item.key)} onChange={() => toggleItem(item.key)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
