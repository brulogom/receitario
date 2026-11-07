import { servingsText } from '../domain/portions';
import type { Recipe, RecipeKind } from '../domain/types';
import { RecipeArt } from './RecipeArt';

const KIND_LABELS: Record<RecipeKind, string> = { doce: 'Doce', salgado: 'Salgado', ambos: 'Doce e salgado', indefinido: '' };

export function recipeMeta(recipe: Recipe): string {
  return [recipe.minutes ? `${recipe.minutes} min` : '', KIND_LABELS[recipe.kind], servingsText(recipe)].filter(Boolean).join(' · ');
}

export function isEditedCatalog(recipe: Recipe): boolean {
  return recipe.source === 'mine' && recipe.originId === recipe.id;
}

export function recipeTag(recipe: Recipe): string {
  if (recipe.source !== 'mine') return '';
  return isEditedCatalog(recipe) ? 'Editada por mim' : 'Minha receita';
}

export function RecipeRow({ recipe, note, ready }: { recipe: Recipe; note?: string; ready?: boolean }) {
  return (
    <a className="recipe-row" href={`#/receita/${recipe.id}`}>
      <RecipeArt recipe={recipe} />
      <span className="recipe-row-text">
        {recipe.source === 'mine' && <span className="tag">{recipeTag(recipe)}</span>}
        <span className="recipe-row-name">{recipe.name}</span>
        <span className="muted small">{recipeMeta(recipe)}</span>
        {note && <span className={ready ? 'note ready' : 'note'}>{note}</span>}
      </span>
    </a>
  );
}
