import type { Recipe } from '../domain/types';
import { RecipeArt } from './RecipeArt';

export function recipeMeta(recipe: Recipe): string {
  const kind = recipe.kind === 'doce' ? 'Doce' : 'Salgado';
  return recipe.minutes ? `${recipe.minutes} min · ${kind}` : kind;
}

export function RecipeRow({ recipe, note, ready }: { recipe: Recipe; note?: string; ready?: boolean }) {
  return (
    <a className="recipe-row" href={`#/receita/${recipe.id}`}>
      <RecipeArt recipe={recipe} />
      <span className="recipe-row-text">
        {recipe.source === 'mine' && <span className="tag">Minha receita</span>}
        <span className="recipe-row-name">{recipe.name}</span>
        <span className="muted small">{recipeMeta(recipe)}</span>
        {note && <span className={ready ? 'note ready' : 'note'}>{note}</span>}
      </span>
    </a>
  );
}
