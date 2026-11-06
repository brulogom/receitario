import { normalize } from './text';
import type { Ingredient } from './types';

function singular(text: string): string {
  return text
    .split(' ')
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
    .join(' ');
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

function sameExpression(a: string, b: string): boolean {
  const left = singular(normalize(a));
  const right = singular(normalize(b));
  if (left === right) return true;
  // Erro de digitação só conta em palavras maiores e sem mudar a quantidade de palavras:
  // assim "batata" nunca vira "batata-doce" e "sal" nunca vira "sol".
  return left.length >= 5 && left.split(' ').length === right.split(' ').length && editDistance(left, right) <= 1;
}

/** Compara a expressão inteira com o nome-base e o nome digitado. Na dúvida, não considera igual. */
export function ingredientMatches(term: string, ingredient: Ingredient): boolean {
  if (ingredient.base && sameExpression(term, ingredient.base)) return true;
  return sameExpression(term, ingredient.name);
}

export function ingredientKey(ingredient: Ingredient): string {
  return singular(normalize(ingredient.base ?? ingredient.name));
}
