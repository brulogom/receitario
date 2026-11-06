import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exportBackup } from '../../storage/backup';
import { getMine, listMine, saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { HistoryScreen } from './HistoryScreen';
import { ImportReview } from './ImportReview';
import { MineScreen } from './MineScreen';

beforeEach(resetStorage);

function file(content: string) {
  const blob = new File([content], 'backup.json', { type: 'application/json' });
  Object.defineProperty(blob, 'text', { value: async () => content });
  return blob;
}

test('lista as receitas e oferece as ações principais', async () => {
  await saveMine(aRecipe({ name: 'Bolo da casa' }));
  renderScreen(<MineScreen />);
  expect(await screen.findByRole('link', { name: /Bolo da casa/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nova receita' })).toHaveAttribute('href', '#/nova');
  expect(screen.getByRole('link', { name: 'Colar texto' })).toHaveAttribute('href', '#/importar');
});

test('sem receitas, explica o próximo passo', async () => {
  renderScreen(<MineScreen />);
  expect(await screen.findByText(/Você ainda não guardou/)).toBeInTheDocument();
});

test('backup inválido mostra erro e nada muda', async () => {
  await saveMine(aRecipe());
  renderScreen(<MineScreen />);
  fireEvent.change(await screen.findByLabelText('Importar backup'), { target: { files: [file('lixo')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('não é um backup válido');
  expect(await listMine()).toHaveLength(1);
});

test('backup válido traz as receitas e informa o resultado', async () => {
  await saveMine(aRecipe());
  const json = await exportBackup();
  resetStorage();
  renderScreen(<MineScreen />);
  fireEvent.change(await screen.findByLabelText('Importar backup'), { target: { files: [file(json)] } });
  expect(await screen.findByRole('status')).toHaveTextContent('1 nova');
  expect(await screen.findByRole('link', { name: /Bolo/ })).toBeInTheDocument();
});

test('colar texto leva à conferência, sem perder nada', async () => {
  renderScreen(<ImportReview />);
  fireEvent.change(screen.getByLabelText('Cole aqui o texto da receita'), {
    target: { value: 'Bolo 😍\nIngredientes\n2 ovos\nPreparo\nMisture\n#bolo' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Separar ingredientes e preparo' }));
  expect(screen.getByLabelText('Nome')).toHaveValue('Bolo 😍');
  expect(screen.getByLabelText('Ingredientes, um por linha')).toHaveValue('2 ovos');
  expect(screen.getByLabelText('Modo de preparo, um passo por linha')).toHaveValue('Misture');
  expect(screen.getByLabelText('Texto não reconhecido')).toHaveValue('#bolo');
  expect(await listMine()).toEqual([]);
});

test('voltar a uma versão anterior pelo histórico', async () => {
  const saved = await saveMine(aRecipe({ name: 'Antigo' }));
  await saveMine({ ...saved, name: 'Novo' });
  renderScreen(<HistoryScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Voltar à versão "Antigo"' }));
  await waitFor(async () => expect((await getMine('r1'))?.name).toBe('Antigo'));
});

test('histórico vazio explica', async () => {
  await saveMine(aRecipe());
  renderScreen(<HistoryScreen id="r1" />);
  expect(await screen.findByText(/Ainda não há versões/)).toBeInTheDocument();
});
