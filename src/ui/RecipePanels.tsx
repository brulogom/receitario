import { useState, type FormEvent } from 'react';
import { addDays, dateKey, dayLabel, shortDate } from '../domain/dates';
import { MEALS } from '../domain/plan';
import type { CookedEntry, Meal, Recipe } from '../domain/types';
import { createCollection, toggleInCollection } from '../storage/collections';
import { addCooked, deleteCooked } from '../storage/cooked';
import { addToPlan } from '../storage/plan';
import { useRecipes } from './useRecipes';

const PLAN_DAYS = 14;

export function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" role="img" aria-label={`Nota ${rating.toLocaleString('pt-BR')} de 5`}>
      {'★'.repeat(full)}
      <span className="stars-off">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

/** Registrar que fez a receita, com nota e comentário opcionais. */
export function CookedForm({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const { reload } = useRecipes();
  const [today] = useState(() => dateKey(new Date()));
  const [date, setDate] = useState(today);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
      setError('Escolha o dia em que você fez, até hoje.');
      return;
    }
    await addCooked({ recipeId: recipe.id, date, rating, comment });
    await reload();
    onDone();
  };

  return (
    <form className="panel" aria-label="Registrar que fiz" onSubmit={(event) => void submit(event)} noValidate>
      <strong>Como ficou?</strong>
      <div className="star-picker" role="group" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            className={rating !== null && value <= rating ? 'star on' : 'star'}
            aria-label={`Nota ${value} de 5`}
            aria-pressed={rating === value}
            onClick={() => setRating(rating === value ? null : value)}
          >
            ★
          </button>
        ))}
      </div>
      <label className="field">
        <span>Comentário (opcional)</span>
        <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ex.: ficou seco, assar 5 minutos a menos" />
      </label>
      <label className="field">
        <span>Dia</span>
        <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button primary">Registrar</button>
        <button type="button" className="button" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}

/** As vezes em que a receita foi feita, da mais recente para a mais antiga. */
export function CookedHistory({ entries }: { entries: CookedEntry[] }) {
  const { reload } = useRecipes();
  const [today] = useState(() => dateKey(new Date()));
  if (!entries.length) return null;
  return (
    <section className="stack cooked-history">
      <h2>Quando fiz</h2>
      <ul className="cooked-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className="cooked-line">
              <strong>{dayLabel(entry.date, today) === 'Hoje' ? 'Hoje' : shortDate(entry.date, today)}</strong>
              {entry.rating !== null && <Stars rating={entry.rating} />}
              <button
                type="button"
                className="link-button"
                aria-label={`Apagar registro de ${shortDate(entry.date, today)}`}
                onClick={() => void deleteCooked(entry.id).then(reload)}
              >
                Apagar
              </button>
            </div>
            {entry.comment && <p className="muted">{entry.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pôr a receita num dia da semana. */
export function PlanPanel({ recipe, servings, onDone }: { recipe: Recipe; servings: number | null; onDone: () => void }) {
  const [today] = useState(() => dateKey(new Date()));
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<Meal>('almoco');
  const [done, setDone] = useState('');
  const days = Array.from({ length: PLAN_DAYS }, (_, index) => addDays(today, index));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addToPlan({ date, meal, recipeId: recipe.id, servings });
    const mealLabel = MEALS.find(([value]) => value === meal)![1].toLowerCase();
    setDone(`${dayLabel(date, today)}, ${mealLabel}`);
  };

  if (done) {
    return (
      <div className="panel" role="status">
        <p>Está na semana: {done}.</p>
        <div className="actions">
          <a className="button" href="#/semana">Ver a semana</a>
          <button type="button" className="button" onClick={onDone}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <form className="panel" aria-label="Planejar" onSubmit={(event) => void submit(event)}>
      <div className="form-columns">
        <label className="field">
          <span>Dia</span>
          <select value={date} onChange={(event) => setDate(event.target.value)}>
            {days.map((day) => <option key={day} value={day}>{dayLabel(day, today)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Refeição</span>
          <select value={meal} onChange={(event) => setMeal(event.target.value as Meal)}>
            {MEALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button type="submit" className="button primary">Pôr na semana</button>
        <button type="button" className="button" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}

/** Pôr ou tirar a receita das coleções, ou criar uma nova já com ela. */
export function CollectionsPanel({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const { collections, reload } = useRecipes();
  const [name, setName] = useState('');

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createCollection(name, [recipe.id]);
    setName('');
    await reload();
  };

  return (
    <div className="panel" role="group" aria-label="Coleções">
      {collections.length === 0 && <p className="muted small">Junte receitas por ocasião: Ceia de Natal, Marmitas, Lanches da tarde.</p>}
      {collections.map((collection) => (
        <label className="check" key={collection.id}>
          <input
            type="checkbox"
            checked={collection.recipeIds.includes(recipe.id)}
            onChange={() => void toggleInCollection(collection.id, recipe.id).then(reload)}
          />
          <span>{collection.name}</span>
        </label>
      ))}
      <form className="inline-form" onSubmit={(event) => void create(event)}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nova coleção" aria-label="Nome da nova coleção" />
        <button type="submit" className="button" disabled={!name.trim()}>Criar</button>
      </form>
      <button type="button" className="button small align-start" onClick={onDone}>Fechar</button>
    </div>
  );
}
