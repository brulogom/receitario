import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, dateKey, dayLabel, shortDate } from '../../domain/dates';
import { MEALS, mergeSelections, planSelections } from '../../domain/plan';
import { formatServings, servingsStep, servingsUnitOf, unitLabel } from '../../domain/portions';
import { createSearch } from '../../domain/search';
import type { Meal, PlanEntry, Recipe } from '../../domain/types';
import { addToPlan, listPlan, removeFromPlan, setPlanServings } from '../../storage/plan';
import { getShopping, setShopping } from '../../storage/shopping';
import { useRecipes } from '../useRecipes';

const PICKER_SIZE = 8;

function RecipePicker({ onPick, onCancel, label }: { onPick: (recipe: Recipe) => void; onCancel: () => void; label: string }) {
  const { all, favorites } = useRecipes();
  const [query, setQuery] = useState('');
  const search = useMemo(() => createSearch(all), [all]);
  const results = useMemo(() => {
    const found = search(query, { categories: [], diet: [], maxMinutes: null });
    // Sem nada digitado, as favoritas vêm primeiro.
    if (!query.trim()) found.sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
    return found.slice(0, PICKER_SIZE);
  }, [search, query, favorites]);

  return (
    <div className="picker" role="group" aria-label={label}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar receita"
        aria-label={`Buscar receita para ${label}`}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      {all.length === 0 && <p className="muted small">Ainda não há receitas. Anote uma em Minhas.</p>}
      {all.length > 0 && results.length === 0 && <p className="muted small">Nada encontrado.</p>}
      <div className="picker-list">
        {results.map((recipe) => (
          <button type="button" key={recipe.id} className="picker-item" onClick={() => onPick(recipe)}>
            {recipe.name}
          </button>
        ))}
      </div>
      <button type="button" className="button small align-start" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

function PlannedRecipe({ entry, recipe, where, onChange }: { entry: PlanEntry; recipe: Recipe | undefined; where: string; onChange: () => void }) {
  if (!recipe) return null;
  const unit = servingsUnitOf(recipe);
  const step = servingsStep(unit);
  const servings = recipe.servings ? entry.servings ?? recipe.servings : null;
  const change = (value: number) => void setPlanServings(entry.id, value).then(onChange);
  return (
    <div className="plan-entry">
      <a className="plan-entry-name" href={`#/receita/${recipe.id}`}>{recipe.name}</a>
      {servings !== null && (
        <div className="stepper">
          <button type="button" aria-label={`Menos ${unit} de ${recipe.name}, ${where}`} disabled={servings <= step} onClick={() => change(servings - step)}>−</button>
          <output>{formatServings(servings)}</output>
          <button type="button" aria-label={`Mais ${unit} de ${recipe.name}, ${where}`} onClick={() => change(servings + step)}>+</button>
          <span className="muted small">{unitLabel(unit, servings)}</span>
        </div>
      )}
      <button type="button" className="button small" aria-label={`Tirar ${recipe.name} de ${where}`} onClick={() => void removeFromPlan(entry.id).then(onChange)}>
        Tirar
      </button>
    </div>
  );
}

export function PlanScreen() {
  const { all } = useRecipes();
  const [today] = useState(() => dateKey(new Date()));
  const [week, setWeek] = useState(0);
  const [entries, setEntries] = useState<PlanEntry[] | null>(null);
  const [picking, setPicking] = useState<{ date: string; meal: Meal } | null>(null);
  const [message, setMessage] = useState('');

  const start = addDays(today, week * 7);
  const end = addDays(start, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);

  const load = useCallback(() => listPlan(start, end).then(setEntries), [start, end]);
  useEffect(() => {
    setMessage('');
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(all.map((recipe) => [recipe.id, recipe])), [all]);
  const planned = (entries ?? []).filter((entry) => byId.has(entry.recipeId));

  const pick = async (recipe: Recipe) => {
    if (!picking) return;
    await addToPlan({ ...picking, recipeId: recipe.id, servings: recipe.servings });
    setPicking(null);
    await load();
  };

  const sendToShopping = async () => {
    const incoming = planSelections(planned, all);
    const current = await getShopping();
    await setShopping({ ...current, selections: mergeSelections(current.selections, incoming) });
    setMessage(incoming.length === 1 ? '1 receita foi para a lista de compras.' : `${incoming.length} receitas foram para a lista de compras.`);
  };

  return (
    <div className="stack">
      <h1>Semana</h1>
      <div className="plan-nav">
        <button type="button" className="button small" aria-label="Semana anterior" onClick={() => setWeek(week - 1)}>‹</button>
        <strong>{`${shortDate(start, today)} a ${shortDate(end, today)}`}</strong>
        <button type="button" className="button small" aria-label="Próxima semana" onClick={() => setWeek(week + 1)}>›</button>
        {week !== 0 && <button type="button" className="button small" onClick={() => setWeek(0)}>Voltar para hoje</button>}
      </div>
      {entries &&
        days.map((day) => (
          <section className="plan-day" key={day} aria-label={dayLabel(day, today)}>
            <h2>{dayLabel(day, today)}</h2>
            {MEALS.map(([meal, mealLabel]) => {
              const where = `${dayLabel(day, today)}, ${mealLabel.toLowerCase()}`;
              const here = planned.filter((entry) => entry.date === day && entry.meal === meal);
              const open = picking?.date === day && picking.meal === meal;
              return (
                <div className="plan-meal" key={meal}>
                  <div className="plan-meal-head">
                    <h3>{mealLabel}</h3>
                    {!open && (
                      <button type="button" className="button small" aria-label={`Adicionar receita: ${where}`} onClick={() => setPicking({ date: day, meal })}>
                        + Receita
                      </button>
                    )}
                  </div>
                  {here.map((entry) => (
                    <PlannedRecipe key={entry.id} entry={entry} recipe={byId.get(entry.recipeId)} where={where} onChange={() => void load()} />
                  ))}
                  {open && <RecipePicker label={where} onPick={(recipe) => void pick(recipe)} onCancel={() => setPicking(null)} />}
                </div>
              );
            })}
          </section>
        ))}
      {entries && (
        <div className="stack">
          <button type="button" className="button primary" disabled={planned.length === 0} onClick={() => void sendToShopping()}>
            Mandar a semana para as compras
          </button>
          {planned.length === 0 && <p className="muted small">Escolha as receitas dos dias para montar a lista de compras de uma vez.</p>}
          {message && (
            <p className="info" role="status">
              {message} <a href="#/compras">Abrir a lista</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
