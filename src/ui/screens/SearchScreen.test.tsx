import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { SearchScreen } from './SearchScreen';

beforeEach(resetStorage);

test('abre com o campo de busca em foco', async () => {
  renderScreen(<SearchScreen />);
  expect(await screen.findByLabelText('O que você quer cozinhar?')).toHaveFocus();
});

test('a lista muda enquanto digita', async () => {
  renderScreen(<SearchScreen />);
  await screen.findByRole('link', { name: /Bolo de fubá/ });
  await userEvent.type(screen.getByLabelText('O que você quer cozinhar?'), 'brigad');
  expect(screen.getByRole('link', { name: /Brigadeiro/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Bolo de fubá/ })).not.toBeInTheDocument();
});

test('receita da pessoa mostra a etiqueta Minha receita', async () => {
  await saveMine(aRecipe({ name: 'Minha torta secreta' }));
  renderScreen(<SearchScreen />);
  const link = await screen.findByRole('link', { name: /Minha torta secreta/ });
  expect(within(link).getByText('Minha receita')).toBeInTheDocument();
});

test('filtros reduzem a lista', async () => {
  renderScreen(<SearchScreen />);
  await screen.findByRole('link', { name: /Bolo de fubá/ });
  await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
  expect(screen.queryByRole('link', { name: /Bolo de fubá/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Mate gelado/ })).toBeInTheDocument();
});

test('sem resultado, explica o que fazer', async () => {
  renderScreen(<SearchScreen />);
  await userEvent.type(await screen.findByLabelText('O que você quer cozinhar?'), 'xyzxyzxyz');
  expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
});

test('receita sem tipo aparece nos dois filtros e não diz ser salgada', async () => {
  await saveMine(aRecipe({ id: 'sem-tipo', name: 'Receita sem tipo', kind: 'indefinido', minutes: null, servings: null }));
  renderScreen(<SearchScreen />);
  const row = await screen.findByRole('link', { name: /Receita sem tipo/ });
  expect(row).not.toHaveTextContent('Salgado');
  await userEvent.click(screen.getByRole('button', { name: 'Doces' }));
  expect(screen.getByRole('link', { name: /Receita sem tipo/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Salgados' }));
  expect(screen.getByRole('link', { name: /Receita sem tipo/ })).toBeInTheDocument();
});
