import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { listMarks, toggleMark } from '../../storage/marks';
import { getMine, listMine, saveMine } from '../../storage/recipes';
import { getShopping } from '../../storage/shopping';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { RecipeScreen } from './RecipeScreen';

beforeEach(resetStorage);

test('ajustar as pessoas recalcula as quantidades, de meia em meia', async () => {
  await saveMine(aRecipe({ servings: 4, ingredients: [{ quantity: 2, unit: 'xícara', name: 'farinha' }, { quantity: null, unit: 'a gosto', name: 'sal' }] }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByText('2 xícaras de farinha')).toBeInTheDocument();
  for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole('button', { name: 'Mais pessoas' }));
  expect(screen.getByText('3 xícaras de farinha')).toBeInTheDocument();
  expect(screen.getByText('sal a gosto')).toBeInTheDocument();
});

test('mostra valor decimal com vírgula e a unidade no singular', async () => {
  await saveMine(aRecipe({ servings: 1.5 }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByRole('status')).toHaveTextContent('1,5');
  expect(screen.getAllByText(/1,5 pessoa$/).length).toBeGreaterThan(0);
});

test('não deixa as pessoas chegarem a zero', async () => {
  await saveMine(aRecipe({ servings: 0.5 }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByRole('button', { name: 'Menos pessoas' })).toBeDisabled();
});

test('receita em docinhos diz a unidade e anda de um em um', async () => {
  renderScreen(<RecipeScreen id="brigadeiro" />);
  expect(await screen.findByText(/Rende 20 docinhos/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mais docinhos' }));
  expect(screen.getByRole('status')).toHaveTextContent('21');
});

test('editar receita pronta: o link abre o formulário e a edição toma o lugar da original', async () => {
  renderScreen(<RecipeScreen id="bolo-de-fuba" />);
  expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute('href', '#/editar/bolo-de-fuba');
  expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
});

test('voltar à original apaga a edição e mantém a favorita', async () => {
  await saveMine(aRecipe({ id: 'bolo-de-fuba', originId: 'bolo-de-fuba', name: 'Meu fubá' }));
  await toggleMark('bolo-de-fuba', 'favorite');
  renderScreen(<RecipeScreen id="bolo-de-fuba" />);
  await screen.findByRole('heading', { name: 'Meu fubá' });
  expect(screen.getByText('Editada por mim')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Voltar à original' }));
  expect(await getMine('bolo-de-fuba')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Sim, voltar à original' }));
  expect(await screen.findByRole('heading', { name: 'Bolo de fubá' })).toBeInTheDocument();
  expect(await getMine('bolo-de-fuba')).toBeUndefined();
  expect(await listMarks('favorite')).toEqual(['bolo-de-fuba']);
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

test('receita sem rendimento abre sem ajuste, com link para informar', async () => {
  await saveMine(aRecipe({ servings: null }));
  renderScreen(<RecipeScreen id="r1" />);
  expect(await screen.findByRole('link', { name: 'Informe quanto a receita rende' })).toHaveAttribute('href', '#/editar/r1');
  expect(screen.queryByRole('button', { name: 'Mais pessoas' })).not.toBeInTheDocument();
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

test('adicionar às compras guarda a quantidade escolhida', async () => {
  await saveMine(aRecipe({ servings: 4 }));
  renderScreen(<RecipeScreen id="r1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Mais pessoas' }));
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar às compras' }));
  await waitFor(async () => expect((await getShopping()).selections).toEqual([{ recipeId: 'r1', servings: 4.5 }]));
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
