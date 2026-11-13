import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCollection, listCollections } from '../../storage/collections';
import { addCooked } from '../../storage/cooked';
import { getMine, saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { CollectionScreen } from './CollectionScreen';
import { RecipeForm } from './RecipeForm';
import { SavedScreen } from './SavedScreen';
import { SearchScreen } from './SearchScreen';

beforeEach(resetStorage);

describe('coleções', () => {
  test('criar em Salvas e ver quantas receitas tem', async () => {
    await saveMine(aRecipe());
    await createCollection('Marmitas', ['r1', 'excluida']);
    renderScreen(<SavedScreen />);
    const link = await screen.findByRole('link', { name: /Marmitas/ });
    // Receita que não existe mais não conta.
    expect(link).toHaveTextContent('1 receita');
    expect(link).toHaveAttribute('href', expect.stringMatching(/^#\/colecao\//));

    await userEvent.type(screen.getByLabelText('Nome da nova coleção'), 'Natal');
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByRole('link', { name: /Natal/ })).toHaveTextContent('0 receitas');
  });

  test('a tela da coleção lista, renomeia, tira receita e exclui com confirmação', async () => {
    await saveMine(aRecipe({ id: 'a', name: 'Rabanada' }));
    await saveMine(aRecipe({ id: 'b', name: 'Pavê' }));
    const collection = await createCollection('Natal', ['a', 'b']);
    renderScreen(<CollectionScreen id={collection.id} />);

    expect(await screen.findByRole('heading', { name: 'Natal' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Renomear' }));
    await userEvent.clear(screen.getByLabelText('Nome da coleção'));
    await userEvent.type(screen.getByLabelText('Nome da coleção'), 'Ceia de Natal');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('heading', { name: 'Ceia de Natal' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tirar Pavê da coleção' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Pavê/ })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Excluir coleção' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('As receitas continuam guardadas');
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    await waitFor(async () => expect(await listCollections()).toEqual([]));
    expect(await getMine('b')).toBeTruthy();
    expect(window.location.hash).toBe('#/salvas');
  });
});

describe('tela inicial', () => {
  test('mostra em grade, com a nota média, e lembra a escolha de lista', async () => {
    await saveMine(aRecipe({ name: 'Bolo da casa' }));
    await addCooked({ recipeId: 'r1', date: '2026-11-01', rating: 5, comment: '' });
    await addCooked({ recipeId: 'r1', date: '2026-11-02', rating: 4, comment: '' });
    const first = renderScreen(<SearchScreen />);
    const card = (await screen.findAllByRole('link', { name: /Bolo da casa/ }))[0];
    expect(card).toHaveClass('recipe-card');
    expect(within(card).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect((await screen.findAllByRole('link', { name: /Bolo da casa/ }))[0]).toHaveClass('recipe-row');
    first.unmount();
    renderScreen(<SearchScreen />);
    expect((await screen.findAllByRole('link', { name: /Bolo da casa/ }))[0]).toHaveClass('recipe-row');
  });

  test('filtrar por etiqueta', async () => {
    await saveMine(aRecipe({ id: 'a', name: 'Rabanada da vó', tags: ['Natal'] }));
    await saveMine(aRecipe({ id: 'b', name: 'Pudim da vó' }));
    renderScreen(<SearchScreen />);
    await screen.findAllByRole('link', { name: /Pudim da vó/ });
    await userEvent.click(screen.getByText(/Mais filtros/));
    await userEvent.click(within(screen.getByRole('group', { name: 'Etiquetas' })).getByRole('button', { name: '# Natal' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Pudim da vó/ })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Rabanada da vó/ })).toBeInTheDocument();
  });

  test('Me surpreenda abre uma das receitas encontradas', async () => {
    await saveMine(aRecipe({ id: 'unica', name: 'Xinxim de galinha' }));
    renderScreen(<SearchScreen />);
    await userEvent.type(await screen.findByLabelText('O que você quer cozinhar?'), 'xinxim');
    await screen.findByRole('link', { name: /Xinxim de galinha/ });
    await userEvent.click(screen.getByRole('button', { name: 'Me surpreenda' }));
    expect(window.location.hash).toBe('#/receita/unica');
  });
});

test('formulário: etiquetas digitadas e sugeridas são salvas sem repetir', async () => {
  await saveMine(aRecipe({ id: 'outra', name: 'Outra', tags: ['Natal', 'rápida'] }));
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Farofa');
  await userEvent.type(screen.getByLabelText('Etiquetas (opcional)'), 'da vó, natal');
  const suggestions = await screen.findByRole('group', { name: 'Etiquetas que você já usa' });
  // "Natal" já foi escrita: só sobra a sugestão de "rápida".
  expect(within(suggestions).getAllByRole('button').map((button) => button.textContent)).toEqual(['+ rápida']);
  await userEvent.click(within(suggestions).getByRole('button', { name: '+ rápida' }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

  await waitFor(() => expect(window.location.hash).toMatch(/^#\/receita\//));
  const id = window.location.hash.split('/')[2];
  expect((await getMine(id))?.tags).toEqual(['da vó', 'natal', 'rápida']);
});
