import { useMemo, useState } from 'react';
import { whatCanIMake } from '../../domain/pantry';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

const STORAGE_KEY = 'receitario.casa';

function loadPantry(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function PantryScreen() {
  const { all, loaded } = useRecipes();
  const [text, setText] = useState(loadPantry);

  const change = (value: string) => {
    setText(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Sem armazenamento, a lista vale só enquanto a tela estiver aberta.
    }
  };

  const results = useMemo(() => whatCanIMake(text.split(','), all), [text, all]);
  const hasText = text.split(',').some((item) => item.trim());

  return (
    <div className="stack">
      <h1>O que tem em casa?</h1>
      <label className="field">
        <span>Ingredientes, separados por vírgula</span>
        <input className="search-input" value={text} onChange={(event) => change(event.target.value)} placeholder="ovo, leite, açúcar, fubá" />
      </label>
      {loaded && all.length === 0 && (
        <p className="muted">Esta busca olha as suas receitas, e ainda não há nenhuma. <a href="#/livro">Envie um livro de receitas</a> ou <a href="#/nova">anote a primeira</a>.</p>
      )}
      {!hasText && all.length > 0 && <p className="muted">Conte o que você tem e eu mostro o que dá para fazer, incluindo receitas em que faltam só um ou dois ingredientes. Sal, água e óleo já contam como disponíveis.</p>}
      {hasText && all.length > 0 && results.length === 0 && <p className="muted">Nenhuma receita por perto com esses ingredientes. Tente acrescentar mais alguns.</p>}
      <div className="list">
        {results.map(({ recipe, missing }) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            ready={missing.length === 0}
            note={missing.length ? `Falta: ${missing.join(', ')}` : 'Dá para fazer agora'}
          />
        ))}
      </div>
    </div>
  );
}
