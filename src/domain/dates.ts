const WEEKDAYS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const pad = (value: number) => String(value).padStart(2, '0');

/** Dia local no formato AAAA-MM-DD. Não usa toISOString, que mudaria de dia à noite no Brasil. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(key: string, days: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(fromKey(value)) === value;
}

/** "15/11", ou "15/11/2025" quando não é do ano de hoje. */
export function shortDate(key: string, today: string): string {
  const [year, month, day] = key.split('-');
  return year === today.slice(0, 4) ? `${day}/${month}` : `${day}/${month}/${year}`;
}

/** "Hoje", "Amanhã", "Ontem" ou "sáb. 15/11". */
export function dayLabel(key: string, today: string): string {
  if (key === today) return 'Hoje';
  if (key === addDays(today, 1)) return 'Amanhã';
  if (key === addDays(today, -1)) return 'Ontem';
  return `${WEEKDAYS[fromKey(key).getDay()]} ${shortDate(key, today)}`;
}
