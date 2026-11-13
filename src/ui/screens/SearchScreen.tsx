import { useMemo, useState } from 'react';
import { cookedByRecipe, cookedSummary } from '../../domain/cooked';
import { createSearch } from '../../domain/search';
import { allTags, sameTag } from '../../domain/tags';
import type { Category, Diet } from '../../domain/types';
import { RecipeCard } from '../RecipeCard';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

const VIEW_KEY = 'receitario.busca.visual';
type View = 'grade' | 'lista';

function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'lista' ? 'lista' : 'grade';
  } catch {
    return 'grade';
  }
}

function saveView(view: View): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Sem armazenamento, a escolha vale só enquanto a tela estiver aberta.
  }
}

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
  const { all, loaded, cooked } = useRecipes();
  const [view, setView] = useState<View>(loadView);
  const [tags, setTags] = useState<string[]>([]);
  const tagOptions = useMemo(() => allTags(all), [all]);
  const ratings = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const [recipeId, entries] of cookedByRecipe(cooked)) map.set(recipeId, cookedSummary(entries).rating);
    return map;
  }, [cooked]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'doce' | 'salgado' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [diet, setDiet] = useState<(keyof Diet)[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);

  const search = useMemo(() => createSearch(all), [all]);
  const results = useMemo(
    () => search(query, { categories, diet, maxMinutes, tags })// Receita sem tipo aparece nos dois filtros para não sumir da busca.
      .filter((recipe) => !kind || recipe.kind === kind || recipe.kind === 'ambos' || recipe.kind === 'indefinido'),
    [search, query, categories, diet, maxMinutes, kind, tags],
  );
  const activeFilters = categories.length + diet.length + tags.length + (maxMinutes ? 1 : 0);
  const changeView = (next: View) => {
    setView(next);
    saveView(next);
  };
  const surprise = () => {
    const recipe = results[Math.floor(Math.random() * results.length)];
    if (recipe) window.location.hash = `#/receita/${recipe.id}`;
  };

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
        {tagOptions.length > 0 && (
          <div className="chips wrap" role="group" aria-label="Etiquetas">
            {tagOptions.map((tag) => {
              const on = tags.some((item) => sameTag(item, tag));
              return (
                <Chip key={tag} label={`# ${tag}`} on={on} toggle={() => setTags(on ? tags.filter((item) => !sameTag(item, tag)) : [...tags, tag])} />
              );
            })}
          </div>
        )}
      </details>
      {results.length > 0 && (
        <div className="list-tools">
          <button type="button" className="button small" onClick={surprise}>Me surpreenda</button>
          <div className="view-switch" role="group" aria-label="Mostrar como">
            <button type="button" className="chip" aria-pressed={view === 'grade'} onClick={() => changeView('grade')}>Grade</button>
            <button type="button" className="chip" aria-pressed={view === 'lista'} onClick={() => changeView('lista')}>Lista</button>
          </div>
        </div>
      )}
      {loaded && all.length === 0 && (
        <div className="stack">
          <p className="muted">Ainda não há receitas aqui. Envie um livro de receitas ou anote a primeira.</p>
          <div className="actions">
            <a className="button primary grow" href="#/livro">Enviar livro</a>
            <a className="button grow" href="#/nova">Nova receita</a>
          </div>
        </div>
      )}
      {all.length > 0 && results.length === 0 && <p className="muted">Nada encontrado. Tente outro nome ou ingrediente, ou tire um filtro.</p>}
      {view === 'grade' ? (
        <div className="grid">
          {results.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} rating={ratings.get(recipe.id) ?? null} />
          ))}
        </div>
      ) : (
        <div className="list">
          {results.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
