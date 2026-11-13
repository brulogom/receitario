import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { listMine } from '../../storage/recipes';
import { renderScreen, resetStorage } from '../testUtils';
import { BookImport } from './BookImport';

beforeEach(resetStorage);

const book = ['Bolo Simples', 'Ingredientes', '2 xícaras de farinha', '3 ovos', 'Modo de preparo', 'Misture tudo. Asse por 30 minutos.', 'Rendimento: 12 fatias', 'Sem Preparo', 'Ingredientes', 'sal'].join('\n');

/** O navegador simulado dos testes não tem File.text(); os navegadores reais têm. */
function textFile(text: string, name: string): File {
  const file = new File([text], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', { value: async () => text });
  return file;
}

async function send(text = book, name = 'Livro da Vovó.txt') {
  renderScreen(<BookImport />);
  const input = screen.getByLabelText('Arquivo do livro (PDF com texto ou TXT)');
  fireEvent.change(input, { target: { files: [textFile(text, name)] } });
}

test('lista o que encontrou e sugere o nome do arquivo como nome do livro', async () => {
  await send();
  expect(await screen.findByRole('heading', { name: '2 receitas encontradas' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nome do livro')).toHaveValue('Livro da Vovó');
});

test('o que está incompleto pede conferência e não vem marcado', async () => {
  await send();
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  expect(screen.getByRole('checkbox', { name: 'Salvar Bolo Simples' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Salvar Sem Preparo' })).not.toBeChecked();
  expect(screen.getByText('Conferir')).toBeInTheDocument();
  expect(screen.getByText(/1 pede conferência/)).toBeInTheDocument();
});

test('salva só as marcadas, com o livro como fonte e sem presumir nada', async () => {
  await send();
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 receita' }));
  await waitFor(async () => expect(await listMine()).toHaveLength(1));
  const [saved] = await listMine();
  expect(saved).toMatchObject({
    name: 'Bolo Simples',
    book: { title: 'Livro da Vovó', page: null },
    kind: 'indefinido',
    categories: [],
    minutes: null,
    servings: 12,
    servingsUnit: 'fatias',
    steps: ['Misture tudo.', 'Asse por 30 minutos.'],
    diet: { vegetarian: false, lactoseFree: false, glutenFree: false },
  });
  expect(await screen.findByText(/1 receita salva/)).toBeInTheDocument();
});

test('o que foi corrigido na conferência é o que fica salvo', async () => {
  await send();
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  fireEvent.change(screen.getAllByLabelText('Nome')[0], { target: { value: 'Bolo da Vovó' } });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 receita' }));
  await waitFor(async () => expect((await listMine())[0]?.name).toBe('Bolo da Vovó'));
});

test('enviar o mesmo livro de novo não duplica', async () => {
  await send();
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 receita' }));
  await screen.findByText(/1 receita salva/);
  fireEvent.change(screen.getByLabelText('Arquivo do livro (PDF com texto ou TXT)'), { target: { files: [textFile(book, 'Livro da Vovó.txt')] } });
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 receita' }));
  expect(await screen.findByText(/0 receitas salvas.*1 já estava salva/)).toBeInTheDocument();
  expect(await listMine()).toHaveLength(1);
});

test('sem nome do livro não salva e explica', async () => {
  await send();
  await screen.findByRole('heading', { name: '2 receitas encontradas' });
  fireEvent.change(screen.getByLabelText('Nome do livro'), { target: { value: ' ' } });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 receita' }));
  expect(screen.getByRole('alert')).toHaveTextContent('nome do livro');
  expect(await listMine()).toEqual([]);
});

test('arquivo sem receitas explica o que foi procurado', async () => {
  await send('Só um texto qualquer\nsem nada de receita');
  expect(await screen.findByText(/Não encontrei receitas/)).toBeInTheDocument();
});

test('arquivo vazio avisa', async () => {
  await send('   \n  ');
  expect(await screen.findByRole('alert')).toHaveTextContent('vazio');
});
