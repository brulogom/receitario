import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { catalog } from '../../catalog';
import { listMarks } from '../../storage/marks';
import { getMine, listMine, saveMine } from '../../storage/recipes';
import { aRecipe } from '../../storage/testRecipe';
import { renderScreen, resetStorage } from '../testUtils';
import { RecipeForm } from './RecipeForm';

beforeEach(resetStorage);

const save = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

test('adição rápida salva só com o nome', async () => {
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Pão de frigideira');
  await save();
  await waitFor(async () => expect(await listMine()).toHaveLength(1));
  const [saved] = await listMine();
  expect(saved).toMatchObject({ name: 'Pão de frigideira', servings: null, minutes: null, ingredients: [], steps: [] });
});

test('sem nome, não salva e explica o motivo', async () => {
  renderScreen(<RecipeForm />);
  await save();
  expect(screen.getByRole('alert')).toHaveTextContent('Dê um nome');
  expect(await listMine()).toEqual([]);
});

test('separa ingredientes e passos, um por linha', async () => {
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Bolo');
  await userEvent.type(screen.getByLabelText('Ingredientes, um por linha'), '2 xícaras de farinha{enter}um pouco de amor');
  await userEvent.type(screen.getByLabelText('Modo de preparo, um passo por linha'), 'Misture{enter}Asse por 30 minutos');
  await save();
  await waitFor(async () => expect(await listMine()).toHaveLength(1));
  const [saved] = await listMine();
  expect(saved.ingredients).toEqual([
    { quantity: 2, unit: 'xícara', name: 'farinha' },
    { quantity: null, unit: '', name: 'um pouco de amor' },
  ]);
  expect(saved.steps).toEqual(['Misture', 'Asse por 30 minutos']);
});

test('tempo, categoria, foto e anotações ficam recolhidos; quanto rende fica à vista', () => {
  renderScreen(<RecipeForm />);
  const details = screen.getByText('Mais detalhes (opcional)').closest('details');
  expect(details).not.toHaveAttribute('open');
  expect(details).not.toContainElement(screen.getByLabelText('Quanto rende'));
});

test('aceita rendimento decimal e a unidade escolhida', async () => {
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Crepe');
  await userEvent.type(screen.getByLabelText('Quanto rende'), '1,5');
  fireEvent.change(screen.getByLabelText('Unidade, no plural'), { target: { value: 'Crepes' } });
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'ambos' } });
  await save();
  await waitFor(async () => expect(await listMine()).toHaveLength(1));
  const [saved] = await listMine();
  expect(saved).toMatchObject({ servings: 1.5, servingsUnit: 'crepes', kind: 'ambos' });
});

test('editar receita pronta salva por cima com o mesmo id, sem mudar o catálogo', async () => {
  const original = catalog.find((recipe) => recipe.id === 'brigadeiro')!;
  renderScreen(<RecipeForm initial={original} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Meu brigadeiro' } });
  await save();
  await waitFor(async () => expect(await getMine('brigadeiro')).toBeDefined());
  expect(await getMine('brigadeiro')).toMatchObject({ name: 'Meu brigadeiro', source: 'mine', originId: 'brigadeiro', servingsUnit: 'docinhos' });
  expect(original.name).toBe('Brigadeiro de panela');
});

test('marcar Quero testar ao salvar', async () => {
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Do TikTok');
  await userEvent.click(screen.getByLabelText('Marcar como Quero testar'));
  await save();
  await waitFor(async () => expect(await listMarks('try')).toHaveLength(1));
});

test('guarda o link do vídeo', async () => {
  renderScreen(<RecipeForm />);
  await userEvent.type(screen.getByLabelText('Nome'), 'Do Instagram');
  await userEvent.type(screen.getByLabelText('Link do vídeo (opcional)'), 'https://instagram.com/p/abc');
  await save();
  await waitFor(async () => expect((await listMine())[0]?.videoUrl).toBe('https://instagram.com/p/abc'));
});

test('texto não reconhecido fica visível, editável e vai para as anotações', async () => {
  renderScreen(<RecipeForm initial={{ name: 'Bolo' }} leftovers={['#bolo @fulana']} />);
  expect(screen.getByLabelText('Texto não reconhecido')).toHaveValue('#bolo @fulana');
  await save();
  await waitFor(async () => expect((await listMine())[0]?.notes).toContain('#bolo @fulana'));
});

test('editar mantém o nome-base dos ingredientes que não mudaram', async () => {
  await saveMine(aRecipe({ ingredients: [{ quantity: 1, unit: 'kg', name: 'peito de frango', base: 'frango' }] }));
  const recipe = await getMine('r1');
  renderScreen(<RecipeForm initial={recipe} />);
  expect(screen.getByLabelText('Ingredientes, um por linha')).toHaveValue('1 kg de peito de frango');
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro nome' } });
  await save();
  await waitFor(async () => expect((await getMine('r1'))?.name).toBe('Outro nome'));
  expect((await getMine('r1'))?.ingredients[0].base).toBe('frango');
});

describe('rascunho da nova receita', () => {
  const form = (props = {}) => renderScreen(<RecipeForm draft {...props} />);

  test('o que foi digitado volta ao reabrir, mesmo se o aplicativo fechar', async () => {
    const first = form();
    await userEvent.type(screen.getByLabelText('Nome'), 'Pão');
    await userEvent.type(screen.getByLabelText('Ingredientes, um por linha'), '1 ovo');
    first.unmount();
    form();
    expect(screen.getByLabelText('Nome')).toHaveValue('Pão');
    expect(screen.getByLabelText('Ingredientes, um por linha')).toHaveValue('1 ovo');
    expect(screen.getByText(/Rascunho recuperado/)).toBeInTheDocument();
  });

  test('o que veio do menu Compartilhar também fica guardado', async () => {
    const first = form({ initial: { videoUrl: 'https://a.com/v' }, leftovers: ['Legenda'] });
    first.unmount();
    form();
    expect(screen.getByLabelText('Link do vídeo (opcional)')).toHaveValue('https://a.com/v');
    expect(screen.getByLabelText('Texto não reconhecido')).toHaveValue('Legenda');
  });

  test('salvar apaga o rascunho', async () => {
    const first = form();
    await userEvent.type(screen.getByLabelText('Nome'), 'Pão');
    await save();
    await waitFor(async () => expect(await listMine()).toHaveLength(1));
    first.unmount();
    form();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  test('cancelar com conteúdo pede confirmação e só então descarta', async () => {
    const first = form();
    await userEvent.type(screen.getByLabelText('Nome'), 'Pão');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(window.location.hash).not.toBe('#/minhas');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar escrevendo' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Pão');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, descartar' }));
    expect(window.location.hash).toBe('#/minhas');
    first.unmount();
    form();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  test('cancelar sem conteúdo sai direto', async () => {
    form();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(window.location.hash).toBe('#/minhas');
  });
});

test('cancelar uma edição com mudanças pede confirmação', async () => {
  await saveMine(aRecipe());
  const recipe = await getMine('r1');
  renderScreen(<RecipeForm initial={recipe} />);
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(window.location.hash).toBe('#/receita/r1');
  window.location.hash = '';
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro' } });
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: 'Sim, descartar' })).toBeInTheDocument();
});

test('não reescreve porções quando a pessoa limpa o campo', async () => {
  await saveMine(aRecipe({ servings: 4 }));
  const recipe = await getMine('r1');
  renderScreen(<RecipeForm initial={recipe} />);
  fireEvent.change(screen.getByLabelText('Quanto rende'), { target: { value: '' } });
  await save();
  await waitFor(async () => expect((await getMine('r1'))?.servings).toBeNull());
});
