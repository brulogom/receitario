import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toggleMark } from '../../storage/marks';
import { listMine } from '../../storage/recipes';
import { renderScreen, resetStorage } from '../testUtils';
import { PantryScreen } from './PantryScreen';
import { SavedScreen } from './SavedScreen';

beforeEach(resetStorage);

const field = () => screen.findByLabelText('Ingredientes, separados por vírgula');

test('sem ingredientes, explica o que fazer', async () => {
  renderScreen(<PantryScreen />);
  await field();
  expect(screen.getByText(/Conte o que você tem/)).toBeInTheDocument();
});

test('mostra "Dá para fazer agora" e "Falta: ..."', async () => {
  renderScreen(<PantryScreen />);
  await userEvent.type(await field(), 'leite condensado, manteiga, chocolate em pó, chocolate granulado');
  const ready = screen.getByRole('link', { name: /Brigadeiro de panela/ });
  expect(ready).toHaveTextContent('Dá para fazer agora');
  expect(screen.getByRole('link', { name: /Beijinho de coco/ })).toHaveTextContent('Falta: coco ralado');
});

test('lembra os ingredientes informados ao reabrir', async () => {
  const first = renderScreen(<PantryScreen />);
  await userEvent.type(await field(), 'ovo, leite');
  first.unmount();
  renderScreen(<PantryScreen />);
  expect(await field()).toHaveValue('ovo, leite');
});

test('Salvas mostra Favoritos e Quero testar sem criar cópia', async () => {
  await toggleMark('pudim-de-leite', 'favorite');
  await toggleMark('quindim', 'try');
  renderScreen(<SavedScreen />);
  expect(await screen.findByRole('link', { name: /Pudim de leite/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Quindim/ })).toBeInTheDocument();
  expect(await listMine()).toEqual([]);
});

test('Salvas vazia explica como usar', async () => {
  renderScreen(<SavedScreen />);
  expect(await screen.findByText(/Toque em Favoritar/)).toBeInTheDocument();
});
