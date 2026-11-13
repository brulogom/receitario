import { shortDate } from './dates';
import type { CookedEntry } from './types';

export type CookedSummary = {
  count: number;
  /** Dia mais recente, AAAA-MM-DD. */
  last: string | null;
  /** Média das notas dadas, com uma casa; null sem nenhuma nota. */
  rating: number | null;
};

export function cookedSummary(entries: CookedEntry[]): CookedSummary {
  const rated = entries.filter((entry) => entry.rating !== null).map((entry) => entry.rating as number);
  const last = entries.reduce<string | null>((latest, entry) => (!latest || entry.date > latest ? entry.date : latest), null);
  const rating = rated.length ? Math.round((rated.reduce((sum, value) => sum + value, 0) / rated.length) * 10) / 10 : null;
  return { count: entries.length, last, rating };
}

export function formatRating(rating: number): string {
  return rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** "Feita 3 vezes · última em 02/11". Vazio quando nunca foi feita. */
export function cookedText(summary: CookedSummary, today: string): string {
  if (!summary.count || !summary.last) return '';
  const times = summary.count === 1 ? 'Feita 1 vez' : `Feita ${summary.count} vezes`;
  return `${times} · última em ${shortDate(summary.last, today)}`;
}

/** Agrupa os registros por receita, do mais recente para o mais antigo. */
export function cookedByRecipe(entries: CookedEntry[]): Map<string, CookedEntry[]> {
  const groups = new Map<string, CookedEntry[]>();
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  for (const entry of sorted) {
    const list = groups.get(entry.recipeId);
    if (list) list.push(entry);
    else groups.set(entry.recipeId, [entry]);
  }
  return groups;
}
