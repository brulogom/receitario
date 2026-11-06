import { useEffect, useState } from 'react';
import type { Recipe } from '../domain/types';

const SWEET = 'M4 11h16v9H4zM4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M8 11V8M12 11V8M16 11V8M8 5v.01M12 5v.01M16 5v.01';
const SAVORY = 'M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2';

export function RecipeArt({ recipe, large = false }: { recipe: Recipe; large?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe.photo) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(recipe.photo);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [recipe.photo]);

  const className = `art ${recipe.kind} ${large ? 'large' : ''}`;
  if (url) return <img className={className} src={url} alt="" />;
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={recipe.kind === 'doce' ? SWEET : SAVORY} />
      </svg>
    </span>
  );
}
