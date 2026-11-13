import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { TimerBar } from '../TimerBar';
import { CookScreen } from './CookScreen';

beforeEach(() => {
  // Sem falsificar setImmediate: o banco de testes depende dele para concluir as transações.
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  resetStorage();
});
afterEach(() => vi.useRealTimers());

const recipe = () =>
  aRecipe({ steps: ['Misture tudo.', 'Asse por 30 minutos.', 'Cozinhe por 5 minutos.'], ingredients: [{ quantity: 2, unit: 'xícara', name: 'açúcar' }] });

async function open(alarm = () => {}) {
  await saveMine(recipe());
  renderScreen(
    <>
      <CookScreen id="r1" />
      <TimerBar />
    </>,
    alarm,
  );
  await screen.findByText('Misture tudo.');
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));

test('mostra um passo por vez', async () => {
  await open();
  expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  expect(screen.queryByText('Asse por 30 minutos.')).not.toBeInTheDocument();
  next();
  expect(screen.getByText('Asse por 30 minutos.')).toBeInTheDocument();
  expect(screen.queryByText('Misture tudo.')).not.toBeInTheDocument();
});

test('passo com dois tempos oferece os dois', async () => {
  await saveMine(aRecipe({ steps: ['Frite por 5 minutos de cada lado e asse por 20 minutos.'] }));
  renderScreen(
    <>
      <CookScreen id="r1" />
      <TimerBar />
    </>,
  );
  await screen.findByText(/Frite por 5 minutos/);
  expect(screen.getByLabelText('Minutos')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 20 min' }));
  expect(screen.getByText('05:00')).toBeInTheDocument();
  expect(screen.getByText('20:00')).toBeInTheDocument();
});

test('recarregar continua no mesmo passo; Concluir recomeça', async () => {
  await open();
  next();
  const reopen = () =>
    renderScreen(
      <>
        <CookScreen id="r1" />
      </>,
    );
  cleanup();
  reopen();
  expect(await screen.findByText('Passo 2 de 3')).toBeInTheDocument();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
  cleanup();
  reopen();
  expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
});

test('passo guardado há mais de um dia não vale mais', async () => {
  await open();
  next();
  cleanup();
  vi.advanceTimersByTime(25 * 60 * 60_000);
  renderScreen(<CookScreen id="r1" />);
  expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
});

test('receita sem passos explica e volta, sem "Passo 1 de 0"', async () => {
  await saveMine(aRecipe({ steps: [] }));
  renderScreen(<CookScreen id="r1" />);
  expect(await screen.findByText(/ainda não tem modo de preparo/)).toBeInTheDocument();
  expect(screen.queryByText(/Passo 1 de 0/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voltar à receita' })).toHaveAttribute('href', '#/receita/r1');
});

test('passo com tempo já traz os minutos preenchidos', async () => {
  await open();
  next();
  expect(screen.getByLabelText('Minutos')).toHaveValue('30');
  expect(screen.getByRole('button', { name: 'Iniciar temporizador de 30 min' })).toBeEnabled();
});

test('passo sem tempo permite temporizador manual', async () => {
  await open();
  expect(screen.getByLabelText('Minutos')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Iniciar temporizador' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 7 min' }));
  expect(screen.getByText('07:00')).toBeInTheDocument();
});

test('minutos manuais não passam para o passo seguinte', async () => {
  await open();
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '7' } });
  next();
  expect(screen.getByLabelText('Minutos')).toHaveValue('30');
});

test('dá para ajustar o tempo antes de iniciar', async () => {
  await open();
  next();
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 12 min' }));
  expect(screen.getByText('12:00')).toBeInTheDocument();
});

test('vários temporizadores ao mesmo tempo', async () => {
  await open();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 30 min' }));
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  expect(screen.getByText('30:00')).toBeInTheDocument();
  expect(screen.getByText('05:00')).toBeInTheDocument();
});

test('avisa que o alarme depende do aplicativo aberto', async () => {
  await open();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 30 min' }));
  expect(screen.getByText(/alarme só toca com o aplicativo aberto/)).toBeInTheDocument();
});

test('ao vencer, toca o alarme uma vez e mostra Pronto', async () => {
  const alarm = vi.fn();
  await open(alarm);
  next();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
  });
  expect(screen.getByText('Pronto!')).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(alarm).toHaveBeenCalledTimes(1);
});

test('temporizador vencido fora do aplicativo toca ao voltar, uma vez só', async () => {
  const alarm = vi.fn();
  localStorage.setItem('receitario.timers', JSON.stringify([{ id: 't', label: 'Passo 1', endsAt: Date.now() - 60_000, rang: false }]));
  await open(alarm);
  expect(alarm).toHaveBeenCalledTimes(1);
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(alarm).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Pronto!')).toBeInTheDocument();
});

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

test('temporizador que vence com o aplicativo em segundo plano toca ao voltar', async () => {
  const alarm = vi.fn();
  await open(alarm);
  next();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  setVisibility('hidden');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6 * 60_000);
  });
  expect(alarm).not.toHaveBeenCalled();
  await act(async () => {
    setVisibility('visible');
  });
  expect(alarm).toHaveBeenCalledTimes(1);
  setVisibility('visible');
});

test('o alarme repete até ser dispensado', async () => {
  const alarm = vi.fn();
  await open(alarm);
  next();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
  });
  expect(alarm).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(16_000);
  });
  expect(alarm).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: /Dispensar/ }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(alarm).toHaveBeenCalledTimes(2);
});

test('o alarme para de repetir sozinho depois de 5 minutos', async () => {
  const alarm = vi.fn();
  await open(alarm);
  next();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 5 min' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5 * 60_000);
  });
  const calls = alarm.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(alarm).toHaveBeenCalledTimes(calls);
});

test('depois de reabrir o aplicativo, pede um toque para liberar o som', async () => {
  localStorage.setItem('receitario.timers', JSON.stringify([{ id: 't', label: 'Passo 1', endsAt: Date.now() + 60_000, rang: false }]));
  const context = vi.fn(() => ({ resume: async () => {} }));
  vi.stubGlobal('AudioContext', context);
  await open();
  expect(screen.getByText(/Toque na tela para liberar o som/)).toBeInTheDocument();
  await act(async () => {
    fireEvent.pointerDown(document.body);
  });
  expect(screen.queryByText(/Toque na tela para liberar o som/)).not.toBeInTheDocument();
  vi.unstubAllGlobals();
});

test('dá para dispensar o temporizador', async () => {
  await open();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador de 30 min' }));
  fireEvent.click(screen.getByRole('button', { name: /Dispensar/ }));
  expect(screen.queryByText('30:00')).not.toBeInTheDocument();
});

test('sem suporte para manter a tela ligada, avisa', async () => {
  await open();
  expect(screen.getByText(/não consegue manter a tela ligada/)).toBeInTheDocument();
});

test('no último passo, o botão vira Concluir', async () => {
  await open();
  next();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
  expect(window.location.hash).toBe('#/receita/r1');
});
