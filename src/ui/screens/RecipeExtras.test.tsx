import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dateKey } from '../../domain/dates';
import { createCollection, listCollections } from '../../storage/collections';
import { addCooked, listCooked } from '../../storage/cooked';
import { listPlan } from '../../storage/plan';
import { getMine, listVersions, saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { RecipeScreen } from './RecipeScreen';

beforeEach(resetStorage);

const today = () => dateKey(new Date());

test('Fiz hoje guarda nota e comentário e mostra o resumo', async () => {
  await saveMine(aRecipe());
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Fiz hoje' }));
  await userEvent.click(screen.getByRole('button', { name: 'Nota 4 de 5' }));
  await userEvent.type(screen.getByLabelText('Comentário (opcional)'), 'Menos açúcar da próxima vez');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

  const summary = `Feita 1 vez · última em ${today().slice(8, 10)}/${today().slice(5, 7)}`;
  expect(await screen.findByText((_, element) => element?.className === 'cooked-summary' && element.textContent!.endsWith(summary))).toHaveTextContent('4');
  expect(screen.getByText('Menos açúcar da próxima vez')).toBeInTheDocument();
  expect(await listCooked()).toMatchObject([{ recipeId: 'r1', date: today(), rating: 4 }]);
});

test('ao concluir o modo cozinha, a receita abre perguntando como ficou', async () => {
  await saveMine(aRecipe());
  renderScreen(<RecipeScreen id="r1" openCooked />);
  expect(await screen.findByRole('form', { name: 'Registrar que fiz' })).toBeInTheDocument();
});

test('apagar um registro', async () => {
  await saveMine(aRecipe());
  await addCooked({ recipeId: 'r1', date: '2026-10-02', rating: null, comment: 'primeira vez' });
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: /Apagar registro de 02\/10/ }));
  await waitFor(() => expect(screen.queryByText('primeira vez')).not.toBeInTheDocument());
  expect(await listCooked()).toEqual([]);
});

test('Planejar põe a receita num dia da semana', async () => {
  await saveMine(aRecipe({ servings: 8 }));
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Planejar' }));
  await userEvent.selectOptions(screen.getByLabelText('Refeição'), 'jantar');
  await userEvent.click(screen.getByRole('button', { name: 'Pôr na semana' }));

  expect(await screen.findByText('Está na semana: Hoje, jantar.')).toBeInTheDocument();
  expect(await listPlan(today(), today())).toMatchObject([{ recipeId: 'r1', meal: 'jantar', servings: 8 }]);
});

test('Coleções: criar uma nova já com a receita e tirar dela', async () => {
  await saveMine(aRecipe());
  await createCollection('Marmitas');
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Coleções' }));
  await userEvent.type(screen.getByLabelText('Nome da nova coleção'), 'Ceia de Natal');
  await userEvent.click(screen.getByRole('button', { name: 'Criar' }));

  const panel = screen.getByRole('group', { name: 'Coleções' });
  expect(await within(panel).findByLabelText('Ceia de Natal')).toBeChecked();
  expect(within(panel).getByLabelText('Marmitas')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Coleções (1)' })).toBeInTheDocument();

  await userEvent.click(within(panel).getByLabelText('Ceia de Natal'));
  await waitFor(async () => expect((await listCollections()).every((item) => item.recipeIds.length === 0)).toBe(true));
});

test('pôr foto direto na receita, sem abrir a edição', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  URL.revokeObjectURL = vi.fn();
  await saveMine(aRecipe());
  renderScreen(<RecipeScreen id="r1" />);
  const input = (await screen.findByText('Pôr foto')).querySelector('input')!;
  await userEvent.upload(input, new File([new Uint8Array([1, 2, 3])], 'bolo.jpg', { type: 'image/jpeg' }));

  expect(await screen.findByText('Trocar foto')).toBeInTheDocument();
  expect((await getMine('r1'))?.photo).toBeTruthy();
  // A versão sem foto fica no histórico.
  expect(await listVersions('r1')).toHaveLength(1);

  await userEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
  expect(await screen.findByText('Pôr foto')).toBeInTheDocument();
  expect((await getMine('r1'))?.photo).toBeUndefined();
});

test('mostra as etiquetas da receita', async () => {
  await saveMine(aRecipe({ tags: ['Natal', 'da vó'] }));
  renderScreen(<RecipeScreen id="r1" />);
  const list = await screen.findByRole('list', { name: 'Etiquetas' });
  expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Natal', 'da vó']);
});
