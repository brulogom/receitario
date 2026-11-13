/** Palavras que encerram a parte flexionada: em "dente de alho", só "dente" muda. */
const CONNECTORS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'em', 'no', 'na', 'nos', 'nas', 'para', 'sem', 'a', 'à', 'ao', 'e', 'ou']);

const IRREGULAR_PLURALS: Record<string, string> = {
  pão: 'pães',
  mão: 'mãos',
  cão: 'cães',
  grão: 'grãos',
  irmão: 'irmãos',
  alemão: 'alemães',
};

const IRREGULAR_SINGULARS = Object.fromEntries(Object.entries(IRREGULAR_PLURALS).map(([one, many]) => [many, one]));

/** Terminam em "s" também no singular. */
const INVARIABLE = new Set(['brócolis', 'lápis', 'pires', 'ananás']);

export function pluralizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (INVARIABLE.has(lower)) return word;
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];
  if (lower.endsWith('ês')) return `${word.slice(0, -2)}eses`;
  if (lower.endsWith('s') || lower.endsWith('x')) return word;
  if (lower.endsWith('ão')) return `${word.slice(0, -2)}ões`;
  if (/[aeiouáéíóúâêôãõ]$/.test(lower)) return `${word}s`;
  if (lower.endsWith('m')) return `${word.slice(0, -1)}ns`;
  if (lower.endsWith('al')) return `${word.slice(0, -2)}ais`;
  if (lower.endsWith('el')) return `${word.slice(0, -2)}éis`;
  if (lower.endsWith('ol')) return `${word.slice(0, -2)}óis`;
  if (lower.endsWith('ul')) return `${word.slice(0, -2)}uis`;
  if (lower.endsWith('il')) return `${word.slice(0, -2)}is`;
  return `${word}es`;
}

export function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (INVARIABLE.has(lower)) return word;
  if (IRREGULAR_SINGULARS[lower]) return IRREGULAR_SINGULARS[lower];
  // "francês" e "ananás" já estão no singular.
  if (/[êáíóú]s$/.test(lower)) return word;
  if (lower.endsWith('ões')) return `${word.slice(0, -3)}ão`;
  if (lower.endsWith('ães')) return `${word.slice(0, -3)}ão`;
  if (lower.endsWith('eses')) return `${word.slice(0, -4)}ês`;
  if (lower.endsWith('ns')) return `${word.slice(0, -2)}m`;
  if (lower.endsWith('ais')) return `${word.slice(0, -3)}al`;
  if (lower.endsWith('éis')) return `${word.slice(0, -3)}el`;
  if (lower.endsWith('óis')) return `${word.slice(0, -3)}ol`;
  if (lower.endsWith('uis')) return `${word.slice(0, -3)}ul`;
  if (/[rz]es$/.test(lower)) return word.slice(0, -2);
  return word.replace(/s$/i, '');
}

function changeHead(phrase: string, change: (word: string) => string): string {
  const words = phrase.split(' ');
  const end = words.findIndex((word) => CONNECTORS.has(word.toLowerCase()));
  const head = end === -1 ? words.length : end;
  return words.map((word, index) => (index < head ? change(word) : word)).join(' ');
}

/** "pão francês" vira "pães franceses"; "dente de alho" vira "dentes de alho". */
export function pluralizePhrase(phrase: string): string {
  return changeHead(phrase, pluralizeWord);
}

export function singularizePhrase(phrase: string): string {
  return changeHead(phrase, singularizeWord);
}
