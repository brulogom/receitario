import { act, renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

function installWakeLock() {
  const request = vi.fn(async () => {
    const sentinel = new EventTarget() as EventTarget & { release: () => Promise<void>; released: boolean };
    sentinel.released = false;
    sentinel.release = vi.fn(async () => {
      sentinel.released = true;
    });
    return sentinel;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return request;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
  setVisibility('visible');
});

test('pede para manter a tela ligada quando ativo', async () => {
  const request = installWakeLock();
  const { result } = renderHook(() => useWakeLock(true));
  await waitFor(() => expect(result.current.held).toBe(true));
  expect(request).toHaveBeenCalledWith('screen');
});

test('não pede quando inativo', () => {
  const request = installWakeLock();
  renderHook(() => useWakeLock(false));
  expect(request).not.toHaveBeenCalled();
});

test('pede de novo ao voltar para o aplicativo', async () => {
  const request = installWakeLock();
  const { result } = renderHook(() => useWakeLock(true));
  await waitFor(() => expect(result.current.held).toBe(true));
  await act(async () => {
    setVisibility('hidden');
    setVisibility('visible');
  });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

test('sem suporte, avisa em vez de falhar em silêncio', () => {
  const { result } = renderHook(() => useWakeLock(true));
  expect(result.current).toEqual({ supported: false, held: false });
});

test('pedido recusado não quebra e informa que não está ligada', async () => {
  const request = vi.fn(async () => {
    throw new Error('recusado');
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  const { result } = renderHook(() => useWakeLock(true));
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(result.current.held).toBe(false);
});
