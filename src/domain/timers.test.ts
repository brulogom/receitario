import { detectMinutes, dueTimers, formatRemaining, remainingSeconds, type Timer } from './timers';

test.each([
  ['Asse por 30 minutos', 30],
  ['Asse a 180 °C por 40 minutos, até dourar.', 40],
  ['Frite por 1 minuto', 1],
  ['Cozinhe por 1 hora', 60],
  ['Cozinhe por 2 horas', 120],
  ['Cozinhe por 1 hora e 15 minutos', 75],
  ['Cozinhe por 1h30', 90],
  ['Asse por 20 min', 20],
])('detectMinutes(%s) = %s', (text, minutes) => {
  expect(detectMinutes(text)).toBe(minutes);
});

test.each(['Misture bem', 'Asse a 180 °C', 'Use 2 hortelãs'])('sem tempo: %s', (text) => {
  expect(detectMinutes(text)).toBeNull();
});

const timer = (overrides: Partial<Timer> = {}): Timer => ({ id: 't', label: 'Passo 1', endsAt: 100_000, rang: false, ...overrides });

test('temporizador usa o horário de término, não a contagem', () => {
  expect(remainingSeconds(timer(), 40_000)).toBe(60);
  expect(remainingSeconds(timer(), 99_500)).toBe(1);
});

test('temporizador vencido fica em zero', () => {
  expect(remainingSeconds(timer(), 500_000)).toBe(0);
});

test('dueTimers traz o vencido só enquanto não tocou', () => {
  expect(dueTimers([timer()], 99_000)).toEqual([]);
  expect(dueTimers([timer()], 100_000)).toHaveLength(1);
  expect(dueTimers([timer({ rang: true })], 500_000)).toEqual([]);
});

test('formatRemaining', () => {
  expect(formatRemaining(65)).toBe('01:05');
  expect(formatRemaining(3700)).toBe('61:40');
});
