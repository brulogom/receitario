import { formatRemaining, remainingSeconds } from '../domain/timers';
import { useTimers } from './useTimers';

export function TimerBar() {
  const { timers, now, wake, audioReady, dismiss } = useTimers();
  if (!timers.length) return null;
  return (
    <section className="timer-bar" aria-label="Temporizadores">
      {timers.map((timer) => {
        const seconds = remainingSeconds(timer, now);
        return (
          <div className={seconds ? 'timer-row' : 'timer-row done'} key={timer.id}>
            <span className="timer-label">{timer.label}</span>
            <strong className="timer-time" role={seconds ? undefined : 'alert'}>
              {seconds ? formatRemaining(seconds) : 'Pronto!'}
            </strong>
            <button type="button" className="timer-dismiss" onClick={() => dismiss(timer.id)} aria-label={`Dispensar ${timer.label}`}>
              Dispensar
            </button>
          </div>
        );
      })}
      <p className="timer-note">
        O alarme só toca com o aplicativo aberto na tela.
        {!audioReady && ' Toque na tela para liberar o som do alarme.'}
        {!wake.supported && ' Este aparelho não consegue manter a tela ligada sozinho: mantenha o celular sem bloquear.'}
      </p>
    </section>
  );
}
