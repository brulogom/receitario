/** Vale enquanto se cozinha: no dia seguinte, a receita volta a abrir do início. */
const VALID_FOR = 24 * 60 * 60_000;

export function recall<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const { value, at } = JSON.parse(saved) as { value: T; at: number };
    return Date.now() - at < VALID_FOR ? value : null;
  } catch {
    return null;
  }
}

export function remember(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    // Sem armazenamento, vale só enquanto a tela estiver aberta.
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Sem armazenamento, não há o que esquecer.
  }
}
