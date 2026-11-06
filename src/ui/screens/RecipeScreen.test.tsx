import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { listMarks } from '../../storage/marks';
import { getMine, listMine, saveMine } from '../../storage/recipes';
import { getShopping } from '../../storage/shopping';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { RecipeScreen } from './RecipeScreen';

beforeEach(resetStorage);

test('ajustar as porções recalcula as quantidades', async () => {
  await saveMine(aRecipe({ servings: 4, ingredients: [{ quantity: 2, unit: 'xícara', name: 'farinha' }, { quantity: null, unit: 'a gosto', name: 'sal' }] }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByText('2 xícaras de farinha')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mais porções' }));
  await userEvent.click(screen.getByRole('button', { name: 'Mais porções' }));
  expect(screen.getByText('3 xícaras de farinha')).toBeInTheDocument();
  expect(screen.getByText('sal a gosto')).toBeInTheDocument();
});

test('não deixa as porções passarem de 1 para baixo', async () => {
  await saveMine(aRecipe({ servings: 1 }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByRole('button', { name: 'Menos porções' })).toBeDisabled();
});

test('Salvar em Minhas Receitas cria cópia e mantém a original', async () => {
  renderScreen(<RecipeScreen id="bolo-de-fuba" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Salvar em Minhas Receitas' }));
  await waitFor(async () => expect(await listMine()).toHaveLength(1));
  const [copy] = await listMine();
  expect(copy.originId).toBe('bolo-de-fuba');
  expect(copy.id).not.toBe('bolo-de-fuba');
  expect(window.location.hash).toBe(`#/editar/${copy.id}`);
});

test('receita do catálogo não pode ser editada nem excluída', async () => {
  renderScreen(<RecipeScreen id="bolo-de-fuba" />);
  await screen.findByRole('button', { name: 'Salvar em Minhas Receitas' });
  expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
});

test('receita sem porções abre sem ajuste, com explicação', async () => {
  await saveMine(aRecipe({ servings: null }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByText(/Informe as porções/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mais porções' })).not.toBeInTheDocument();
});

test('receita sem preparo deixa o Modo cozinha indisponível, com explicação', async () => {
  await saveMine(aRecipe({ steps: [], ingredients: [] }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByRole('button', { name: 'Modo cozinha' })).toBeDisabled();
  expect(screen.getByText(/Adicione o modo de preparo/)).toBeInTheDocument();
});

test('marcar favorita e quero testar sem criar cópia', async () => {
  renderScreen(<RecipeScreen id="pudim-de-leite" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Favoritar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Quero testar' }));
  await waitFor(async () => expect(await listMarks('favorite')).toEqual(['pudim-de-leite']));
  expect(await listMarks('try')).toEqual(['pudim-de-leite']);
  expect(await listMine()).toEqual([]);
});

test('adicionar às compras guarda as porções escolhidas', async () => {
  await saveMine(aRecipe({ servings: 4 }));
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Mais porções' }));
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar às compras' }));
  await waitFor(async () => expect((await getShopping()).selections).toEqual([{ recipeId: 'r1', servings: 5 }]));
});

test('excluir pede confirmação antes', async () => {
  await saveMine(aRecipe());
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
  expect(await getMine('r1')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
  await waitFor(async () => expect(await getMine('r1')).toBeUndefined());
});

test('só link http vira link clicável', async () => {
  await saveMine(aRecipe({ videoUrl: 'javascript:alert(1)' }));
  renderScreen(<RecipeScreen id="r1" />);
  await screen.findByText(/javascript:alert/);
  expect(screen.queryByRole('link', { name: /javascript/ })).not.toBeInTheDocument();
});

test('receita inexistente mostra aviso', async () => {
  renderScreen(<RecipeScreen id="nao-existe" />);
  expect(await screen.findByText(/não foi encontrada/)).toBeInTheDocument();
});
