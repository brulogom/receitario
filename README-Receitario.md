# Receitário

> Nome provisório.

Um programa para encontrar qualquer receita em segundos e guardar, em um só lugar, as receitas que você sabe fazer, do seu jeito.

**Status:** primeira versão construída, incluindo filtros, histórico de edições e lista de compras (etapas 1 a 10). Falta publicar e testar em um Android de verdade. Veja o [README.md](README.md) para rodar, publicar e instalar.

## O que ele faz

### 1. Catálogo de receitas

Um acervo grande de receitas para consultar, com:

- nome e foto
- ingredientes e quantidades
- modo de preparo
- tempo de preparo e número de porções
- categoria (doces, massas, carnes, vegetariano, bebidas etc.)

Nenhum catálogo consegue ter literalmente todas as receitas que existem. O objetivo é reunir o maior acervo viável e deixá-lo crescer com o tempo, combinando várias fontes (veja [Origem das receitas](#origem-das-receitas)).

### 2. Busca fácil

A busca é a tela principal do programa: você abre e já pode digitar.

- **Por nome:** `bolo de cenoura`
- **Por ingrediente:** `frango, batata, creme de leite`
- **Tolerante a erros:** `acucar`, `açúcar` e `açucar` dão o mesmo resultado, e pequenos erros de digitação são aceitos
- **Resultados na hora:** a lista é atualizada enquanto você digita
- **Filtros:** categoria, tempo de preparo e restrições alimentares

Suas receitas aparecem na mesma busca, identificadas com a etiqueta **Minha receita**.

**O que tenho em casa:** você informa os ingredientes disponíveis e vê o que dá para fazer, incluindo as receitas em que falta só um ou dois, com a indicação do que falta.

### 3. Minhas Receitas

Uma área separada para as receitas que você sabe fazer. Nela você pode:

- **Adicionar** uma receita do zero
- **Importar** uma receita colando o texto
- **Editar** qualquer campo sempre que quiser
- **Voltar a uma versão anterior**, pelo histórico de edições
- **Excluir** uma receita, com confirmação antes
- **Salvar uma receita do catálogo** para adaptá-la ao seu jeito
- **Fazer anotações**, como "usar menos açúcar" ou "assar 10 minutos a mais"

Ao salvar uma receita do catálogo, o programa cria uma cópia sua. Você edita a cópia à vontade, e a original continua disponível no catálogo.

A importação por texto tenta separar sozinha os ingredientes e o modo de preparo, e você confere o resultado antes de salvar. 

A importação por link **só entra no programa se for de graça**. Mesmo assim, ela só funcionaria em sites que publicam os dados da receita de forma legível; nos demais, o caminho continua sendo colar o texto.

### 4. Favoritos e "Quero testar"

Duas marcações que servem para qualquer receita, sem criar uma cópia:

- **Favoritos:** as receitas que você quer ter sempre à mão
- **Quero testar:** as receitas que você ainda quer aprender

Assim, Minhas Receitas fica reservada ao que você realmente sabe fazer.

### 5. Na hora de cozinhar

- **Modo cozinha:** mostra um passo por vez em letra grande e mantém a tela ligada
- **Temporizadores:** você inicia a contagem de tempo na própria etapa da receita
- **Ajuste de porções:** ao mudar de 4 para 6 porções, as quantidades são recalculadas

### 6. Lista de compras

Você escolhe as receitas e o programa monta a lista de ingredientes, somando os que se repetem e permitindo marcar o que já tem em casa.

## Como usar

1. Abra o programa e digite o que quer cozinhar, ou informe o que tem em casa.
2. Abra uma receita para ver os ingredientes e o modo de preparo, e ajuste as porções se precisar.
3. Clique em **Modo cozinha** para seguir o preparo passo a passo.
4. Marque a receita como **Favorita** ou **Quero testar**, ou clique em **Salvar em Minhas Receitas** para guardar uma cópia e editá-la quando quiser.
5. Para registrar uma receita que você já sabe, vá em **Minhas Receitas > Nova receita** e digite ou cole o texto.

## Propostas técnicas

Estas decisões ainda podem mudar:

| Decisão | Proposta | Motivo |
|---|---|---|
| Plataforma | Aplicativo web instalável (PWA) | Funciona no computador e no celular com um só código |
| Interface | React + TypeScript | Ecossistema amplo e adequado a uma interface com busca instantânea |
| Minhas Receitas | Armazenamento local no aparelho (IndexedDB) | Funciona sem conta e sem internet |
| Busca | Índice local com MiniSearch | Resultados instantâneos, com tolerância a erros e a acentos |
| Backup | Exportar e importar em JSON | Protege as receitas e permite levá-las para outro aparelho |
| Ingredientes | Quantidade, unidade e nome salvos separadamente | Permite recalcular porções, somar a lista de compras e comparar com o que você tem em casa |
| Importação por link (só se for de graça) | Leitura dos dados de receita publicados pelos sites | Evita digitação, mas o navegador costuma bloquear a leitura direta de outros sites, então exige um pequeno serviço intermediário sem custo |

## Sincronização entre aparelhos

A sincronização **só entra no programa se for de graça**, sem assinatura nem servidor pago. Antes de construí-la, é preciso encontrar uma opção sem custo, como a conta de nuvem que a própria pessoa já usa, e confirmar se ela funciona no computador e no celular.

Enquanto isso, ou se nenhuma opção gratuita servir, as receitas ficam salvas em cada aparelho e passam de um para o outro pelo arquivo de backup.

## Origem das receitas

Esta é a principal decisão em aberto. Antes de incluir qualquer fonte, é preciso confirmar:

- se a licença ou os termos de uso permitem usar o conteúdo no programa
- quantas receitas ela oferece e se existem em português
- se há custo ou limite de uso

Copiar conteúdo de sites de receitas sem permissão está fora do plano. Uma alternativa é mostrar um resultado externo com link para o site original.

## Fora do plano por enquanto

- Compartilhamento de receitas com outras pessoas
- Planejamento de refeições
- Informações nutricionais

## Etapas previstas

**Primeira versão**

1. Minhas Receitas: adicionar, editar, excluir, fazer backup e ajustar porções
2. Busca com tolerância a erros e a acentos
3. Importação por texto
4. Modo cozinha com temporizadores
5. Pesquisa das fontes de receitas e primeira fonte no catálogo
6. "O que tenho em casa"
7. Salvar uma receita do catálogo, Favoritos e "Quero testar"

**Depois**

8. Filtros e novas fontes de receitas
9. Histórico de edições
10. Lista de compras
11. Sincronização entre aparelhos, se houver opção gratuita
12. Importação por link, se houver opção gratuita
