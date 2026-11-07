import { useEffect, useState, type FormEvent } from 'react';
import { parseIngredientLine, parseSteps } from '../../domain/parser';
import { DEFAULT_SERVINGS_UNIT, formatIngredient, formatServings, servingsUnitOf } from '../../domain/portions';
import type { Category, Diet, Ingredient, Recipe, RecipeKind } from '../../domain/types';
import { setMark } from '../../storage/marks';
import { newId, saveMine } from '../../storage/recipes';
import { resizePhoto } from '../photo';
import { useRecipes } from '../useRecipes';

const CATEGORIES: Category[] = ['doces', 'bolos', 'massas', 'carnes', 'aves', 'peixes', 'arroz e feijão', 'salgadinhos', 'vegetariano', 'bebidas'];
const UNIT_SUGGESTIONS = ['pessoas', 'docinhos', 'fatias', 'pedaços', 'unidades', 'copos', 'salgadinhos'];
const DIETS: [keyof Diet, string][] = [
  ['vegetarian', 'Vegetariana'],
  ['lactoseFree', 'Sem lactose'],
  ['glutenFree', 'Sem glúten'],
];

function readNumber(text: string): number | null {
  const value = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(value) && value > 0 ? value : null;
}

/** Linhas que não mudaram mantêm o ingrediente original, com o nome-base. */
function readIngredients(text: string, originals: Ingredient[]): Ingredient[] {
  const byLine = new Map(originals.map((ingredient) => [formatIngredient(ingredient), ingredient]));
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => byLine.get(line) ?? parseIngredientLine(line));
}

type Fields = {
  name: string;
  ingredients: string;
  steps: string;
  videoUrl: string;
  markTry: boolean;
  minutes: string;
  servings: string;
  servingsUnit: string;
  kind: RecipeKind;
  categories: Category[];
  diet: Diet;
  notes: string;
  leftoverText: string;
};

const DRAFT_KEY = 'receitario.rascunho';

function fieldsFrom(initial: Partial<Recipe>, leftovers: string[]): Fields {
  return {
    name: initial.name ?? '',
    ingredients: (initial.ingredients ?? []).map((i) => formatIngredient(i)).join('\n'),
    steps: (initial.steps ?? []).join('\n'),
    videoUrl: initial.videoUrl ?? '',
    markTry: false,
    minutes: initial.minutes ? String(initial.minutes) : '',
    servings: initial.servings ? formatServings(initial.servings) : '',
    servingsUnit: servingsUnitOf(initial),
    kind: initial.kind ?? 'salgado',
    categories: initial.categories ?? [],
    diet: initial.diet ?? { vegetarian: false, lactoseFree: false, glutenFree: false },
    notes: initial.notes ?? '',
    leftoverText: leftovers.join('\n'),
  };
}

const BLANK = JSON.stringify(fieldsFrom({}, []));

function loadDraft(): Fields | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? { ...fieldsFrom({}, []), ...JSON.parse(saved) } : null;
  } catch {
    return null;
  }
}

function writeDraft(serialized: string | null): void {
  try {
    if (serialized) localStorage.setItem(DRAFT_KEY, serialized);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Sem armazenamento, o rascunho vale só enquanto a tela estiver aberta.
  }
}

export function RecipeForm({
  initial = {},
  leftovers = [],
  draft = false,
}: {
  initial?: Partial<Recipe>;
  leftovers?: string[];
  /** Guarda o que foi digitado: o Android pode fechar o aplicativo enquanto a pessoa volta ao vídeo. */
  draft?: boolean;
}) {
  const { reload } = useRecipes();
  const isEditing = Boolean(initial.id);
  const [start] = useState(() => {
    const received = fieldsFrom(initial, leftovers);
    // O que acabou de chegar pelo menu Compartilhar vale mais que um rascunho antigo.
    const restored = draft && JSON.stringify(received) === BLANK ? loadDraft() : null;
    return { fields: restored ?? received, restored: Boolean(restored) };
  });
  const [baseline] = useState(() => (draft ? BLANK : JSON.stringify(fieldsFrom(initial, leftovers))));
  const [name, setName] = useState(start.fields.name);
  const [ingredients, setIngredients] = useState(start.fields.ingredients);
  const [steps, setSteps] = useState(start.fields.steps);
  const [videoUrl, setVideoUrl] = useState(start.fields.videoUrl);
  const [markTry, setMarkTry] = useState(start.fields.markTry);
  const [minutes, setMinutes] = useState(start.fields.minutes);
  const [servings, setServings] = useState(start.fields.servings);
  const [servingsUnit, setServingsUnit] = useState(start.fields.servingsUnit);
  const [kind, setKind] = useState<RecipeKind>(start.fields.kind);
  const [categories, setCategories] = useState<Category[]>(start.fields.categories);
  const [diet, setDiet] = useState<Diet>(start.fields.diet);
  const [notes, setNotes] = useState(start.fields.notes);
  const [leftoverText, setLeftoverText] = useState(start.fields.leftoverText);
  const [showLeftovers] = useState(Boolean(start.fields.leftoverText));
  const [photo, setPhoto] = useState<Blob | undefined>(initial.photo);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const serialized = JSON.stringify(
    { name, ingredients, steps, videoUrl, markTry, minutes, servings, servingsUnit, kind, categories, diet, notes, leftoverText } satisfies Fields,
  );
  const dirty = serialized !== baseline || photo !== initial.photo;

  useEffect(() => {
    if (draft) writeDraft(serialized === BLANK ? null : serialized);
  }, [draft, serialized]);

  const leave = () => {
    if (draft) writeDraft(null);
    window.location.hash = isEditing ? `#/receita/${initial.id}` : '#/minhas';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Dê um nome à receita para salvar.');
      return;
    }
    setSaving(true);
    setError('');
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: initial.id ?? newId(),
      source: 'mine',
      // Receita pronta editada mantém o id: favorita, compras e links continuam valendo.
      originId: initial.source === 'catalog' ? initial.id : initial.originId,
      name: name.trim(),
      kind,
      categories,
      diet,
      minutes: readNumber(minutes),
      servings: readNumber(servings),
      servingsUnit: servingsUnit.trim().toLowerCase() || DEFAULT_SERVINGS_UNIT,
      ingredients: readIngredients(ingredients, initial.ingredients ?? []),
      steps: parseSteps(steps),
      notes: [notes.trim(), leftoverText.trim()].filter(Boolean).join('\n'),
      videoUrl: videoUrl.trim(),
      photo,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveMine(recipe);
    } catch {
      // A causa mais provável é falta de espaço: a receita não pode se perder por causa da foto.
      try {
        await saveMine({ ...recipe, photo: undefined });
        setError('');
      } catch {
        setSaving(false);
        setError('Não foi possível salvar. Verifique o espaço livre no aparelho e tente de novo.');
        return;
      }
    }
    if (draft) writeDraft(null);
    if (markTry) await setMark(recipe.id, 'try');
    await reload();
    window.location.hash = `#/receita/${recipe.id}`;
  };

  return (
    <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
      <div className="form-head">
        <h1>{isEditing ? 'Editar receita' : 'Nova receita'}</h1>
        <div className="actions">
          <button type="button" className="button" onClick={() => (dirty ? setConfirmingCancel(true) : leave())}>Cancelar</button>
          <button type="submit" className="button primary" disabled={saving}>Salvar</button>
        </div>
      </div>
      {confirmingCancel && (
        <div className="confirm" role="alertdialog" aria-label="Confirmar descarte">
          <p>Descartar o que você escreveu?</p>
          <div className="actions">
            <button type="button" className="button danger-solid" onClick={leave}>Sim, descartar</button>
            <button type="button" className="button" onClick={() => setConfirmingCancel(false)}>Continuar escrevendo</button>
          </div>
        </div>
      )}
      {start.restored && <p className="info">Rascunho recuperado. Continue de onde parou.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <label className="field">
        <span>Nome</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Pão de queijo de frigideira" />
      </label>
      {showLeftovers && (
        <div className="stack">
          <label className="field">
            <span>Texto não reconhecido</span>
            <textarea rows={Math.min(8, start.fields.leftoverText.split('\n').length + 2)} value={leftoverText} onChange={(event) => setLeftoverText(event.target.value)} />
          </label>
          <p className="muted small">Copie daqui o que for ingrediente ou preparo. O que sobrar vai para as anotações.</p>
        </div>
      )}
      <div className="form-columns">
        <label className="field">
          <span>Ingredientes, um por linha</span>
          <textarea rows={7} value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder={'1 ovo\n3 colheres de sopa de tapioca\n2 colheres de sopa de queijo'} />
        </label>
        <label className="field">
          <span>Modo de preparo, um passo por linha</span>
          <textarea rows={7} value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={'Misture tudo em uma tigela.\nDoure na frigideira por 3 minutos de cada lado.'} />
        </label>
      </div>
      <label className="field">
        <span>Link do vídeo (opcional)</span>
        <input type="url" inputMode="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Instagram ou TikTok" />
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Quanto rende</span>
          <input inputMode="decimal" value={servings} onChange={(event) => setServings(event.target.value)} placeholder="Ex.: 4 ou 1,5" />
        </label>
        <label className="field">
          <span>Unidade, no plural</span>
          <input list="servings-units" value={servingsUnit} onChange={(event) => setServingsUnit(event.target.value)} placeholder="pessoas, docinhos, fatias" />
          <datalist id="servings-units">
            {UNIT_SUGGESTIONS.map((unit) => <option key={unit} value={unit} />)}
          </datalist>
        </label>
      </div>
      <p className="muted small">Serve 4 pessoas, rende 20 docinhos, rende 12 fatias. Com isso preenchido, dá para ajustar as quantidades na receita.</p>
      {!isEditing && (
        <label className="check">
          <input type="checkbox" checked={markTry} onChange={(event) => setMarkTry(event.target.checked)} />
          <span>Marcar como Quero testar</span>
        </label>
      )}
      <details className="filters">
        <summary>Mais detalhes (opcional)</summary>
        <div className="stack">
          <label className="field">
            <span>Tempo de preparo em minutos</span>
            <input inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as RecipeKind)}>
              <option value="salgado">Salgado</option>
              <option value="doce">Doce</option>
              <option value="ambos">Doce e salgado</option>
            </select>
          </label>
          <fieldset className="checks">
            <legend>Categorias</legend>
            {CATEGORIES.map((category) => (
              <label className="check" key={category}>
                <input
                  type="checkbox"
                  checked={categories.includes(category)}
                  onChange={() =>
                    setCategories(categories.includes(category) ? categories.filter((c) => c !== category) : [...categories, category])
                  }
                />
                <span>{category[0].toUpperCase() + category.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="checks">
            <legend>Restrições</legend>
            {DIETS.map(([key, label]) => (
              <label className="check" key={key}>
                <input type="checkbox" checked={diet[key]} onChange={() => setDiet({ ...diet, [key]: !diet[key] })} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void resizePhoto(file).then(setPhoto);
              }}
            />
          </label>
          <label className="field">
            <span>Anotações</span>
            <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: usar menos açúcar, assar 10 minutos a mais" />
          </label>
        </div>
      </details>
    </form>
  );
}
