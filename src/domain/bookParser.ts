import type { PageLine } from './bookLines';

export type BookPage = { page: number | null; lines: PageLine[] };

/** O que o livro diz, sem completar nada. O que faltar fica faltando e é apontado na conferência. */
export type BookRecipe = {
  name: string;
  page: number | null;
  ingredients: string[];
  steps: string[];
  servings: number | null;
  servingsUnit: string;
  notes: string;
  /** Tem nome, ingredientes e preparo em quantidade plausível; senão, pede conferência. */
  complete: boolean;
};

type Entry = PageLine & { page: number | null };

const INGREDIENTS_HEADING = /^ingredientes\b[^,.]{0,35}:?$/i;
const STEPS_HEADING = /^(?:modo de (?:preparo|fazer)|preparo|como fazer)\s*:?$/i;
const YIELD = /^(?:rendimento|rende|serve)\s*:?\s+(.+)$/i;
const NOTE = /^(?:dicas?|observaç(?:ão|ões)|obs\.?|nota|variaç(?:ão|ões))\s*:/i;
const TITLE_SEARCH = 8;
const MAX_PLAUSIBLE_ITEMS = 40;

function headerKey(text: string): string {
  return text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Tira número de página e o que se repete no topo ou no pé de várias páginas. */
function readingOrder(pages: BookPage[]): Entry[] {
  const edgeCount = new Map<string, number>();
  for (const { lines } of pages) {
    const edges = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map((line) => headerKey(line.text)));
    for (const key of edges) if (key) edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
  }
  const isHeading = (text: string) => INGREDIENTS_HEADING.test(text) || STEPS_HEADING.test(text);
  return pages.flatMap(({ page, lines }) =>
    lines
      .filter(({ text }, index) => {
        if (/^\d+$/.test(text.trim())) return false;
        const atEdge = index < 2 || index >= lines.length - 2;
        return !(atEdge && !isHeading(text) && (edgeCount.get(headerKey(text)) ?? 0) >= 3);
      })
      .map((line) => ({ ...line, page })),
  );
}

/** O tamanho de letra mais comum é o do texto corrido. */
function bodySize(entries: Entry[]): number {
  const counts = new Map<number, number>();
  for (const { size } of entries) if (size) counts.set(Math.round(size), (counts.get(Math.round(size)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** "li-" + "quidificador" é uma palavra só. */
function joinWrapped(lines: string[]): string {
  return lines.reduce((text, line) => {
    if (!text) return line;
    return /\p{L}-\s*$/u.test(text) && /^\p{Ll}/u.test(line) ? text.replace(/-\s*$/, '') + line : `${text} ${line}`;
  }, '');
}

function readSteps(lines: string[]): string[] {
  const numbered = lines.reduce<string[]>((steps, line) => {
    if (/^\d{1,2}[.)º]\s*\p{L}/u.test(line) || steps.length === 0) steps.push(line);
    else steps[steps.length - 1] = joinWrapped([steps[steps.length - 1], line]);
    return steps;
  }, []);
  if (numbered.length > 1) return numbered.map((step) => step.replace(/^\d{1,2}[.)º]\s*/, ''));
  // Parágrafo corrido: um passo por frase, para o Modo cozinha mostrar um de cada vez.
  return joinWrapped(lines)
    .replace(/([.!?])\s+(?=\p{Lu})/gu, '$1\n')
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean);
}

/** Linha que continua a anterior: "(deixar de molho na água com sal" + "e limão)". */
function readIngredients(lines: string[]): string[] {
  return lines.reduce<string[]>((items, line) => {
    const last = items[items.length - 1];
    const open = last ? (last.match(/\(/g)?.length ?? 0) - (last.match(/\)/g)?.length ?? 0) : 0;
    if (open > 0 || (last && /[,-]$/.test(last))) items[items.length - 1] = joinWrapped([last, line]);
    else items.push(line);
    return items;
  }, []);
}

/** Cada dica começa com seu rótulo; as demais linhas a continuam. */
function readNotes(lines: string[]): string[] {
  return lines.reduce<string[]>((notes, line) => {
    if (NOTE.test(line) || notes.length === 0) notes.push(line);
    else notes[notes.length - 1] = joinWrapped([notes[notes.length - 1], line]);
    return notes;
  }, []);
}

function readYield(text: string): { servings: number; servingsUnit: string } | null {
  const match = text.replace(/\.$/, '').match(/^(\d+(?:[.,]\d+)?)\s+([\p{L} ]+)$/u);
  return match ? { servings: Number(match[1].replace(',', '.')), servingsUnit: match[2].trim().toLowerCase() } : null;
}

function findTitle(entries: Entry[], heading: number, floor: number, body: number): number {
  const lowest = Math.max(floor, heading - TITLE_SEARCH);
  // A mais próxima: mais acima, a letra grande costuma ser o nome do capítulo.
  for (let index = heading - 1; index >= lowest; index--) {
    if (body && entries[index].size > body * 1.1) return index;
  }
  return heading - 1 >= floor ? heading - 1 : -1;
}

/** Frase de preparo acima de "Ingredientes": é a segunda parte da mesma receita (massa, recheio), não outra. */
function looksLikeSentence(text: string): boolean {
  return /[.;:]$/.test(text.trim()) || /^\p{Ll}/u.test(text.trim());
}

/** Fonte ilegível no PDF ou colunas misturadas: o texto saiu, mas precisa de conferência. */
function looksGarbled(text: string): boolean {
  // De U+0180 em diante são letras raras em receita; "ō" (shōyu) ainda é aceito.
  return /[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{M}\s]/u.test(text) || /[\u0000-\u0008\u000e-\u001fƀ-˿]/.test(text);
}

function mixesColumns(step: string): boolean {
  return /\s\d{1,2}\.\s+\p{Lu}/u.test(step);
}

function readRecipe(entries: Entry[], title: number, heading: number, end: number, body: number): BookRecipe {
  const ingredients: string[] = [];
  const steps: string[] = [];
  const notes: string[] = [];
  let yields = '';
  let section: 'ingredients' | 'steps' | 'after' = 'ingredients';
  for (let index = heading + 1; index < end; index++) {
    const { text, size } = entries[index];
    // Letra bem maior depois do preparo é o começo de outro assunto, não parte da receita.
    if (steps.length && body && size > body * 1.3) break;
    if (INGREDIENTS_HEADING.test(text)) {
      section = 'ingredients';
      continue;
    }
    if (STEPS_HEADING.test(text)) {
      section = 'steps';
      continue;
    }
    const yieldMatch = text.match(YIELD);
    if (yieldMatch && !yields) {
      yields = yieldMatch[1].trim();
      if (section === 'steps') section = 'after';
      continue;
    }
    if (NOTE.test(text)) section = 'after';
    if (section === 'ingredients') ingredients.push(text);
    else if (section === 'steps') steps.push(text);
    else notes.push(text);
  }
  const parsedYield = yields ? readYield(yields) : null;
  const items = readIngredients(ingredients);
  const preparation = readSteps(steps);
  const name = title === -1 ? '' : entries[title].text.trim();
  return {
    name,
    page: entries[title === -1 ? heading : title].page,
    ingredients: items,
    steps: preparation,
    servings: parsedYield?.servings ?? null,
    servingsUnit: parsedYield?.servingsUnit ?? '',
    notes: [...(yields && !parsedYield ? [`Rendimento no livro: ${yields}`] : []), ...readNotes(notes)].join('\n'),
    complete:
      Boolean(name && !/\d%/.test(name) && !looksLikeSentence(name) && items.length && preparation.length) &&
      items.length <= MAX_PLAUSIBLE_ITEMS &&
      preparation.length <= MAX_PLAUSIBLE_ITEMS &&
      ![name, ...items, ...preparation].some(looksGarbled) &&
      !preparation.some(mixesColumns),
  };
}

export function parseBook(pages: BookPage[]): BookRecipe[] {
  const entries = readingOrder(pages);
  const body = bodySize(entries);
  const headings = entries.flatMap(({ text }, index) => (INGREDIENTS_HEADING.test(text) ? [index] : []));
  // Duas linhas "Ingredientes" sem preparo entre elas são partes da mesma receita ("Ingredientes da massa").
  const starts = headings.filter((heading, position) => {
    const previous = headings[position - 1];
    if (previous === undefined) return true;
    if (!entries.slice(previous, heading).some(({ text }) => STEPS_HEADING.test(text))) return false;
    const title = findTitle(entries, heading, previous + 1, body);
    return title !== -1 && !looksLikeSentence(entries[title].text);
  });
  const titles: number[] = [];
  starts.forEach((heading, position) => {
    const floor = position === 0 ? 0 : starts[position - 1] + 1;
    titles.push(findTitle(entries, heading, floor, body));
  });
  return starts.map((heading, position) => {
    const nextTitle = titles[position + 1];
    const end = position + 1 < starts.length ? (nextTitle === -1 ? starts[position + 1] : nextTitle) : entries.length;
    return readRecipe(entries, titles[position], heading, end, body);
  });
}
