import { expect, test } from '@playwright/test';

const nextLabel = 'Próximo';

test('buscar, abrir, ajustar porções e entrar no modo cozinha', async ({ page }) => {
  await page.goto('./');
  const search = page.getByLabel('O que você quer cozinhar?');
  await expect(search).toBeFocused();
  await search.fill('acucar fuba');
  await page.getByRole('link', { name: /Bolo de fubá/ }).click();
  await expect(page.getByRole('heading', { name: 'Bolo de fubá' })).toBeVisible();
  await expect(page.getByText('3 ovos')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Mais fatias' }).click();
  await expect(page.getByText('6 ovos')).toBeVisible();
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
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 }).catch(() => page.reload());
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', { name: /Bolo de fubá/ })).toBeVisible();
});

test('sem rolagem horizontal em nenhuma aba', async ({ page }) => {
  for (const route of ['buscar', 'casa', 'minhas', 'salvas', 'compras', 'receita/escondidinho-de-carne-seca', 'nova', 'importar', 'cozinha/bolo-de-fuba/']) {
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
  await page.goto('./#/casa');
  await page.getByLabel('Ingredientes, separados por vírgula').fill('leite condensado, manteiga, chocolate em pó, chocolate granulado');
  await expect(page.getByRole('link', { name: /Brigadeiro de panela/ })).toContainText('Dá para fazer agora');
});

test('Compras soma ingredientes de duas receitas', async ({ page }) => {
  await page.goto('./#/receita/brigadeiro');
  await page.getByRole('button', { name: 'Adicionar às compras' }).click();
  await expect(page.getByRole('button', { name: 'Tirar das compras' })).toBeVisible();
  await page.goto('./#/receita/beijinho');
  await page.getByRole('button', { name: 'Adicionar às compras' }).click();
  await expect(page.getByRole('button', { name: 'Tirar das compras' })).toBeVisible();
  await page.goto('./#/compras');
  await expect(page.getByLabel('2 latas de leite condensado')).toBeVisible();
});

test('editar receita pronta substitui a original e dá para voltar', async ({ page }, testInfo) => {
  await page.goto('./#/receita/brigadeiro');
  await expect(page.locator('p', { hasText: 'Rende 20 docinhos' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('receita.png'), fullPage: true });
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Nome').fill('Brigadeiro da casa');
  await page.getByText('Mais detalhes (opcional)').click();
  await page.getByLabel('Tipo').selectOption('ambos');
  await page.screenshot({ path: testInfo.outputPath('formulario.png'), fullPage: true });
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Brigadeiro da casa' })).toBeVisible();
  await expect(page.locator('article .tag', { hasText: 'Editada por mim' })).toBeVisible();

  await page.goto('./#/buscar');
  await page.getByLabel('O que você quer cozinhar?').fill('brigadeiro');
  await expect(page.getByRole('link', { name: /Brigadeiro da casa/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Brigadeiro de panela/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salgados' }).click();
  await expect(page.getByRole('link', { name: /Brigadeiro da casa/ })).toBeVisible();

  await page.getByRole('link', { name: /Brigadeiro da casa/ }).click();
  await page.getByRole('button', { name: 'Voltar à original' }).click();
  await page.getByRole('button', { name: 'Sim, voltar à original' }).click();
  await expect(page.getByRole('heading', { name: 'Brigadeiro de panela' })).toBeVisible();
});
