# Receitário

Aplicativo pessoal de receitas para celular e computador. Funciona sem conta, sem servidor e sem internet depois da primeira visita. A descrição completa está em [README-Receitario.md](README-Receitario.md).

## Rodar no computador

Requer Node.js 22 ou mais recente.

```bash
npm install
npm run build
npm run preview
```

Depois, abra o endereço que aparecer no terminal. Para desenvolver, use `npm run dev`.

## Testes

```bash
npm test                     # lógica e telas
npx playwright install chromium   # só na primeira vez
npm run build
npm run e2e                  # navegador, em tamanho de celular e de computador
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie este projeto para o ramo `main`. Em uma conta gratuita, o repositório precisa ser público para usar o Pages. O catálogo e o código ficam visíveis, mas as receitas da pessoa nunca saem do aparelho.
2. No repositório, abra **Settings > Pages** e, em **Source**, escolha **GitHub Actions**.
3. A cada envio para `main`, o fluxo `.github/workflows/deploy.yml` roda os testes e publica o aplicativo.

## Instalar no Android

1. Abra o endereço publicado no Chrome.
2. No menu do Chrome, toque em **Adicionar à tela inicial** e confirme **Instalar**.
3. Com o aplicativo instalado, o Receitário aparece no menu **Compartilhar** do Instagram e do TikTok.

As receitas ficam salvas só no aparelho. Use **Minhas > Fazer backup** de vez em quando: desinstalar o aplicativo ou limpar os dados do navegador apaga as receitas.

## Como o código está organizado

- `src/domain`: regras sem interface (busca, leitor de texto, porções, compras, temporizadores)
- `src/storage`: dados da pessoa no IndexedDB, histórico e backup
- `src/catalog`: receitas que acompanham o aplicativo; hoje vazio. Só entra o que tem fonte real e licença que permita publicar
- `src/test-fixtures`: receitas fictícias usadas só nos testes; não vão para o site
- `src/ui`: telas e estilos

Ao mudar o formato dos dados, aumente `DB_VERSION` em `src/storage/db.ts` e acrescente uma migração. Nunca recrie as tabelas: isso apagaria as receitas da pessoa.
