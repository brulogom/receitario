import { parseRecipeText } from '../domain/parser';
import { isHttpUrl } from '../domain/text';
import type { Recipe } from '../domain/types';

export type Share = { recipe: Partial<Recipe>; leftovers: string[] };

/** Lê o que o menu Compartilhar do Android entrega ao abrir o aplicativo. */
export function readShare(search: string): Share | null {
  const params = new URLSearchParams(search);
  const title = params.get('title')?.trim() ?? '';
  const rawUrl = params.get('url')?.trim() ?? '';
  let text = params.get('text')?.trim() ?? '';
  if (!title && !rawUrl && !text) return null;

  const recipe: Partial<Recipe> = {};
  const leftovers: string[] = [];

  let videoUrl = '';
  if (isHttpUrl(rawUrl)) videoUrl = rawUrl;
  else if (rawUrl) leftovers.push(rawUrl);

  // Instagram e TikTok costumam mandar o link dentro do texto.
  const linkInText = text.match(/https?:\/\/\S+/i);
  if (linkInText) {
    videoUrl ||= linkInText[0];
    text = text.replace(linkInText[0], '').trim();
  }
  if (videoUrl) recipe.videoUrl = videoUrl;

  if (text) {
    const parsed = parseRecipeText(text);
    if (parsed.name) recipe.name = parsed.name;
    if (parsed.ingredients.length) recipe.ingredients = parsed.ingredients;
    if (parsed.steps.length) recipe.steps = parsed.steps;
    leftovers.push(...parsed.unrecognized);
  }
  if (title && !recipe.name) recipe.name = title;
  return { recipe, leftovers };
}
