# Receitário: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** construir o PWA Receitário descrito no spec, pronto para publicar no GitHub Pages e instalar em um Android.

**Architecture:** aplicativo estático, sem backend. A lógica pura fica em `src/domain` e é coberta por testes. Os dados da pessoa ficam em `src/storage` (IndexedDB). O catálogo fica em `src/catalog` como dados. As telas ficam em `src/ui`, sem regra de negócio.

**Tech Stack:** Vite, React 18, TypeScript, MiniSearch, idb, vite-plugin-pwa, Vitest, Testing Library, fake-indexeddb, Playwright, @fontsource (Inter e Bricolage Grotesque).

**Spec:** `docs/superpowers/specs/2026-11-06-receitario-design.md`

## Global Constraints

- Todos os textos da interface em português do Brasil, com acentos corretos.
- Sem backend, sem conta, sem serviço pago, sem chamadas de rede para funcionar; fontes empacotadas, não carregadas do Google.
- **Nenhum APK, AAB, TWA ou empacotamento nativo sem perguntar ao dono.**
- **Nenhum `git init`, commit, push ou publicação sem o dono pedir.** Por isso, este plano não tem passos de commit.
- Atualizações nunca apagam dados da pessoa: toda mudança de esquema passa por versão e migração do banco.
- Alvos de toque de pelo menos 44 px; contraste de texto de pelo menos 4,5:1.
- Visual da simulação aprovada: fundo `#F4F7F5`, texto `#14241F`, verde `#0B6B53`, secundário `#4F5F59`, alerta `#A12F16`, modo cozinha `#0E2A23`, temporizador `#FFB199`, ilustração doce `#FCE3D3`, ilustração salgado `#D7EFE3`. Títulos em Bricolage Grotesque, corpo em Inter.
- Abas nesta ordem: Buscar, Em casa, Minhas, Salvas, Compras. No celular, barra inferior; a partir de 900 px, menu lateral, lista e receita aberta em colunas.

## Review Focus

1. Legenda colada do Instagram ou TikTok, com emoji, hashtag ou menção: nenhuma linha some; o que não for reconhecido fica editável.
2. Arquivo de backup inválido, de outro programa ou corrompido: é recusado com mensagem clara e nada é alterado.
3. Compartilhamento que traz só um link: o link vai para o campo de vídeo, sem virar ingrediente ou preparo.
4. Voltar ao aplicativo depois de sair durante um temporizador: a tela volta a ficar ligada e o alarme vencido toca.
5. Receita sem porções, sem ingredientes ou sem preparo: abre, busca e entra nas listas sem erro; o ajuste de porções e o modo cozinha ficam indisponíveis com explicação.

---

### Task 1: Projeto, tipos e porções

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/domain/types.ts`, `src/domain/text.ts`, `src/domain/portions.ts`
- Test: `src/domain/text.test.ts`, `src/domain/portions.test.ts`

**Interfaces:**
- Produces:
  - `type Ingredient = { quantity: number | null; unit: string; name: string; base?: string }`
  - `type RecipeKind = 'doce' | 'salgado'`
  - `type Category = 'doces' | 'bolos' | 'massas' | 'carnes' | 'aves' | 'peixes' | 'arroz e feijão' | 'salgadinhos' | 'vegetariano' | 'bebidas'`
  - `type Diet = { vegetarian: boolean; lactoseFree: boolean; glutenFree: boolean }`
  - `type Recipe = { id: string; source: 'catalog' | 'mine'; originId?: string; name: string; kind: RecipeKind; categories: Category[]; diet: Diet; minutes: number | null; servings: number | null; ingredients: Ingredient[]; steps: string[]; notes: string; videoUrl: string; photo?: Blob; createdAt: string; updatedAt: string }`
  - `normalize(text: string): string`: minúsculas, sem acentos, espaços reduzidos.
  - `scaleQuantity(quantity: number, from: number, to: number): number`
  - `formatQuantity(quantity: number): string`
  - `formatIngredient(ingredient: Ingredient, factor?: number): string`

- [ ] **Step 1: Criar o projeto Vite + React + TS, com Vitest em ambiente jsdom e `base: './'`**

Run: `npm install` e depois `npm run build`. Expected: build sem erros.

- [ ] **Step 2: Escrever os testes**

```ts
expect(normalize('  AÇÚCAR  Mascavo ')).toBe('acucar mascavo');
expect(scaleQuantity(2, 4, 6)).toBe(3);
expect(formatQuantity(1.5)).toBe('1 ½');
expect(formatQuantity(0.33)).toBe('⅓');
expect(formatQuantity(750)).toBe('750');
expect(formatIngredient({ quantity: 2, unit: 'xícara', name: 'açúcar' })).toBe('2 xícaras de açúcar');
expect(formatIngredient({ quantity: 3, unit: '', name: 'ovo' })).toBe('3 ovos');
expect(formatIngredient({ quantity: null, unit: 'a gosto', name: 'sal' }, 2)).toBe('sal a gosto');
expect(formatIngredient({ quantity: 1, unit: 'xícara', name: 'leite' }, 1.5)).toBe('1 ½ xícara de leite');
```

- [ ] **Step 3: Rodar e confirmar que falham.** Run: `npx vitest run src/domain`. Expected: FAIL.
- [ ] **Step 4: Implementar.** Quantidades de 10 para cima são arredondadas para inteiro; frações usam ¼ ⅓ ½ ⅔ ¾. O plural só vale para quantidade de 2 ou mais (`colher de sopa` vira `colheres de sopa`).
- [ ] **Step 5: Rodar e confirmar que passam.** Run: `npx vitest run src/domain`. Expected: PASS.

### Task 2: Leitor de texto

**Files:**
- Create: `src/domain/parser.ts`
- Test: `src/domain/parser.test.ts`

**Interfaces:**
- Consumes: `Ingredient`.
- Produces:
  - `parseIngredientLine(line: string): Ingredient`
  - `parseIngredientLines(text: string): Ingredient[]`
  - `parseSteps(text: string): string[]`
  - `parseRecipeText(text: string): { name: string; ingredients: Ingredient[]; steps: string[]; unrecognized: string[] }`

- [ ] **Step 1: Escrever os testes**

```ts
expect(parseIngredientLine('2 xícaras de farinha')).toEqual({ quantity: 2, unit: 'xícara', name: 'farinha' });
expect(parseIngredientLine('1/2 kg de carne').quantity).toBe(0.5);
expect(parseIngredientLine('1 e 1/2 colher de sopa de manteiga').quantity).toBe(1.5);
expect(parseIngredientLine('½ cebola')).toEqual({ quantity: 0.5, unit: '', name: 'cebola' });
expect(parseIngredientLine('sal a gosto')).toEqual({ quantity: null, unit: 'a gosto', name: 'sal' });
expect(parseIngredientLine('um punhado de amor')).toEqual({ quantity: null, unit: '', name: 'um punhado de amor' });
expect(parseIngredientLine('- 3 ovos').name).toBe('ovos');
expect(parseSteps('1. Misture.\n\n2) Asse.')).toEqual(['Misture.', 'Asse.']);

test('legenda com emoji e hashtag não perde linhas', () => {
  const r = parseRecipeText('Bolo fofinho 😍\nIngredientes:\n2 ovos\nModo de preparo:\nMisture\nAsse\n#bolo @fulana');
  expect(r.name).toBe('Bolo fofinho 😍');
  expect(r.ingredients).toHaveLength(1);
  expect(r.steps).toEqual(['Misture', 'Asse']);
  expect(r.unrecognized).toEqual(['#bolo @fulana']);
});
test('texto sem títulos fica todo disponível para conferência', () => {
  const r = parseRecipeText('Bata tudo e asse');
  expect(r.unrecognized).toEqual(['Bata tudo e asse']);
});
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/domain/parser`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Títulos aceitos, sem diferenciar acentos ou maiúsculas: `ingredientes`, `modo de preparo`, `preparo`, `como fazer`, `modo de fazer`. Unidades: xícara, colher de sopa, colher de chá, lata, caixa, pacote, dente, folha, copo, pitada, kg, g, ml, l. Sem títulos, nenhuma linha é classificada: tudo vai para `unrecognized`.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/domain/parser`. Expected: PASS.

### Task 3: Banco local, histórico e marcações

**Files:**
- Create: `src/storage/db.ts`, `src/storage/recipes.ts`, `src/storage/marks.ts`, `src/storage/shopping.ts`
- Test: `src/storage/recipes.test.ts`, `src/storage/marks.test.ts`, com `fake-indexeddb`

**Interfaces:**
- Consumes: `Recipe`.
- Produces:
  - `openDb(): Promise<IDBPDatabase>`, esquema versão 1, com stores `recipes`, `versions`, `marks`, `shopping`
  - `type RecipeVersion = { id: string; recipeId: string; savedAt: string; snapshot: Recipe }`
  - `listMine(): Promise<Recipe[]>`, `getMine(id): Promise<Recipe | undefined>`
  - `saveMine(recipe: Recipe): Promise<Recipe>`: guarda a versão anterior e atualiza `updatedAt`
  - `copyFromCatalog(recipe: Recipe): Promise<Recipe>`: cria uma cópia com `originId`
  - `deleteMine(id): Promise<void>`: remove receita, histórico e marcações
  - `listVersions(id): Promise<RecipeVersion[]>`, da mais nova para a mais antiga
  - `restoreVersion(versionId): Promise<Recipe>`
  - `type MarkKind = 'favorite' | 'try'`; `toggleMark(recipeId, kind): Promise<boolean>`; `listMarks(kind): Promise<string[]>`
  - `type ShoppingState = { selections: { recipeId: string; servings: number | null }[]; checked: string[] }`; `getShopping()`, `setShopping(state)`

- [ ] **Step 1: Escrever os testes**

```ts
test('editar guarda a versão anterior', ...);        // listVersions(id)[0].snapshot.name === nome antigo
test('guarda no máximo 50 versões', ...);            // 55 edições, listVersions(id).length === 50
test('voltar a uma versão cria nova versão e não apaga as outras', ...);
test('copiar do catálogo cria id novo e guarda originId', ...);
test('excluir remove histórico e marcações', ...);
test('marcar e desmarcar', ...);                     // toggleMark retorna true e depois false
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/storage`. Expected: FAIL.
- [ ] **Step 3: Implementar com `idb`.** Importar `fake-indexeddb/auto` só no setup dos testes.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/storage`. Expected: PASS.

### Task 4: Backup

**Files:**
- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: as funções e stores da Task 3.
- Produces:
  - `exportBackup(): Promise<string>`: JSON com `{ format: 'receitario-backup', version: 1, exportedAt, recipes, versions, marks, shopping }`, fotos em base64
  - `importBackup(json: string): Promise<{ added: number; updated: number; kept: number }>`
  - `class InvalidBackupError extends Error`

- [ ] **Step 1: Escrever os testes**

```ts
test('exportar e importar em banco vazio restaura tudo, inclusive foto', ...);
test('importar nunca apaga receita que só existe no aparelho', ...);
test('mesma receita: fica a mais recente e a outra vai para o histórico', ...);
test.each(['não é json', '{}', '{"format":"outro"}', '{"format":"receitario-backup","version":99}'])(
  'backup inválido é recusado sem alterar nada', ...); // rejeita com InvalidBackupError e listMine() igual
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/storage/backup`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Validar o arquivo inteiro antes da primeira escrita e gravar tudo em uma única transação.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/storage/backup`. Expected: PASS.

### Task 5: Catálogo

**Files:**
- Create: `src/catalog/doces.ts`, `src/catalog/salgados.ts`, `src/catalog/index.ts`
- Test: `src/catalog/catalog.test.ts`

**Interfaces:**
- Consumes: `Recipe`.
- Produces: `catalog: Recipe[]`, com `source: 'catalog'`, `id` fixo em kebab-case e `base` nos ingredientes.

- [ ] **Step 1: Escrever os testes de validação**

```ts
expect(catalog.length).toBeGreaterThanOrEqual(55);
// entre 40% e 60% de doces; ids únicos; todo item com ingredientes, passos, minutos, porções e categoria
// nome de ingrediente nunca com quantidade embutida
// vegetarian=true sem carne, frango, bacon, peixe, bacalhau, camarão, linguiça, atum, presunto, carne-seca
// lactoseFree=true sem leite, manteiga, queijo, creme de leite, requeijão
// glutenFree=true sem farinha de trigo, macarrão, pão, biscoito, fermento biológico
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/catalog`. Expected: FAIL.
- [ ] **Step 3: Escrever as receitas originais, sem copiar sites.** Cerca de 30 doces e 30 salgados de comida caseira carioca: arroz soltinho, feijão, farofa, picadinho, empadão, escondidinho, bolinho de bacalhau, bolo de fubá, pudim, brigadeiro e outras do mesmo estilo. Passos com tempo escrevem `N minutos`, para o temporizador reconhecer.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/catalog`. Expected: PASS.

### Task 6: Busca

**Files:**
- Create: `src/domain/search.ts`, `src/domain/ingredientMatch.ts`
- Test: `src/domain/search.test.ts`, `src/domain/ingredientMatch.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `normalize`.
- Produces:
  - `ingredientMatches(term: string, ingredient: Ingredient): boolean`
  - `type Filters = { categories: Category[]; maxMinutes: number | null; diet: (keyof Diet)[] }`
  - `createSearch(recipes: Recipe[]): (query: string, filters: Filters) => Recipe[]`

- [ ] **Step 1: Escrever os testes**

```ts
// ingredientMatches
expect(ingredientMatches('frango', { quantity: 1, unit: 'kg', name: 'peito de frango', base: 'frango' })).toBe(true);
expect(ingredientMatches('batata', { quantity: 1, unit: '', name: 'batata-doce' })).toBe(false);
expect(ingredientMatches('frango', { quantity: 1, unit: '', name: 'caldo de frango' })).toBe(false);
expect(ingredientMatches('acucar', { quantity: 1, unit: 'xícara', name: 'açúcar' })).toBe(true);
// busca
test('acucar, açúcar e açucar dão o mesmo resultado', ...);
test('erro pequeno de digitação: "brigadeio" acha Brigadeiro', ...);
test('nome pesa mais que ingrediente', ...);          // "fubá": Bolo de fubá vem antes de receita que só usa fubá
test('com vírgula, a receita precisa ter todos os ingredientes', ...);
test('busca vazia lista tudo', ...);
test('filtra por categoria, tempo e restrição', ...); // receita com minutes null sai do filtro de tempo
test('receita sem ingredientes não quebra a busca', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/domain/search src/domain/ingredientMatch`. Expected: FAIL.
- [ ] **Step 3: Implementar.** MiniSearch com `processTerm: normalize`, `fuzzy: 0.2`, `prefix: true` e `boost: { name: 3 }`. Lista com vírgula não usa MiniSearch: filtra com `ingredientMatches`, comparando a expressão inteira com `base` ou `name` normalizados.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/domain/search src/domain/ingredientMatch`. Expected: PASS.

### Task 7: "Em casa" e lista de compras

**Files:**
- Create: `src/domain/pantry.ts`, `src/domain/shopping.ts`
- Test: `src/domain/pantry.test.ts`, `src/domain/shopping.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `ingredientMatches`, `formatIngredient`.
- Produces:
  - `BASICS = ['sal', 'água', 'óleo']`
  - `whatCanIMake(have: string[], recipes: Recipe[]): { recipe: Recipe; missing: string[] }[]`: até 2 faltando, ordenado por faltas
  - `buildShoppingList(selections: { recipe: Recipe; servings: number | null }[]): { key: string; label: string }[]`

- [ ] **Step 1: Escrever os testes**

```ts
test('sal, água e óleo nunca contam como falta', ...);
test('mostra primeiro o que dá para fazer, depois falta 1, depois falta 2', ...);
test('faltando 3 ou mais, a receita não aparece', ...);
test('receita sem ingredientes não aparece como "dá para fazer"', ...);
test('soma ingredientes iguais', ...);                // 2 xícaras + 1 xícara de açúcar = 3 xícaras
test('converte g/kg e ml/l', ...);                    // 500 g + 1 kg de aipim = 1,5 kg
test('não converte xícara para grama: linhas separadas', ...);
test('respeita as porções escolhidas', ...);
test('"a gosto" aparece uma vez, sem quantidade', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/domain/pantry src/domain/shopping`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Mesmo ingrediente quer dizer mesmo `base` ou, sem `base`, mesmo `name` normalizado.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/domain/pantry src/domain/shopping`. Expected: PASS.

### Task 8: Base da interface, Buscar e tela de receita

**Files:**
- Create: `src/ui/App.tsx`, `src/ui/theme.css`, `src/ui/useRecipes.ts`, `src/ui/RecipeRow.tsx`, `src/ui/RecipeArt.tsx`, `src/ui/screens/SearchScreen.tsx`, `src/ui/screens/RecipeScreen.tsx`
- Test: `src/ui/screens/SearchScreen.test.tsx`, `src/ui/screens/RecipeScreen.test.tsx`

**Interfaces:**
- Consumes: `catalog`, `createSearch`, `listMine`, `toggleMark`, `copyFromCatalog`, `formatIngredient`.
- Produces:
  - `useRecipes(): { all: Recipe[]; mine: Recipe[]; reload(): Promise<void> }`
  - navegação por hash: `#/buscar`, `#/casa`, `#/minhas`, `#/salvas`, `#/compras`, `#/receita/:id`, `#/nova`, `#/editar/:id`, `#/cozinha/:id`
  - `<RecipeRow recipe note? />`

- [ ] **Step 1: Escrever os testes**

```ts
test('abre com o campo de busca em foco', ...);
test('a lista muda enquanto digita', ...);
test('receita da pessoa mostra a etiqueta Minha receita', ...);
test('ajustar de 4 para 6 porções recalcula as quantidades', ...);
test('Salvar em Minhas Receitas cria cópia e mantém a original', ...);
test('receita sem porções abre sem ajuste, com explicação', ...);
test('receita sem preparo deixa Modo cozinha indisponível', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implementar seguindo a simulação aprovada.** Layout responsivo em CSS: colunas a partir de 900 px. `RecipeArt` mostra a foto ou a ilustração do tipo.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/ui`. Expected: PASS.

### Task 9: Minhas Receitas

**Files:**
- Create: `src/ui/screens/MineScreen.tsx`, `src/ui/screens/RecipeForm.tsx`, `src/ui/screens/ImportReview.tsx`, `src/ui/screens/HistoryScreen.tsx`, `src/ui/photo.ts`
- Test: `src/ui/screens/RecipeForm.test.tsx`, `src/ui/screens/MineScreen.test.tsx`

**Interfaces:**
- Consumes: `parseRecipeText`, `parseIngredientLines`, `parseSteps`, `saveMine`, `deleteMine`, `listVersions`, `restoreVersion`, `exportBackup`, `importBackup`, `InvalidBackupError`.
- Produces:
  - `<RecipeForm initial?: Partial<Recipe> startTry?: boolean />`
  - `resizePhoto(file: File, maxSide = 1280): Promise<Blob>`

- [ ] **Step 1: Escrever os testes**

```ts
test('adição rápida salva só com o nome', ...);
test('sem nome, não salva e explica o motivo', ...);
test('ingrediente não reconhecido é guardado como nome e não bloqueia', ...);
test('tempo, porções, categoria, foto e anotações ficam recolhidos', ...);
test('marcar Quero testar ao salvar', ...);
test('colar texto leva à conferência, com as linhas não reconhecidas editáveis', ...);
test('excluir pede confirmação', ...);
test('backup inválido mostra erro e nada muda', ...);
test('voltar a uma versão anterior pelo histórico', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/ui/screens/RecipeForm src/ui/screens/MineScreen`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Tocar no link de vídeo abre o endereço em outra aba; o programa não lê o conteúdo. Só links `http` e `https` viram link clicável. A confirmação de exclusão é um diálogo da própria tela. Foto que não couber no armazenamento mostra erro e a receita continua salva.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/ui/screens/RecipeForm src/ui/screens/MineScreen`. Expected: PASS.

### Task 10: Modo cozinha e temporizadores

**Files:**
- Create: `src/domain/timers.ts`, `src/ui/useTimers.tsx`, `src/ui/useWakeLock.ts`, `src/ui/screens/CookScreen.tsx`, `src/ui/TimerBar.tsx`
- Test: `src/domain/timers.test.ts`, `src/ui/useWakeLock.test.ts`, `src/ui/screens/CookScreen.test.tsx`

**Interfaces:**
- Consumes: `Recipe`.
- Produces:
  - `detectMinutes(step: string): number | null`
  - `type Timer = { id: string; label: string; endsAt: number; rang: boolean }`
  - `remainingSeconds(timer: Timer, now: number): number`
  - `dueTimers(timers: Timer[], now: number): Timer[]`
  - `useTimers()`, em provider global, com timers salvos em `localStorage`
  - `useWakeLock(active: boolean): { supported: boolean; held: boolean }`

- [ ] **Step 1: Escrever os testes**

```ts
expect(detectMinutes('Asse por 30 minutos')).toBe(30);
expect(detectMinutes('Cozinhe por 1 hora')).toBe(60);
expect(detectMinutes('Cozinhe por 1 hora e 15 minutos')).toBe(75);
expect(detectMinutes('Misture bem')).toBeNull();
test('temporizador usa o horário de término, não a contagem', ...);
test('temporizador vencido fora do app toca ao voltar, uma vez só', ...);
test('pede wake lock de novo ao voltar para o app (visibilitychange)', ...);
test('sem suporte a wake lock, avisa em vez de falhar em silêncio', ...);
test('botão de temporizador aparece só em passo com tempo, com ajuste antes de iniciar', ...);
test('vários temporizadores ao mesmo tempo', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/domain/timers src/ui/useWakeLock src/ui/screens/CookScreen`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Wake lock ativo no modo cozinha e sempre que houver temporizador correndo, em qualquer tela. `TimerBar` aparece em todas as telas e avisa que o alarme depende de o aplicativo ficar aberto. Som por Web Audio, liberado no toque que inicia o temporizador, mais `navigator.vibrate`.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/domain/timers src/ui/useWakeLock src/ui/screens/CookScreen`. Expected: PASS.

### Task 11: Em casa, Salvas e Compras

**Files:**
- Create: `src/ui/screens/PantryScreen.tsx`, `src/ui/screens/SavedScreen.tsx`, `src/ui/screens/ShoppingScreen.tsx`
- Test: `src/ui/screens/PantryScreen.test.tsx`, `src/ui/screens/ShoppingScreen.test.tsx`

**Interfaces:**
- Consumes: `whatCanIMake`, `listMarks`, `buildShoppingList`, `getShopping`, `setShopping`, `<RecipeRow>`.

- [ ] **Step 1: Escrever os testes**

```ts
test('Em casa mostra "Dá para fazer agora" e "Falta: ..."', ...);
test('Em casa lembra os ingredientes informados ao reabrir', ...);
test('Compras soma ingredientes de duas receitas', ...);
test('itens marcados continuam marcados ao reabrir', ...);
test('Salvas mostra Favoritos e Quero testar sem criar cópia', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/ui/screens/PantryScreen src/ui/screens/ShoppingScreen`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Cada tela tem um estado vazio que explica o próximo passo.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/ui/screens/PantryScreen src/ui/screens/ShoppingScreen`. Expected: PASS.

### Task 12: Aplicativo instalável e menu Compartilhar

**Files:**
- Create: `src/ui/shareTarget.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`, `src/ui/App.tsx`
- Test: `src/ui/shareTarget.test.ts`

**Interfaces:**
- Consumes: `<RecipeForm initial>`.
- Produces: `readShare(search: string): Partial<Recipe> | null`

- [ ] **Step 1: Escrever os testes**

```ts
test('compartilhamento só com link preenche o vídeo e nada mais', ...);
test('link dentro do campo text é separado do texto', ...);
test('texto de legenda passa pelo leitor de receitas', ...);
test('sem parâmetros retorna null', ...);
```

- [ ] **Step 2: Rodar e confirmar que falham.** Run: `npx vitest run src/ui/shareTarget`. Expected: FAIL.
- [ ] **Step 3: Implementar.** Manifesto em `vite-plugin-pwa`: `name: 'Receitário'`, `lang: 'pt-BR'`, `display: 'standalone'`, `theme_color: '#0B6B53'`, `start_url: './'`, `scope: './'` e `share_target` com `action: './'`, `method: 'GET'`, `params: { title: 'title', text: 'text', url: 'url' }`. Workbox faz o precache de tudo. Atualização sem prompt, sem tocar no IndexedDB. O workflow do GitHub Pages fica pronto, mas não é acionado.
- [ ] **Step 4: Rodar e confirmar que passam.** Run: `npx vitest run src/ui/shareTarget`. Expected: PASS.
- [ ] **Step 5: Conferir o build.** Run: `npm run build`. Expected: `dist/manifest.webmanifest` com `share_target` e `dist/sw.js` gerados.

### Task 13: Verificação de ponta a ponta

**Files:**
- Create: `playwright.config.ts`, `e2e/receitario.spec.ts`, `README.md` (seção de uso, instalação e publicação)
- Modify: `README-Receitario.md` (status)

- [ ] **Step 1: Escrever os testes**

Projetos: celular Android (Pixel 7) e computador (1280×800), contra `vite preview`.

```ts
test('buscar, abrir, ajustar porções e entrar no modo cozinha', ...);
test('adição rápida, recarregar a página e a receita continua lá', ...);
test('backup: exportar, apagar os dados e importar de volta', ...);
test('funciona sem internet depois da primeira visita', ...); // context.setOffline(true) e reload
test('sem rolagem horizontal em nenhuma aba do celular', ...);
test('abrir com ?url=... abre a adição rápida com o link', ...);
```

- [ ] **Step 2: Rodar tudo.** Run: `npx vitest run`, `npm run build` e `npx playwright test`. Expected: tudo PASS.
- [ ] **Step 3: Conferir capturas de tela no tamanho de celular e de computador.** Expected: mesma aparência da simulação aprovada.
- [ ] **Step 4: Documentar o que falta verificar em Android de verdade:** instalação, tela ligada, som, vibração e menu Compartilhar. Isso depende da publicação, que depende de confirmação do dono.
