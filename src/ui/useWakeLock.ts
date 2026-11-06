import { useEffect, useState } from 'react';

export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const available = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [held, setHeld] = useState(false);
  // O sistema pode recusar o pedido mesmo com suporte, por exemplo com bateria fraca.
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!active || !available) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (stopped) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setHeld(true);
        setRefused(false);
        lock.addEventListener('release', () => {
          if (!stopped) setHeld(false);
        });
      } catch {
        if (stopped) return;
        setHeld(false);
        setRefused(true);
      }
    };

    // O sistema solta a trava quando o aplicativo sai da tela; ao voltar, é preciso pedir de novo.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
      setHeld(false);
    };
  }, [active, available]);

  return { supported: available && !refused, held };
}
