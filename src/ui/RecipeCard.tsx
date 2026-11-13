import type { Recipe } from '../domain/types';
import { RecipeArt } from './RecipeArt';
import { recipeMeta, recipeTag } from './RecipeRow';
import { Stars } from './RecipePanels';

/** Cartão com a foto em cima, para a grade da tela inicial. */
export function RecipeCard({ recipe, rating }: { recipe: Recipe; rating: number | null }) {
  return (
    <a className="recipe-card" href={`#/receita/${recipe.id}`}>
      <RecipeArt recipe={recipe} />
      <span className="recipe-card-text">
        {recipe.source === 'mine' && <span className="tag">{recipeTag(recipe)}</span>}
        <span className="recipe-card-name">{recipe.name}</span>
        <span className="muted small">{recipeMeta(recipe)}</span>
        {rating !== null && <Stars rating={rating} />}
      </span>
    </a>
  );
}
