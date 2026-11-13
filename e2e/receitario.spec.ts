import { expect, test, type Page } from '@playwright/test';

const nextLabel = 'Próximo';

type NewRecipe = { name: string; ingredients?: string; steps?: string; yields?: string; unit?: string };

/** O aplicativo começa sem receitas: cada teste cria as suas pelo formulário e recebe o id. */
async function createRecipe(page: Page, recipe: NewRecipe): Promise<string> {
  await page.goto('./#/nova');
  await page.getByLabel('Nome', { exact: true }).fill(recipe.name);
  if (recipe.ingredients) await page.getByLabel('Ingredientes, um por linha').fill(recipe.ingredients);
  if (recipe.steps) await page.getByLabel('Modo de preparo, um passo por linha').fill(recipe.steps);
  if (recipe.yields) await page.getByLabel('Quanto rende').fill(recipe.yields);
  if (recipe.unit) await page.getByLabel('Unidade').fill(recipe.unit);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: recipe.name })).toBeVisible();
  return page.evaluate(() => window.location.hash.split('/').pop() ?? '');
}

const fuba: NewRecipe = {
  name: 'Bolo de fubá',
  ingredients: '3 ovos\n2 xícaras de açúcar\n2 xícaras de fubá',
  steps: 'Bata os ovos.\nJunte o açúcar.\nJunte o fubá.\nAsse por 40 minutos.',
  yields: '12',
  unit: 'fatias',
};

test('o aplicativo começa sem receitas prontas e explica como começar', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Ainda não há receitas aqui')).toBeVisible();
  await expect(page.locator('.recipe-row')).toHaveCount(0);
  await page.getByRole('link', { name: 'Enviar livro' }).click();
  await expect(page.getByRole('heading', { name: 'Enviar livro de receitas' })).toBeVisible();
});

test('buscar, abrir, ajustar porções e entrar no modo cozinha', async ({ page }) => {
  await createRecipe(page, fuba);
  await page.goto('./#/buscar');
  // O foco automático vale para quando o aplicativo abre.
  await page.reload();
  const search = page.getByLabel('O que você quer cozinhar?');
  await expect(search).toBeFocused();
  await search.fill('acucar fuba');
  await page.locator('.grid').getByRole('link', { name: /Bolo de fubá/ }).click();
  const recipe = page.locator('article');
  await expect(recipe.getByRole('heading', { name: 'Bolo de fubá' })).toBeVisible();
  await expect(recipe.getByText('3 ovos')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Mais fatias' }).click();
  await expect(recipe.getByText('6 ovos')).toBeVisible();
  await page.getByRole('link', { name: 'Modo cozinha' }).click();
  await expect(page.getByText('Passo 1 de 4')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: nextLabel }).click();
  await page.getByRole('button', { name: 'Iniciar temporizador de 40 min' }).click();
  await expect(page.getByText('alarme só toca')).toBeVisible();
  await expect(page.getByText(/^39:5\d|^40:00/)).toBeVisible();
});

test('adição rápida, recarregar a página e a receita continua lá', async ({ page }) => {
  await page.goto('./#/nova');
  await page.getByLabel('Nome', { exact: true }).fill('Pão de frigideira');
  await page.getByLabel('Ingredientes, um por linha').fill('1 ovo\n3 colheres de sopa de tapioca');
  await page.getByLabel('Modo de preparo, um passo por linha').fill('Misture tudo\nDoure por 3 minutos');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pão de frigideira' })).toBeVisible();
  await expect(page.getByText('3 colheres de sopa de tapioca')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pão de frigideira' })).toBeVisible();
  await page.goto('./#/minhas');
  await expect(page.getByRole('link', { name: /Pão de frigideira/ })).toContainText('Minha receita');
});

test('backup: exportar, apagar os dados e importar de volta', async ({ page }) => {
  await page.goto('./#/nova');
  await page.getByLabel('Nome', { exact: true }).fill('Receita do backup');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Receita do backup' })).toBeVisible();
  await page.goto('./#/minhas');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Fazer backup' }).click();
  const download = await downloadPromise;
  const path = await download.path();

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('receitario');
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      }),
  );
  // A conexão aberta segura a exclusão até a página recarregar.
  await page.reload();
  await page.getByLabel('Importar backup').setInputFiles(path);
  await expect(page.getByRole('status')).toContainText('Backup importado');
  await expect(page.getByRole('link', { name: /Receita do backup/ })).toBeVisible();
});

test('funciona sem internet depois da primeira visita', async ({ page, context }) => {
  await createRecipe(page, fuba);
  await page.goto('./#/buscar');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 }).catch(() => page.reload());
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.grid').getByRole('link', { name: /Bolo de fubá/ })).toBeVisible();
  await page.goto('./#/livro');
  await page.getByLabel('Arquivo do livro (PDF com texto ou TXT)').setInputFiles('e2e/fixtures/livro-teste.pdf');
  await expect(page.getByRole('heading', { name: '1 receita encontrada' })).toBeVisible();
});

test('sem rolagem horizontal em nenhuma aba', async ({ page }) => {
  const id = await createRecipe(page, { ...fuba, name: 'Escondidinho de carne-seca com nome bem comprido para testar a largura' });
  for (const route of ['buscar', 'casa', 'minhas', 'salvas', 'semana', 'compras', `receita/${id}`, 'nova', 'importar', 'livro', `cozinha/${id}/`]) {
    await page.goto(`./#/${route}`);
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

test('abrir pelo menu Compartilhar leva à adição rápida com o link', async ({ page }) => {
  await page.goto(`./?url=${encodeURIComponent('https://www.tiktok.com/@a/video/1')}`);
  await expect(page.getByRole('heading', { name: 'Nova receita' })).toBeVisible();
  await expect(page.getByLabel('Link do vídeo (opcional)')).toHaveValue('https://www.tiktok.com/@a/video/1');
});

test('os dados compartilhados não voltam na próxima receita nova', async ({ page }) => {
  await page.goto(`./?url=${encodeURIComponent('https://www.tiktok.com/@a/video/1')}`);
  await page.getByLabel('Nome', { exact: true }).fill('Do TikTok');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Do TikTok' })).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = '#/nova';
  });
  await expect(page.getByRole('heading', { name: 'Nova receita' })).toBeVisible();
  await expect(page.getByLabel('Link do vídeo (opcional)')).toHaveValue('');
});

test('o rascunho sobrevive a recarregar a página', async ({ page }) => {
  await page.goto(`./?url=${encodeURIComponent('https://www.tiktok.com/@a/video/2')}`);
  await page.getByLabel('Ingredientes, um por linha').fill('2 ovos');
  await page.reload();
  await expect(page.getByText('Rascunho recuperado')).toBeVisible();
  await expect(page.getByLabel('Ingredientes, um por linha')).toHaveValue('2 ovos');
  await expect(page.getByLabel('Link do vídeo (opcional)')).toHaveValue('https://www.tiktok.com/@a/video/2');
});

test('Em casa mostra o que dá para fazer', async ({ page }) => {
  await createRecipe(page, { name: 'Doce de leite condensado', ingredients: '1 lata de leite condensado\n1 colher de sopa de manteiga' });
  await page.goto('./#/casa');
  await page.getByLabel('Ingredientes, separados por vírgula').fill('leite condensado, manteiga');
  await expect(page.locator('.list').getByRole('link', { name: /Doce de leite condensado/ })).toContainText('Dá para fazer agora');
});

test('Compras soma ingredientes de duas receitas', async ({ page }) => {
  for (const name of ['Primeiro doce', 'Segundo doce']) {
    const id = await createRecipe(page, { name, ingredients: '1 lata de leite condensado' });
    await page.goto(`./#/receita/${id}`);
    await page.getByRole('button', { name: 'Adicionar às compras' }).click();
    await expect(page.getByRole('button', { name: 'Tirar das compras' })).toBeVisible();
  }
  await page.goto('./#/compras');
  await expect(page.getByLabel('2 latas de leite condensado')).toBeVisible();
});

test('quantidades exatas, plural, dois tempos e passo lembrado ao recarregar', async ({ page }, testInfo) => {
  await page.goto('./#/nova');
  await page.getByLabel('Nome').fill('Receita completa');
  await page.getByLabel('Ingredientes, um por linha').fill('2 a 3 ovos\n2 limões\n2 pães franceses\n0,05 l de leite\novos');
  await page.getByLabel('Modo de preparo, um passo por linha').fill('Misture tudo.\nFrite por 5 minutos de cada lado e asse por meia hora.');
  await page.getByLabel('Quanto rende').fill('20');
  await page.getByLabel('Unidade').fill('docinho');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('article p', { hasText: 'Rende 20 docinhos' })).toBeVisible();
  const ingredients = page.locator('article .ingredients');
  for (const text of ['2 a 3 ovos', '2 limões', '2 pães franceses', '0,05 l de leite']) {
    await expect(ingredients.getByText(text, { exact: true })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Adicionar às compras' }).click();
  await page.getByRole('link', { name: 'Modo cozinha' }).click();
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByText('Passo 2 de 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Passo 2 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar temporizador de 5 min' }).click();
  await page.getByRole('button', { name: 'Iniciar temporizador de 30 min' }).click();
  await expect(page.getByText(/^(29:5\d|30:00)$/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dois-tempos.png') });

  await page.goto('./#/compras');
  await expect(page.getByText('2 a 3 ovos + quantidade não informada')).toBeVisible();
  await expect(page.getByText('0,05 l de leite')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('compras.png') });
});

test('enviar livro em PDF: lê, confere e salva com a fonte', async ({ page }, testInfo) => {
  await page.goto('./#/minhas');
  await page.getByRole('link', { name: 'Enviar livro' }).click();
  await page.getByLabel('Nome do livro').fill('Livro de Teste');
  await page.getByLabel('Arquivo do livro (PDF com texto ou TXT)').setInputFiles('e2e/fixtures/livro-teste.pdf');
  await expect(page.getByRole('heading', { name: '1 receita encontrada' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('conferir.png'), fullPage: true });
  await page.getByRole('button', { name: 'Salvar 1 receita' }).click();
  await page.getByRole('link', { name: 'Ver Minhas Receitas' }).click();
  await page.getByRole('link', { name: /Bolo Simples/ }).click();
  await expect(page.getByText('Fonte: Livro de Teste, página 1 do arquivo')).toBeVisible();
  await expect(page.locator('article p', { hasText: 'Rende 12 fatias' })).toBeVisible();
  await expect(page.locator('article .ingredients').getByText('3 limoes')).toBeVisible();
});

test('planejar a semana, mandar para as compras por seção, registrar que fez e guardar em coleção', async ({ page }) => {
  const id = await createRecipe(page, fuba);
  await page.goto('./#/semana');
  await page.getByRole('button', { name: 'Adicionar receita: Hoje, almoço' }).click();
  await page.getByLabel('Buscar receita para Hoje, almoço').fill('fuba');
  await page.getByRole('button', { name: 'Bolo de fubá' }).click();
  await expect(page.getByRole('link', { name: 'Bolo de fubá' })).toBeVisible();
  await page.getByRole('button', { name: 'Mandar a semana para as compras' }).click();
  await page.getByRole('link', { name: 'Abrir a lista' }).click();
  await expect(page.getByRole('heading', { name: 'Ovos, frios e laticínios' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mercearia' })).toBeVisible();
  await expect(page.getByLabel('3 ovos')).toBeVisible();

  await page.goto(`./#/receita/${id}`);
  await page.getByRole('button', { name: 'Fiz hoje' }).click();
  await page.getByRole('button', { name: 'Nota 5 de 5' }).click();
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText(/Feita 1 vez/)).toBeVisible();

  await page.getByRole('button', { name: 'Coleções' }).click();
  await page.getByLabel('Nome da nova coleção').fill('Lanche da tarde');
  await page.getByRole('button', { name: 'Criar' }).click();
  await expect(page.getByRole('button', { name: 'Coleções (1)' })).toBeVisible();
  await page.goto('./#/salvas');
  await page.getByRole('link', { name: /Lanche da tarde/ }).click();
  await expect(page.getByRole('link', { name: /Bolo de fubá/ })).toBeVisible();

  // Tudo continua lá depois de recarregar.
  await page.goto(`./#/receita/${id}`);
  await page.reload();
  await expect(page.getByText(/Feita 1 vez/)).toBeVisible();
});
