import { pluralizePhrase, singularizePhrase } from './plural';
import type { Ingredient, Recipe } from './types';

export const DEFAULT_SERVINGS_UNIT = 'pessoas';

/** A unidade sempre no plural, como quer que tenha sido digitada: "docinho" e "docinhos" são a mesma. */
export function servingsUnitOf(recipe: Pick<Recipe, 'servingsUnit'>): string {
  const typed = recipe.servingsUnit?.trim().toLowerCase();
  return typed ? pluralizePhrase(typed) : DEFAULT_SERVINGS_UNIT;
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

/** Abaixo de 2 o português usa o singular: "1,5 pessoa", "1 docinho". */
export function unitLabel(unit: string, servings: number): string {
  return servings >= 2 ? unit : singularizePhrase(unit);
}

export function servingsText(recipe: Pick<Recipe, 'servings' | 'servingsUnit'>): string {
  if (!recipe.servings) return '';
  const unit = servingsUnitOf(recipe);
  return `${servingsVerb(unit)} ${formatServings(recipe.servings)} ${unitLabel(unit, recipe.servings)}`;
}

/** Só viram símbolo as frações que a quantidade realmente é, nunca a mais próxima. */
const FRACTIONS: [number, string, number][] = [
  [1 / 4, '¼', 0.005],
  [1 / 3, '⅓', 0.01],
  [1 / 2, '½', 0.005],
  [2 / 3, '⅔', 0.01],
  [3 / 4, '¾', 0.005],
];

/** Peso e volume ficam em decimal, como na embalagem: 0,05 l, 1,2 l, 0,5 kg. */
const METRIC_UNITS = new Set(['g', 'kg', 'ml', 'l']);

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

function formatDecimal(quantity: number): string {
  const rounded = quantity < 1 ? Number(quantity.toPrecision(3)) : Math.round(quantity * (quantity < 10 ? 100 : 10)) / (quantity < 10 ? 100 : 10);
  return String(rounded).replace('.', ',');
}

/** Mostra a quantidade como ela é: não arredonda para a fração nem para o inteiro mais próximos. */
export function formatQuantity(quantity: number, unit = ''): string {
  const nearest = Math.round(quantity);
  if (nearest > 0 && Math.abs(quantity - nearest) < 0.001) return String(nearest);
  if (METRIC_UNITS.has(unit)) return formatDecimal(quantity);
  const whole = Math.floor(quantity);
  const part = quantity - whole;
  const fraction = FRACTIONS.find(([value, , tolerance]) => Math.abs(value - part) < tolerance);
  if (!fraction) return formatDecimal(quantity);
  return whole ? `${whole} ${fraction[1]}` : fraction[1];
}

export function formatIngredient(ingredient: Ingredient, factor = 1): string {
  const { quantity, quantityMax, unit, name } = ingredient;
  if (quantity === null) return unit ? `${name} ${unit}` : name;
  const scaled = quantity * factor;
  const top = (quantityMax ?? quantity) * factor;
  const amount = quantityMax ? `${formatQuantity(scaled, unit)} a ${formatQuantity(top, unit)}` : formatQuantity(scaled, unit);
  if (!unit) return `${amount} ${top >= 2 ? pluralizePhrase(name) : singularizePhrase(name)}`;
  const unitText = top >= 2 ? (UNIT_PLURALS[unit] ?? unit) : unit;
  return `${amount} ${unitText} de ${name}`;
}
