import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveMine } from '../../storage/recipes';
import { getShopping, setShopping } from '../../storage/shopping';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { ShoppingScreen } from './ShoppingScreen';

beforeEach(resetStorage);

async function twoRecipes() {
  await saveMine(aRecipe({ id: 'a', name: 'Receita A', servings: 4, ingredients: [{ quantity: 1, unit: 'xícara', name: 'açúcar' }] }));
  await saveMine(aRecipe({ id: 'b', name: 'Receita B', servings: 4, ingredients: [{ quantity: 2, unit: 'xícara', name: 'açúcar' }, { quantity: 2, unit: '', name: 'ovo' }] }));
  await setShopping({ selections: [{ recipeId: 'a', servings: 4 }, { recipeId: 'b', servings: 4 }], checked: [] });
}

test('soma ingredientes de duas receitas', async () => {
  await twoRecipes();
  renderScreen(<ShoppingScreen />);
  expect(await screen.findByLabelText('3 xícaras de açúcar')).toBeInTheDocument();
  expect(screen.getByLabelText('2 ovos')).toBeInTheDocument();
});

test('itens marcados continuam marcados ao reabrir', async () => {
  await twoRecipes();
  const first = renderScreen(<ShoppingScreen />);
  await userEvent.click(await screen.findByLabelText('2 ovos'));
  await waitFor(async () => expect((await getShopping()).checked).toHaveLength(1));
  first.unmount();
  renderScreen(<ShoppingScreen />);
  expect(await screen.findByLabelText('2 ovos')).toBeChecked();
});

test('mudar as pessoas na lista recalcula, de meia em meia', async () => {
  await twoRecipes();
  renderScreen(<ShoppingScreen />);
  await screen.findByLabelText('3 xícaras de açúcar');
  await userEvent.click(screen.getByRole('button', { name: 'Mais pessoas de Receita B' }));
  await userEvent.click(screen.getByRole('button', { name: 'Mais pessoas de Receita B' }));
  expect(await screen.findByLabelText('3 ½ xícaras de açúcar')).toBeInTheDocument();
});

test('tirar uma receita da lista', async () => {
  await twoRecipes();
  renderScreen(<ShoppingScreen />);
  await screen.findByLabelText('3 xícaras de açúcar');
  await userEvent.click(screen.getByRole('button', { name: 'Tirar Receita B da lista' }));
  expect(await screen.findByLabelText('1 xícara de açúcar')).toBeInTheDocument();
});

test('lista vazia explica como usar', async () => {
  renderScreen(<ShoppingScreen />);
  expect(await screen.findByText(/Adicionar às compras/)).toBeInTheDocument();
});

test('separa os itens pelas seções do mercado', async () => {
  await twoRecipes();
  renderScreen(<ShoppingScreen />);
  await screen.findByLabelText('3 xícaras de açúcar');
  const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
  expect(headings).toEqual(['Ovos, frios e laticínios', 'Mercearia']);
});

test('a seção corrigida pela pessoa fica guardada', async () => {
  await twoRecipes();
  const first = renderScreen(<ShoppingScreen />);
  await screen.findByLabelText('3 xícaras de açúcar');
  await userEvent.click(screen.getByRole('button', { name: 'Arrumar seções' }));
  await userEvent.selectOptions(screen.getByLabelText('Seção de ovo'), 'hortifruti');
  await waitFor(async () => expect((await getShopping()).sections).toEqual({ ovo: 'hortifruti' }));
  first.unmount();
  renderScreen(<ShoppingScreen />);
  await screen.findByLabelText('2 ovos');
  expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Hortifrúti', 'Mercearia']);
});
