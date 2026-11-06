import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dueTimers, shouldRingAgain, type Timer } from '../domain/timers';
import { isAudioReady, playAlarm, unlockAudio } from './alarm';
import { useWakeLock } from './useWakeLock';

const STORAGE_KEY = 'receitario.timers';

type TimersValue = {
  timers: Timer[];
  now: number;
  wake: { supported: boolean; held: boolean };
  audioReady: boolean;
  start: (label: string, minutes: number) => void;
  dismiss: (id: string) => void;
};

const TimersContext = createContext<TimersValue | null>(null);

function loadTimers(): Timer[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTimers(timers: Timer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  } catch {
    // Sem armazenamento, os temporizadores valem até fechar o aplicativo.
  }
}

export function TimersProvider({ children, alarm = playAlarm }: { children: ReactNode; alarm?: () => void }) {
  const [timers, setTimers] = useState<Timer[]>(loadTimers);
  const [now, setNow] = useState(() => Date.now());
  // A referência evita tocar duas vezes o mesmo alarme se a verificação rodar de novo antes de redesenhar.
  const current = useRef(timers);
  const lastRing = useRef(0);
  const [audioReady, setAudioReady] = useState(isAudioReady);

  const commit = useCallback((next: Timer[]) => {
    current.current = next;
    setTimers(next);
    saveTimers(next);
  }, []);

  const check = useCallback(() => {
    const time = Date.now();
    setNow(time);
    // Com o aplicativo fora da tela o som e a vibração não funcionam: o alarme espera a volta.
    if (document.visibilityState !== 'visible') return;
    const due = dueTimers(current.current, time);
    if (due.length) {
      commit(current.current.map((timer) => (due.includes(timer) ? { ...timer, rang: true, rangAt: time } : timer)));
      lastRing.current = time;
      alarm();
    } else if (shouldRingAgain(current.current, time, lastRing.current)) {
      lastRing.current = time;
      alarm();
    }
  }, [alarm, commit]);

  useEffect(() => {
    // Ao reabrir o aplicativo, o som só volta depois de um toque em qualquer lugar.
    const onTouch = () => {
      unlockAudio();
      setAudioReady(isAudioReady());
    };
    document.addEventListener('pointerdown', onTouch);
    return () => document.removeEventListener('pointerdown', onTouch);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  const start = useCallback(
    (label: string, minutes: number) => {
      unlockAudio();
      setAudioReady(isAudioReady());
      const time = Date.now();
      setNow(time);
      commit([...current.current, { id: crypto.randomUUID(), label, endsAt: time + minutes * 60_000, rang: false }]);
    },
    [commit],
  );

  const dismiss = useCallback(
    (id: string) => commit(current.current.filter((timer) => timer.id !== id)),
    [commit],
  );

  // Enquanto houver temporizador correndo, a tela não pode apagar, em nenhuma tela do aplicativo.
  const wake = useWakeLock(timers.some((timer) => !timer.rang));

  const value = useMemo(
    () => ({ timers, now, wake, audioReady, start, dismiss }),
    [timers, now, wake, audioReady, start, dismiss],
  );
  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}

export function useTimers(): TimersValue {
  const value = useContext(TimersContext);
  if (!value) throw new Error('useTimers precisa de TimersProvider');
  return value;
}
