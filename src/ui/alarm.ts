let audio: AudioContext | null = null;

/** Precisa ser chamado dentro de um toque: o navegador só libera som depois de um gesto da pessoa. */
export function unlockAudio(): void {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

export function isAudioReady(): boolean {
  return audio !== null;
}

export function playAlarm(): void {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 800]);
    if (!audio) return;
    void audio.resume();
    for (let beep = 0; beep < 8; beep++) {
      const start = audio.currentTime + beep * 0.5;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = beep % 2 ? 660 : 880;
      gain.gain.setValueAtTime(0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    }
  } catch {
    // Sem som ou vibração, o aviso "Pronto!" continua na tela.
  }
}
