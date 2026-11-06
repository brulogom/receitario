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

export function detectMinutes(step: string): number | null {
  const text = step.toLowerCase();
  const both = text.match(/(\d+)\s*(?:h|horas?)\s*(?:e\s*)?(\d+)\s*(?:min|minutos?)?\b/);
  if (both) return Number(both[1]) * 60 + Number(both[2]);
  const hours = text.match(/(\d+)\s*(?:h|horas?)\b/);
  if (hours) return Number(hours[1]) * 60;
  const minutes = text.match(/(\d+)\s*(?:min|minutos?)\b/);
  return minutes ? Number(minutes[1]) : null;
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
