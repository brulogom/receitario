# Receitário: design

Data: 2026-11-06. Base: `README-Receitario.md` e a conversa com o dono do projeto.
As decisões marcadas com **(decisão do Claude)** não foram pedidas pelo dono e estão abertas a correção.

## Intenção

Um aplicativo pessoal para achar rapidamente o que cozinhar e guardar as receitas que a pessoa sabe fazer, do jeito dela.

O dono mora no Rio de Janeiro e gosta de receitas normais do dia a dia, doces e salgadas. Quando cozinha, consulta a receita **no celular, em cima da pia**. O programa precisa ser cômodo nessa situação: mãos ocupadas, celular a certa distância e tela que não pode apagar.

## Objetivos

- Abrir direto na busca e mostrar resultados enquanto a pessoa digita.
- Oferecer um catálogo de comida caseira brasileira, com a cara de quem cozinha no Rio.
- Guardar as receitas da pessoa no aparelho, sem conta e sem internet.
- Ajudar na hora de cozinhar: modo passo a passo, temporizadores e ajuste de porções.
- Custo zero, para sempre.

## Fora do escopo

Do README: compartilhamento de receitas, planejamento de refeições e informações nutricionais.

Adiados porque o README os condiciona a uma opção gratuita ainda não encontrada: sincronização entre aparelhos e importação por link. Enquanto isso, as receitas passam de um aparelho para outro pelo arquivo de backup.

## O que faria o projeto fracassar

- Copiar conteúdo de sites de receitas sem permissão.
- Depender de assinatura, servidor pago ou conta de usuário.
- Perder receitas da pessoa, por exemplo em uma atualização do aplicativo ou em um backup importado.
- Ser desconfortável no celular durante o preparo.
- Um catálogo com cara de comida estrangeira ou de restaurante.

## Decisões técnicas

Do README:

- Aplicativo web instalável (PWA), com React + TypeScript.
- Dados da pessoa em IndexedDB; busca local com MiniSearch; backup em JSON.
- Ingredientes com quantidade, unidade e nome salvos separadamente.

Da conversa:

- Interface pensada primeiro para o celular.
- Publicação no GitHub Pages; o dono já tem conta. A publicação só acontece com a confirmação dele.
- O programa roda no celular como PWA, instalado pelo navegador, sem APK. Nenhum APK pode ser gerado sem perguntar antes ao dono.
- O celular do dono é Android: a referência é o Chrome no Android. Tela ligada, vibração, som e o menu Compartilhar precisam funcionar nele, e a verificação final precisa incluir um aparelho Android de verdade, feita pelo dono se necessário.

**(decisão do Claude)**

- Vite, `vite-plugin-pwa`, `idb` e Vitest, sem backend.
- Todos os textos em português do Brasil.

## Catálogo

**Origem (proposta na conversa, sem objeção do dono):** receitas escritas originalmente para este projeto, sem copiar sites. Não há custo, licença a verificar nem dependência de internet. Bases gratuitas como a TheMealDB ficam de fora: são em inglês e têm pouca comida brasileira.

**(decisão do Claude)**

- Cerca de 60 receitas na primeira versão, metade doces e metade salgados. Exemplos: arroz soltinho, feijão, farofa, picadinho, empadão, escondidinho, bolinho de bacalhau, bolo de fubá, pudim, brigadeiro.
- As receitas ficam em arquivos de dados dentro do projeto, com identificador fixo, para o catálogo crescer sem mudar código.
- Essas receitas não terão sido testadas em cozinha de verdade. O dono deve ser avisado disso.

**Comparação de ingredientes (decisão do Claude):** cada ingrediente do catálogo guarda também um nome-base (`peito de frango` tem base `frango`), definido ao escrever as receitas. "Em casa", a busca por lista e a lista de compras comparam por esse nome-base. Nas receitas da pessoa, a comparação usa o nome digitado, sem acentos e por expressão inteira: `batata` não equivale a `batata-doce`, e `frango` não equivale a `caldo de frango`. Em caso de dúvida, o programa indica que o ingrediente falta, em vez de prometer uma receita que não dá para fazer.

**Fotos:** o catálogo usa uma ilustração por categoria, em vez de fotos reais (dito na conversa). A pessoa pode pôr fotos próprias nas receitas dela, reduzidas antes de salvar para não ocupar muito espaço **(decisão do Claude)**.

**Categorias (decisão do Claude):** doces, bolos, massas, carnes, aves, peixes, arroz e feijão, salgadinhos, vegetariano, bebidas. Uma receita pode ter mais de uma.

**Restrições alimentares (decisão do Claude):** vegetariano, sem lactose e sem glúten, marcadas receita a receita.

## Telas

Barra inferior com 5 abas **(decisão do Claude)**: Buscar, Em casa, Minhas, Salvas e Compras. A tela inicial é Buscar, com o campo pronto para digitar.

### Buscar

- Por nome e por ingrediente, no mesmo campo.
- Texto com vírgula (`frango, batata`) é tratado como lista de ingredientes: a receita precisa ter todos. Sem vírgula, procura em nome e ingredientes, com peso maior para o nome **(decisão do Claude)**.
- Ignora acentos e aceita pequenos erros de digitação.
- Filtros por categoria, tempo de preparo e restrições.
- As receitas da pessoa aparecem junto, com a etiqueta **Minha receita**.

### Em casa

A pessoa informa os ingredientes que tem e vê primeiro o que dá para fazer, depois as receitas em que falta um ou dois ingredientes, com a indicação do que falta. Itens básicos como sal, água e óleo não contam como falta **(decisão do Claude)**.

### Receita

Foto ou ilustração, ingredientes, preparo, tempo e porções. Tem ajuste de porções com recálculo das quantidades, Favorito, Quero testar, Salvar em Minhas Receitas, Adicionar às compras e Modo cozinha. Ingredientes sem quantidade, como "sal a gosto", não são recalculados.

### Modo cozinha

- Um passo por vez, em letra grande, com botões grandes de avançar e voltar.
- Mantém a tela ligada (Wake Lock). Se o aparelho não permitir, avisa em vez de falhar em silêncio.
- Quando o passo cita um tempo ("asse por 30 minutos"), aparece um botão para iniciar o temporizador com esse tempo. Dá para ajustá-lo antes de iniciar, e podem correr vários ao mesmo tempo.
- O temporizador guarda o horário de término, para continuar certo mesmo se o aplicativo for para segundo plano. Ao terminar, toca um som e vibra.
- O alarme só precisa funcionar com o aplicativo aberto na tela (resposta do dono). O celular não pode bloquear nessa situação, então a tela fica ligada no modo cozinha e também enquanto houver temporizador correndo, em qualquer tela do aplicativo. O app avisa que o alarme depende de ficar aberto. Se a pessoa sair e voltar, o alarme vencido toca ao retornar **(decisão do Claude)**.

### Minhas

Adicionar, editar, excluir com confirmação, fazer anotações, importar colando texto, voltar a uma versão anterior e fazer backup. Salvar do catálogo cria uma cópia editável e a original continua no catálogo.

- **Adição rápida (pedido do dono):** o dono vê muitas receitas no Instagram e no TikTok e quer adicioná-las facilmente, informando os ingredientes e a forma de fazer. Por isso, Nova receita abre em uma única tela com três campos: nome, ingredientes (um por linha) e modo de preparo (um passo por linha). Só o nome é obrigatório. Cada linha de ingrediente é separada em quantidade, unidade e nome pelo mesmo leitor da importação por texto, e o que não for reconhecido fica guardado como nome, sem bloquear o salvamento. Tempo, porções, categoria, foto e anotações são opcionais e ficam recolhidos. Sem porções informadas, o ajuste de porções fica indisponível até a pessoa preenchê-las **(decisão do Claude)**.
- **Origem e "Quero testar" (decisão do Claude):** a adição rápida tem um campo opcional para colar o link do vídeo, guardado apenas como referência e aberto ao tocar; o programa não lê o conteúdo do link. Também tem a opção de marcar "Quero testar" ao salvar, já que muitas dessas receitas ainda não foram feitas. Isso ajusta a regra do README de que Minhas Receitas é só para o que a pessoa sabe fazer: uma receita digitada precisa morar em Minhas, e a marcação "Quero testar" indica que falta aprender.
- **Compartilhar para o Receitário (decisão do Claude):** no Android, com o aplicativo instalado, ele aparece no menu Compartilhar do Instagram e do TikTok, e abre a adição rápida com o texto e o link recebidos já preenchidos. O celular do dono é Android, então esse é o caminho principal. Em iPhone, o recurso não existe para aplicativos web e o caminho é copiar e colar.
- **Importação por texto:** reconhece títulos como "Ingredientes" e "Modo de preparo", separa quantidade, unidade e nome (`2 xícaras de farinha`, `1/2`, `1 e 1/2`, `½`, `a gosto`) e mostra o resultado para conferência antes de salvar. O que não reconhecer fica como texto editável, nunca é descartado.
- **Histórico (decisão do Claude):** cada edição guarda a versão anterior, até 50 por receita. Voltar a uma versão cria uma nova versão, sem apagar as outras.
- **Backup:** o arquivo JSON inclui receitas, histórico, anotações, fotos, marcações e lista de compras.
- **Importar backup (decisão do Claude):** junta com o que já existe e nunca apaga nada. Se a mesma receita existir nos dois lados, fica a edição mais recente, e a outra vai para o histórico.

### Salvas

Duas listas, Favoritos e Quero testar, que valem para qualquer receita e não criam cópia.

### Compras

A pessoa escolhe as receitas e as porções. A lista soma os ingredientes repetidos e permite marcar o que já tem. Só soma quando o nome é igual e a unidade é a mesma ou conversível (g/kg, ml/l); caso contrário, mostra em linhas separadas, sem inventar conversão de xícara para grama **(decisão do Claude)**.

## Escopo desta entrega

**(decisão do Claude)** Inclui as etapas 1 a 7 do README e também as etapas 8 a 10 (filtros, histórico e lista de compras), porque o pedido foi criar o programa descrito e nenhuma delas depende de terceiros. Novas fontes de receitas ficam só como possibilidade: o formato do catálogo permite crescer, mas nenhuma fonte externa entra agora.

## Qualidade

- Testes automatizados para a lógica: busca, leitor de texto, recálculo de porções, soma da lista de compras, "Em casa" e backup.
- Verificação no navegador em tamanho de celular antes da entrega.
- Atualizações do aplicativo nunca podem apagar dados da pessoa: o banco de dados precisa de versão e migração.

## A critério de quem construir

Organização do código, aparência visual, ilustrações, detalhes de layout e redação das receitas, respeitando o que está acima.
