export type Timer = { id: string; label: string; endsAt: number; rang: boolean; rangAt?: number };

const RING_AGAIN_EVERY = 15_000;
const STOP_RINGING_AFTER = 5 * 60_000;

/** Um alarme não dispensado toca de novo: com as mãos ocupadas, um toque só passa despercebido. */
export function shouldRingAgain(timers: Timer[], now: number, lastRing: number): boolean {
  return (
    now - lastRing >= RING_AGAIN_EVERY &&
    timers.some((timer) => timer.rang && timer.rangAt !== undefined && now - timer.rangAt < STOP_RINGING_AFTER)
  );
}

/** Reescreve tempos por extenso com algarismos: "uma hora e meia" vira "1 hora e 30". */
function writeHoursAsDigits(text: string): string {
  return text
    .replace(/(^|[^\p{L}])(uma|duas|três|tres)\s+(horas?)\b/gu, (_match, before: string, word: string, unit: string) => {
      const hours = word === 'uma' ? 1 : word === 'duas' ? 2 : 3;
      return `${before}${hours} ${unit}`;
    })
    .replace(/(\d+)\s*(h|horas?)\s+e\s+meia\b/g, '$1 $2 e 30')
    .replace(/(^|[^\p{L}])meia\s+hora\b/gu, '$130 minutos');
}

const TIME = /(\d+)\s*(?:h|horas?)\s*(?:e\s*)?(\d+)\s*(?:min|minutos?)?\b|(\d+)\s*(?:h|horas?)\b|(\d+)\s*(?:min|minutos?)\b/g;

/** Todos os tempos citados no passo, na ordem do texto e sem repetir. */
export function detectTimes(step: string): number[] {
  const found = [...writeHoursAsDigits(step.toLowerCase()).matchAll(TIME)].map(([, bothHours, bothMinutes, hours, minutes]) => {
    if (bothHours) return Number(bothHours) * 60 + Number(bothMinutes);
    return hours ? Number(hours) * 60 : Number(minutes);
  });
  return [...new Set(found)];
}

export function detectMinutes(step: string): number | null {
  return detectTimes(step)[0] ?? null;
}

export function remainingSeconds(timer: Timer, now: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function dueTimers(timers: Timer[], now: number): Timer[] {
  return timers.filter((timer) => !timer.rang && timer.endsAt <= now);
}

export function formatRemaining(seconds: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
