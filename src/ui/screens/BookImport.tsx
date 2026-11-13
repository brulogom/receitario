import { useState, type ChangeEvent } from 'react';
import { parseBook, type BookRecipe } from '../../domain/bookParser';
import { parseIngredientLines, parseSteps } from '../../domain/parser';
import type { Recipe } from '../../domain/types';
import { newId, saveMine } from '../../storage/recipes';
import { BookReadError, readBookFile } from '../bookFile';
import { useRecipes } from '../useRecipes';

type Item = BookRecipe & { key: number; selected: boolean; ingredientsText: string; stepsText: string };

function toItem(recipe: BookRecipe, key: number): Item {
  return { ...recipe, key, selected: recipe.complete, ingredientsText: recipe.ingredients.join('\n'), stepsText: recipe.steps.join('\n') };
}

/** Só o que veio do livro: o tipo fica "Não informado" e nenhuma categoria ou restrição é presumida. */
function toRecipe(item: Item, bookTitle: string, now: string): Recipe {
  return {
    id: newId(),
    source: 'mine',
    name: item.name.trim(),
    kind: 'indefinido',
    categories: [],
    diet: { vegetarian: false, lactoseFree: false, glutenFree: false },
    minutes: null,
    servings: item.servings,
    ...(item.servingsUnit ? { servingsUnit: item.servingsUnit } : {}),
    ingredients: parseIngredientLines(item.ingredientsText),
    steps: parseSteps(item.stepsText),
    notes: item.notes,
    videoUrl: '',
    book: { title: bookTitle.trim(), page: item.page },
    createdAt: now,
    updatedAt: now,
  };
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function BookImport() {
  const { mine, reload } = useRecipes();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ added: number; skipped: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSaved(null);
    setItems(null);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    setProgress('Abrindo o arquivo…');
    try {
      const pages = await readBookFile(file, (page, total) => setProgress(`Lendo a página ${page} de ${total}…`));
      setItems(parseBook(pages).map(toItem));
    } catch (problem) {
      setError(problem instanceof BookReadError ? problem.message : 'Não foi possível ler este arquivo.');
    } finally {
      setProgress('');
    }
  };

  const change = (key: number, fields: Partial<Item>) =>
    setItems((current) => current?.map((item) => (item.key === key ? { ...item, ...fields } : item)) ?? null);

  const chosen = items?.filter((item) => item.selected) ?? [];
  const toCheck = items?.filter((item) => !item.complete).length ?? 0;

  const save = async () => {
    if (!title.trim()) {
      setError('Escreva o nome do livro: ele fica guardado em cada receita, como a fonte.');
      return;
    }
    if (chosen.some((item) => !item.name.trim())) {
      setError('Há receita marcada sem nome. Dê um nome a ela ou desmarque.');
      return;
    }
    setError('');
    setSaving(true);
    const now = new Date().toISOString();
    // Enviar o mesmo livro de novo não duplica o que já foi salvo.
    const fresh = chosen.filter((item) => !mine.some((recipe) => recipe.book && sameName(recipe.book.title, title) && sameName(recipe.name, item.name)));
    try {
      for (const item of fresh) await saveMine(toRecipe(item, title, now));
      await reload();
      setSaved({ added: fresh.length, skipped: chosen.length - fresh.length });
      setItems(null);
    } catch {
      setError('Não foi possível salvar. Verifique o espaço livre no aparelho e tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <a className="back" href="#/minhas">Voltar</a>
      <h1>Enviar livro de receitas</h1>
      <p className="muted small">
        Envie o arquivo do seu livro e confira o que foi encontrado. Ele é lido aqui mesmo: o arquivo não sai do aparelho, e as receitas ficam só nele.
      </p>
      <label className="field">
        <span>Nome do livro</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Meu livro de receitas" />
      </label>
      <label className="field">
        <span>Arquivo do livro (PDF com texto ou TXT)</span>
        <input type="file" accept=".pdf,.txt,application/pdf,text/plain" disabled={Boolean(progress)} onChange={(event) => void onFile(event)} />
      </label>
      {progress && <p className="info" role="status">{progress}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {saved && (
        <div className="info" role="status">
          <p>
            {saved.added} {saved.added === 1 ? 'receita salva' : 'receitas salvas'} em Minhas Receitas.
            {saved.skipped > 0 && ` ${saved.skipped} já ${saved.skipped === 1 ? 'estava salva' : 'estavam salvas'}.`}
          </p>
          <a href="#/minhas">Ver Minhas Receitas</a>
        </div>
      )}
      {items?.length === 0 && (
        <p className="info" role="status">
          Não encontrei receitas neste arquivo. Procuro por títulos como "Ingredientes" e "Modo de preparo"; se o livro usa outros, use Colar texto em Minhas Receitas.
        </p>
      )}
      {items && items.length > 0 && (
        <section className="stack">
          <h2>{items.length === 1 ? '1 receita encontrada' : `${items.length} receitas encontradas`}</h2>
          {toCheck > 0 && (
            <p className="muted small">
              {toCheck === 1 ? '1 pede conferência e não está marcada' : `${toCheck} pedem conferência e não estão marcadas`}: o texto pode ter saído misturado. Abra, corrija e marque para salvar.
            </p>
          )}
          <div className="actions">
            <button type="button" className="button primary" disabled={saving || chosen.length === 0} onClick={() => void save()}>
              Salvar {chosen.length} {chosen.length === 1 ? 'receita' : 'receitas'}
            </button>
            <button type="button" className="button" onClick={() => setItems(items.map((item) => ({ ...item, selected: false })))}>Desmarcar todas</button>
          </div>
          {items.map((item) => (
            <div className="book-recipe" key={item.key}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={item.selected}
                  aria-label={`Salvar ${item.name || 'receita sem nome'}`}
                  onChange={() => change(item.key, { selected: !item.selected })}
                />
                <span>
                  {item.name || 'Sem nome'}
                  {item.page !== null && <span className="muted small"> · página {item.page}</span>}
                </span>
              </label>
              {!item.complete && <span className="note">Conferir</span>}
              <details className="filters">
                <summary>Ver e corrigir</summary>
                <div className="stack">
                  <label className="field">
                    <span>Nome</span>
                    <input value={item.name} onChange={(event) => change(item.key, { name: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Ingredientes, um por linha</span>
                    <textarea rows={6} value={item.ingredientsText} onChange={(event) => change(item.key, { ingredientsText: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Modo de preparo, um passo por linha</span>
                    <textarea rows={6} value={item.stepsText} onChange={(event) => change(item.key, { stepsText: event.target.value })} />
                  </label>
                  {item.notes && <p className="muted small">Anotações do livro: {item.notes}</p>}
                </div>
              </details>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
