import { useState } from 'react';
import { parseRecipeText } from '../../domain/parser';
import { RecipeForm } from './RecipeForm';

export function ImportReview() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseRecipeText> | null>(null);

  if (parsed) {
    return (
      <div className="stack">
        <p className="info">Confira o resultado antes de salvar. Você pode mudar qualquer campo.</p>
        <RecipeForm
          initial={{ name: parsed.name, ingredients: parsed.ingredients, steps: parsed.steps }}
          leftovers={parsed.unrecognized}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Importar receita</h1>
      <label className="field">
        <span>Cole aqui o texto da receita</span>
        <textarea rows={12} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <p className="muted small">Funciona melhor quando o texto tem títulos como "Ingredientes" e "Modo de preparo".</p>
      <div className="actions">
        <a className="button" href="#/minhas">Cancelar</a>
        <button type="button" className="button primary" disabled={!text.trim()} onClick={() => setParsed(parseRecipeText(text))}>
          Separar ingredientes e preparo
        </button>
      </div>
    </div>
  );
}
