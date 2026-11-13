import { normalize } from './text';
import type { Recipe } from './types';

const MAX_LENGTH = 30;

/** "Natal, rápida,  natal" vira ["Natal", "rápida"]: sem repetir, mesmo com acento ou maiúscula diferente. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const tag = part.replace(/\s+/g, ' ').trim().replace(/^#+/, '').trim().slice(0, MAX_LENGTH).trim();
    const key = normalize(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function sameTag(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** Todas as etiquetas em uso, das mais usadas para as menos usadas. */
export function allTags(recipes: Recipe[]): string[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const recipe of recipes) {
    for (const tag of recipe.tags ?? []) {
      const key = normalize(tag);
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pt-BR'))
    .map((entry) => entry.tag);
}
