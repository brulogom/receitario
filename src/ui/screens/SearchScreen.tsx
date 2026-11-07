import { useMemo, useState } from 'react';
import { createSearch } from '../../domain/search';
import type { Category, Diet } from '../../domain/types';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

const CATEGORIES: [Category, string][] = [
  ['bolos', 'Bolos'],
  ['massas', 'Massas'],
  ['carnes', 'Carnes'],
  ['aves', 'Aves'],
  ['peixes', 'Peixes'],
  ['arroz e feijão', 'Arroz e feijão'],
  ['salgadinhos', 'Salgadinhos'],
  ['bebidas', 'Bebidas'],
];
const DIETS: [keyof Diet, string][] = [
  ['vegetarian', 'Vegetariano'],
  ['lactoseFree', 'Sem lactose'],
  ['glutenFree', 'Sem glúten'],
];
const TIMES = [30, 60];

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function Chip({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={toggle}>
      {label}
    </button>
  );
}

export function SearchScreen() {
  const { all } = useRecipes();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'doce' | 'salgado' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [diet, setDiet] = useState<(keyof Diet)[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);

  const search = useMemo(() => createSearch(all), [all]);
  const results = useMemo(
    () => search(query, { categories, diet, maxMinutes }).filter((recipe) => !kind || recipe.kind === kind || recipe.kind === 'ambos'),
    [search, query, categories, diet, maxMinutes, kind],
  );
  const activeFilters = categories.length + diet.length + (maxMinutes ? 1 : 0);

  return (
    <div className="stack">
      <h1 className="brand">Receitário</h1>
      <label className="field">
        <span>O que você quer cozinhar?</span>
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome ou ingredientes: frango, batata"
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </label>
      <div className="chips">
        <Chip label="Doces" on={kind === 'doce'} toggle={() => setKind(kind === 'doce' ? null : 'doce')} />
        <Chip label="Salgados" on={kind === 'salgado'} toggle={() => setKind(kind === 'salgado' ? null : 'salgado')} />
        {TIMES.map((time) => (
          <Chip key={time} label={`Até ${time} min`} on={maxMinutes === time} toggle={() => setMaxMinutes(maxMinutes === time ? null : time)} />
        ))}
      </div>
      <details className="filters">
        <summary>Mais filtros{activeFilters ? ` (${activeFilters} ativos)` : ''}</summary>
        <div className="chips wrap">
          {CATEGORIES.map(([value, label]) => (
            <Chip key={value} label={label} on={categories.includes(value)} toggle={() => setCategories(toggled(categories, value))} />
          ))}
          {DIETS.map(([value, label]) => (
            <Chip key={value} label={label} on={diet.includes(value)} toggle={() => setDiet(toggled(diet, value))} />
          ))}
        </div>
      </details>
      {results.length === 0 && <p className="muted">Nada encontrado. Tente outro nome ou ingrediente, ou tire um filtro.</p>}
      <div className="list">
        {results.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
