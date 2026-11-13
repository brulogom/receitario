import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, dateKey } from '../../domain/dates';
import { addToPlan, listPlan } from '../../storage/plan';
import { saveMine } from '../../storage/recipes';
import { getShopping, setShopping } from '../../storage/shopping';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { PlanScreen } from './PlanScreen';

beforeEach(resetStorage);

const today = () => dateKey(new Date());

test('escolher uma receita para o almoço de hoje', async () => {
  await saveMine(aRecipe({ id: 'bolo', name: 'Cuscuz da casa', servings: 8 }));
  renderScreen(<PlanScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Adicionar receita: Hoje, almoço' }));
  await userEvent.type(screen.getByLabelText('Buscar receita para Hoje, almoço'), 'cuscuz');
  await userEvent.click(await screen.findByRole('button', { name: 'Cuscuz da casa' }));

  expect(await screen.findByRole('link', { name: 'Cuscuz da casa' })).toBeInTheDocument();
  expect(await listPlan(today(), today())).toMatchObject([{ meal: 'almoco', recipeId: 'bolo', servings: 8 }]);
});

test('mudar o rendimento e tirar do plano', async () => {
  await saveMine(aRecipe({ id: 'bolo', name: 'Bolo', servings: 8 }));
  await addToPlan({ date: today(), meal: 'jantar', recipeId: 'bolo', servings: 8 });
  renderScreen(<PlanScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Mais pessoas de Bolo, Hoje, jantar' }));
  await waitFor(async () => expect((await listPlan(today(), today()))[0].servings).toBe(8.5));
  await userEvent.click(screen.getByRole('button', { name: 'Tirar Bolo de Hoje, jantar' }));
  await waitFor(async () => expect(await listPlan(today(), today())).toEqual([]));
});

test('mandar a semana para as compras soma a mesma receita e mantém o que já estava', async () => {
  await saveMine(aRecipe({ id: 'bolo', name: 'Bolo', servings: 8 }));
  await setShopping({ selections: [{ recipeId: 'pao', servings: 2 }], checked: [] });
  await addToPlan({ date: today(), meal: 'almoco', recipeId: 'bolo', servings: 8 });
  await addToPlan({ date: addDays(today(), 2), meal: 'jantar', recipeId: 'bolo', servings: 4 });
  // Fora dos 7 dias: não entra.
  await addToPlan({ date: addDays(today(), 7), meal: 'jantar', recipeId: 'bolo', servings: 4 });
  renderScreen(<PlanScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Mandar a semana para as compras' }));

  expect(await screen.findByText(/1 receita foi para a lista de compras/)).toBeInTheDocument();
  expect((await getShopping()).selections).toEqual([
    { recipeId: 'pao', servings: 2 },
    { recipeId: 'bolo', servings: 12 },
  ]);
});

test('andar para a próxima semana mostra o que foi planejado lá', async () => {
  await saveMine(aRecipe({ id: 'bolo', name: 'Bolo', servings: 8 }));
  await addToPlan({ date: addDays(today(), 8), meal: 'almoco', recipeId: 'bolo', servings: null });
  renderScreen(<PlanScreen />);
  await screen.findByRole('heading', { name: 'Hoje' });
  expect(screen.queryByRole('link', { name: 'Bolo' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
  expect(await screen.findByRole('link', { name: 'Bolo' })).toBeInTheDocument();
});
