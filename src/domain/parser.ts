import { normalize } from './text';
import type { Ingredient } from './types';

const VULGAR: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const VULGAR_CLASS = '½¼¾⅓⅔';

const QUANTITY = new RegExp(
  `^(\\d+\\s*(?:e\\s*)?\\d+/\\d+|\\d+\\s*(?:e\\s*)?[${VULGAR_CLASS}]|\\d+/\\d+|\\d+[.,]\\d+|\\d+|[${VULGAR_CLASS}])(?![\\d/])\\s*`,
  'i',
);

const UNITS: [RegExp, string][] = [
  [/^x[ií]c(?:aras?|\.)?(?:\s*\(?(?:de\s+)?ch[aá]\)?)?(?=\s|$)/i, 'xícara'],
  [/^colher(?:es)?\s*(?:de\s+|\(\s*)sopa\)?(?=\s|$)/i, 'colher de sopa'],
  [/^colher(?:es)?\s*(?:de\s+|\(\s*)ch[aá]\)?(?=\s|$)/i, 'colher de chá'],
  [/^latas?(?=\s|$)/i, 'lata'],
  [/^caixas?(?=\s|$)/i, 'caixa'],
  [/^pacotes?(?=\s|$)/i, 'pacote'],
  [/^dentes?(?=\s|$)/i, 'dente'],
  [/^folhas?(?=\s|$)/i, 'folha'],
  [/^copos?(?=\s|$)/i, 'copo'],
  [/^pitadas?(?=\s|$)/i, 'pitada'],
  [/^kg(?=\s|$)/i, 'kg'],
  [/^g(?=\s|$)/i, 'g'],
  [/^ml(?=\s|$)/i, 'ml'],
  [/^l(?=\s|$)/i, 'l'],
];

const HEADINGS: Record<string, 'ingredients' | 'steps'> = {
  ingredientes: 'ingredients',
  'modo de preparo': 'steps',
  preparo: 'steps',
  'como fazer': 'steps',
  'modo de fazer': 'steps',
};

function stripBullet(line: string): string {
  return line.replace(/^\s*[-–—•*·▪️✅🔸🔹]+\s*/u, '').trim();
}

function readQuantity(text: string): number {
  const mixed = text.match(/^(\d+)\s*(?:e\s*)?(\d+)\/(\d+)$/i);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const mixedVulgar = text.match(new RegExp(`^(\\d+)\\s*(?:e\\s*)?([${VULGAR_CLASS}])$`, 'i'));
  if (mixedVulgar) return Number(mixedVulgar[1]) + VULGAR[mixedVulgar[2]];
  if (text in VULGAR) return VULGAR[text];
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  // Em português, "1.000" é mil, não um.
  if (/^\d{1,3}\.\d{3}$/.test(text)) return Number(text.replace('.', ''));
  return Number(text.replace(',', '.'));
}

export function parseIngredientLine(line: string): Ingredient {
  const clean = stripBullet(line);
  const toTaste = clean.match(/^(.+?)\s+a gosto\.?$/i);
  const match = clean.match(QUANTITY);
  if (!match) {
    if (toTaste) return { quantity: null, unit: 'a gosto', name: toTaste[1] };
    return { quantity: null, unit: '', name: clean };
  }
  const quantity = readQuantity(match[1].trim());
  const rest = clean.slice(match[0].length).trim();
  if (!Number.isFinite(quantity) || quantity <= 0 || !rest) return { quantity: null, unit: '', name: clean };
  for (const [pattern, unit] of UNITS) {
    const found = rest.match(pattern);
    if (found) {
      const name = rest.slice(found[0].length).trim().replace(/^de\s+/i, '');
      if (name) return { quantity, unit, name };
    }
  }
  return { quantity, unit: '', name: rest.replace(/^de\s+/i, '') };
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseIngredientLines(text: string): Ingredient[] {
  return lines(text).map(parseIngredientLine);
}

export function parseSteps(text: string): string[] {
  return lines(text)
    // Só é numeração se vier seguida de uma letra: "180º por..." e "10 - 15 minutos" fazem parte do passo.
    .map((line) => stripBullet(line.replace(/^\d{1,2}(?:[.)ºª]|\s*-)\s*(?=\p{L})/u, '')))
    .filter(Boolean);
}

function headingOf(line: string): 'ingredients' | 'steps' | null {
  const key = normalize(line).replace(/^[^a-z]+|[^a-z]+$/g, '');
  return HEADINGS[key] ?? null;
}

export function parseRecipeText(text: string): {
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  unrecognized: string[];
} {
  const all = lines(text);
  const unrecognized: string[] = [];
  if (!all.some(headingOf)) {
    return { name: '', ingredients: [], steps: [], unrecognized: all };
  }
  let name = '';
  const ingredients: Ingredient[] = [];
  const steps: string[] = [];
  let section: 'intro' | 'ingredients' | 'steps' = 'intro';
  for (const line of all) {
    const heading = headingOf(line);
    if (heading) {
      section = heading;
    } else if (/^[#@]/.test(line)) {
      unrecognized.push(line);
    } else if (section === 'ingredients') {
      ingredients.push(parseIngredientLine(line));
    } else if (section === 'steps') {
      steps.push(...parseSteps(line));
    } else if (!name) {
      name = line;
    } else {
      unrecognized.push(line);
    }
  }
  return { name, ingredients, steps, unrecognized };
}
