import type { Ingredient } from './types';

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
