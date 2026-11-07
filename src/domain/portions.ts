import type { Ingredient, Recipe } from './types';

export const DEFAULT_SERVINGS_UNIT = 'pessoas';

export function servingsUnitOf(recipe: Pick<Recipe, 'servingsUnit'>): string {
  return recipe.servingsUnit?.trim() || DEFAULT_SERVINGS_UNIT;
}

/** Meia pessoa faz sentido ao dividir uma receita; meio docinho, não. */
export function servingsStep(unit: string): number {
  return unit === DEFAULT_SERVINGS_UNIT ? 0.5 : 1;
}

export function servingsVerb(unit: string): string {
  return unit === DEFAULT_SERVINGS_UNIT ? 'Serve' : 'Rende';
}

export function formatServings(servings: number): string {
  return String(Math.round(servings * 100) / 100).replace('.', ',');
}

function singularWord(word: string): string {
  if (word.endsWith('ães')) return `${word.slice(0, -3)}ão`;
  if (word.endsWith('ns')) return `${word.slice(0, -2)}m`;
  if (/[rz]es$/.test(word)) return word.slice(0, -2);
  return word.replace(/s$/, '');
}

/** Abaixo de 2 o português usa o singular: "1,5 pessoa", "1 fatia". */
export function unitLabel(unit: string, servings: number): string {
  if (servings >= 2) return unit;
  const [first, ...rest] = unit.split(' ');
  return [singularWord(first), ...rest].join(' ');
}

export function servingsText(recipe: Pick<Recipe, 'servings' | 'servingsUnit'>): string {
  if (!recipe.servings) return '';
  const unit = servingsUnitOf(recipe);
  return `${servingsVerb(unit)} ${formatServings(recipe.servings)} ${unitLabel(unit, recipe.servings)}`;
}

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [0.33, '⅓'],
  [0.5, '½'],
  [0.67, '⅔'],
  [0.75, '¾'],
];

const UNIT_PLURALS: Record<string, string> = {
  xícara: 'xícaras',
  'colher de sopa': 'colheres de sopa',
  'colher de chá': 'colheres de chá',
  lata: 'latas',
  caixa: 'caixas',
  pacote: 'pacotes',
  dente: 'dentes',
  folha: 'folhas',
  copo: 'copos',
  pitada: 'pitadas',
};

export function scaleQuantity(quantity: number, from: number, to: number): number {
  return (quantity * to) / from;
}

export function formatQuantity(quantity: number): string {
  if (quantity >= 10) return String(Math.round(quantity));
  let whole = Math.floor(quantity);
  let part = quantity - whole;
  if (part > 0.9) {
    whole += 1;
    part = 0;
  }
  if (part < 0.1) return String(whole || 1);
  const [, symbol] = FRACTIONS.reduce((best, item) =>
    Math.abs(item[0] - part) < Math.abs(best[0] - part) ? item : best,
  );
  return whole ? `${whole} ${symbol}` : symbol;
}

function pluralizeName(name: string): string {
  const [first, ...rest] = name.split(' ');
  if (first.endsWith('s')) return name;
  const plural = /[aeiou]$/i.test(first) ? `${first}s` : `${first}es`;
  return [plural, ...rest].join(' ');
}

export function formatIngredient(ingredient: Ingredient, factor = 1): string {
  const { quantity, unit, name } = ingredient;
  if (quantity === null) return unit ? `${name} ${unit}` : name;
  const scaled = quantity * factor;
  const amount = formatQuantity(scaled);
  if (!unit) return `${amount} ${scaled >= 2 ? pluralizeName(name) : name}`;
  const unitText = scaled >= 2 ? (UNIT_PLURALS[unit] ?? unit) : unit;
  return `${amount} ${unitText} de ${name}`;
}
