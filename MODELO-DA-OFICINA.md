# Modelo do código da Oficina

Cada aula ou lista é um arquivo de **texto puro** (.txt). O app lê o texto e monta as partes, as checagens, as listas, o banco de exercícios e a folha de fórmulas.

## Regras gerais

- O topo tem os **metadados**, um por linha, começando com `@`. O primeiro é sempre `@tipo`: `aula`, `lista`, `essencial` ou `passo-a-passo` (é ele que diz ao app onde pôr o arquivo). Depois: `@id`, `@materia`, `@topico`, `@subtopico`, `@titulo`, `@tags` e, opcionais, `@tempo` (minutos) e `@descricao`.
- O `@id` identifica o item: importar de novo com o mesmo id **substitui** a versão antiga (mantendo posição e progresso).
- Cada parte começa com `== TIPO | título` (título opcional) e vai até a próxima.
- Aulas: `EXPLICACAO`, `FORMULA`, `EXEMPLO`, `CHECAGEM`, `RESUMO`. Essenciais (um arquivo por tópico): `SUBTOPICO`. Passo a passo (um arquivo por tópico): `QUESTAO`. Listas: `EXERCICIO`. Pode repetir tipos, na ordem que quiser.
- Campos dentro das partes começam com `@nome:` no início da linha e vão até o próximo campo ou a próxima parte.
- Linhas que começam com `//` são comentários.

| parte | campos |
|---|---|
| FORMULA | `@topico`, `@subtopico`, `@descricao` (opcionais, uma linha cada); texto com `$$...$$`; `@leitura` (uma linha, como a fórmula é falada no áudio) |
| EXEMPLO | `@enunciado`, `@resolucao`, `@resposta` (opcional) |
| CHECAGEM | `@topico`, `@subtopico`, `@descricao` (uma linha cada), `@pergunta`, `@dica`, `@formula`, `@resposta`, `@resolucao` |
| SUBTOPICO (essenciais) | só texto: tópicos curtos, fórmulas, `! dica`, `!! atenção` |
| QUESTAO (passo a passo) | `@subtopico` (uma linha), `@quando`, `@passos`, `@formula`, `@cuidado`, `@exemplo` |
| EXERCICIO | `@topico`, `@subtopico`, `@descricao`, `@origem` (uma linha cada), `@enunciado`, `@dica`, `@formula`, `@resposta`, `@resolucao` |

- `@dica` e `@formula` viram os botões **Mostrar dica** e **Mostrar fórmula**. Sem o campo, o botão não aparece.
- `@topico` e `@subtopico` usam os nomes exatos da divisão da matéria: são eles que aparecem nos filtros das listas, do banco de exercícios e da folha de fórmulas.

## Dentro do texto

- Matemática: `$...$` no meio do texto, `$$...$$` em destaque (pode ocupar várias linhas).
- `- item`, `1. item`, `### subtítulo`, tabelas com `|`, `! dica` (quadro amarelo), `!! atenção` (quadro de alerta), `**negrito**`, `*itálico*`.
- Figura: `[figura: arquivo.png | legenda]` numa linha sozinha.
- Interativo: `[interativo: arquivo.html | altura | legenda]` numa linha sozinha (altura em px, opcional).
- Os arquivos vão na pasta `midia/` do zip, ou soltos junto com os .txt, ou colados no texto:

```
=== ARQUIVO: arquivo.html ===
<!DOCTYPE html> …
=== FIM DO ARQUIVO ===
```

## Modelo de aula

```
@tipo: aula
@id: calc3-integrais-polares
@materia: Cálculo 3
@topico: Integrais duplas
@subtopico: Coordenadas polares
@titulo: Integrais duplas em coordenadas polares
@tags: integrais duplas, coordenadas polares, p1
@tempo: 25
@descricao: Uma frase dizendo o que a aula ensina.

== EXPLICACAO | Título curto
Parágrafo com matemática no meio do texto, como $x = r\cos\theta$.

$$x^2 + y^2 = r^2$$

[figura: calc3-integrais-polares-ponto.svg | Legenda da figura]
[interativo: calc3-integrais-polares-area.html | 420 | Legenda do interativo]

- item de lista
! Dica num quadro amarelo.
!! Atenção num quadro de alerta.

== FORMULA | Nome da fórmula
// @topico, @subtopico e @descricao são opcionais (linhas com // são comentários)
@topico: Integrais duplas
@subtopico: Coordenadas polares
@descricao: Para que serve a fórmula.
$$\iint_R f\,dA = \int_\alpha^\beta\int_a^b f(r\cos\theta, r\sin\theta)\,r\,dr\,d\theta$$
@leitura: a fórmula escrita por extenso, para o áudio
O que significa cada símbolo.

== EXEMPLO | Título
@enunciado: O problema.
@resolucao:
1. Primeiro passo.
2. Segundo passo.
@resposta: Resultado final (opcional).

== CHECAGEM | Título opcional
@topico: Integrais duplas
@subtopico: Coordenadas polares
@descricao: O que esta checagem treina.
@pergunta: O que a aluna resolve no papel.
@dica: Uma pista (opcional; sem ela, o botão "Mostrar dica" não aparece).
@formula: $$dA = r,dr,d	heta$$ (opcional; sem ela, o botão "Mostrar fórmula" não aparece)
@resposta: Resultado final.
@resolucao:
1. Passo.
2. Passo.

== RESUMO
- Ponto-chave.
- Outro ponto-chave.
```

## Modelo de essenciais

```
@tipo: essencial
@id: calc3-essenciais-integrais-duplas
@materia: Cálculo 3
@topico: Integrais duplas
@tags: p1

== SUBTOPICO | Regiões retangulares
- Ideia-chave em uma frase.
- Condição de uso: …
$$\int_a^b\int_c^d f\,dy\,dx$$

== SUBTOPICO | Coordenadas polares
- Quando usar: …
$$dA = r\,dr\,d\theta$$
!! Erro comum: esquecer o $r$.
```

## Modelo de passo a passo

```
@tipo: passo-a-passo
@id: calc3-passos-integrais-duplas
@materia: Cálculo 3
@topico: Integrais duplas
@tags: p1

== QUESTAO | Calcular uma integral dupla trocando para polares
@subtopico: Coordenadas polares
@quando: Como reconhecer esse tipo de questão.
@passos:
1. Primeiro passo.
2. Segundo passo.
3. Terceiro passo.
@formula: $$dA = r\,dr\,d\theta$$
@cuidado: Erro comum (opcional).
@exemplo: Exemplo curto resolvido (opcional).
```

## Modelo de lista

```
@tipo: lista
@id: calc3-lista-integrais-duplas
@materia: Cálculo 3
@titulo: Lista 1 — Integrais duplas
@tags: integrais duplas, p1
@descricao: Uma frase sobre a lista (opcional).

== EXERCICIO | 1
@topico: Integrais duplas
@subtopico: Coordenadas polares
@descricao: Calcular uma integral dupla trocando para coordenadas polares.
@origem: P1 2024.1 (opcional)
@enunciado: O problema completo.
(a) primeiro item
(b) segundo item
[figura: calc3-lista-integrais-duplas-ex1.png | Legenda]
@dica: Uma pista (opcional; sem ela, o botão "Mostrar dica" não aparece).
@formula:
$$x = rcos	heta qquad y = rsin	heta$$
(opcional; sem ela, o botão "Mostrar fórmula" não aparece)
@resposta:
(a) resultado
(b) resultado
@resolucao:
1. Passo.
2. Passo.

== EXERCICIO | 2
@topico: Integrais duplas
@subtopico: Regiões retangulares
@descricao: …
@enunciado: …
@resposta: …
```

## Prompt do pacote da matéria (aulas, essenciais, passo a passo e listas)

```
Você é um professor universitário de engenharia, muito didático e conciso. Monte o material de estudo da matéria [MATÉRIA] a partir das fontes deste projeto, seguindo a ementa e a divisão da matéria abaixo: aulas, essenciais, passo a passo e listas de exercícios.

O QUE GERAR E DETALHES DE CADA PARTE
- AULAS: em geral uma aula por subtópico da parte pedida (junte subtópicos pequenos ou divida um grande quando for mais didático). Cada aula tem @topico e @subtopico.
  Detalhes das aulas: nenhum detalhe extra.
- ESSENCIAIS: um arquivo por tópico, reunindo o mais importante de todos os subtópicos daquele tópico.
  Detalhes dos essenciais: nenhum detalhe extra.
- PASSO A PASSO: um arquivo por tópico, com o roteiro de resolução de TODOS os tipos de questão das listas e provas das fontes, separado por subtópico (regras de origem abaixo).
  Detalhes do passo a passo: nenhum detalhe extra.
- LISTAS DE EXERCÍCIOS: exercícios novos sobre a parte pedida, no estilo e no nível das listas e provas das fontes, com @topico, @subtopico e @descricao em cada exercício.
  Detalhes das listas: uma lista por tópico, com cerca de 8 exercícios por subtópico, do mais simples para o mais difícil.

EMENTA DA MATÉRIA:
Não vou fornecer ementa. Use TODO o material que está nas fontes do projeto e cubra TODA a matéria que aparece nele, sem deixar nada de fora, a não ser que o foco e as instruções abaixo mandem excluir ou acrescentar alguma parte.

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
Monte você a divisão em tópicos e subtópicos a partir das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.

PARTE DA MATÉRIA QUE QUERO AGORA:
A matéria toda.

FOCO E INSTRUÇÕES ESPECÍFICAS:
Nenhum foco específico.

FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá. Leia as fontes antes de escrever.
2. Não traga conteúdo, notação, exemplos nem exercícios que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar o material.
4. Se faltar nas fontes algo necessário para um tópico, avise no fim da resposta em vez de inventar.
5. Sem ementa, a matéria é tudo o que está nas fontes: cubra todo esse conteúdo. Só exclua ou acrescente partes se o foco e as instruções pedirem.

ENTREGA
1. Gere UM arquivo .zip com estas pastas: aulas/ (um .txt por aula), essenciais/ (um .txt por tópico), passo-a-passo/ (um .txt por tópico), listas/ (um .txt por lista) e midia/ (figuras e interativos).
2. A primeira linha de TODO arquivo .txt diz o que ele é, e o app usa isso para saber onde pôr cada arquivo: "@tipo: aula", "@tipo: essencial", "@tipo: passo-a-passo", "@tipo: lista". Nunca omita nem mude essa linha.
3. Em cada pasta, numere os arquivos na ordem da matéria, começando em 01: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
4. Use em @topico e @subtopico exatamente os mesmos nomes em todos os arquivos, copiados da divisão da matéria. É assim que o app junta tudo por tópico.
5. Se não conseguir gerar o .zip, entregue cada arquivo num bloco de código separado, na ordem, com o nome do arquivo antes. Depois de cada um, cole os arquivos de texto (.html e .svg) que ele usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
6. Se não couber tudo numa resposta, gere em lotes (por exemplo, um tópico por vez, com tudo o que for dele) e diga no fim o que ainda falta.

FORMATO DE CADA ARQUIVO DE AULA (pasta aulas/; copie esta estrutura)
@tipo: aula
@id: [sigla curta da matéria, ex.: calc3]-[título resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@topico: [tópico a que a aula pertence, copiado exatamente da divisão da matéria]
@subtopico: [subtópico que a aula ensina, copiado exatamente da divisão; omita se o tópico não tiver subtópicos]
@titulo: [título da aula]
@tags: [o tópico a que a aula pertence, mais 2 a 4 tags de conteúdo e a prova, se indicada; tudo em minúsculas, separado por vírgula]
@tempo: [duração estimada em minutos]
@descricao: [uma frase dizendo o que a aula ensina]

== EXPLICACAO | [título curto]
[parágrafos curtos, com $...$ e $$...$$]
[figura: [sigla curta da matéria, ex.: calc3]-nome.png | legenda]

== FORMULA | [nome da fórmula]
@topico: [opcional; tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [opcional; subtópico, copiado exatamente da divisão acima]
@descricao: [opcional; uma frase dizendo para que serve a fórmula]
$$[fórmula]$$
@leitura: [a fórmula escrita por extenso, numa linha só, do jeito que se fala em voz alta]
[uma linha dizendo o que significa cada símbolo]

== EXEMPLO | [título curto]
@enunciado: [problema]
@resolucao:
1. [passo]
2. [passo]
@resposta: [opcional: resultado final]

== CHECAGEM | [título opcional]
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que a checagem treina]
@pergunta: [enunciado]
@dica: [opcional; uma pista sem entregar a resposta]
@formula: [opcional; a fórmula ou as fórmulas úteis para resolver, em $$...$$, com uma linha dizendo o que é cada símbolo]
@resposta: [resultado final, com unidade quando houver]
@resolucao:
1. [passo]
2. [passo]

== RESUMO
- [ponto-chave]
- [ponto-chave]

COMO MONTAR A AULA
1. Divida a aula em blocos curtos; cada bloco vira uma parte separada no app. Use os tipos de bloco na ordem que for mais didática, repetindo tipos quantas vezes precisar.
2. Coloque checagens onde um bom professor pararia para conferir se o aluno entendeu, por exemplo depois de um conceito novo ou antes de avançar para algo que depende dele. Não há número mínimo nem máximo de checagens: decida pelo que for mais didático em cada aula.
3. As checagens são para resolver no papel (cálculo, conceito ou interpretação), nunca de múltipla escolha. A resposta fica oculta no app até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
4. DICA E FÓRMULA: cada checagem pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
5. TÓPICO, SUBTÓPICO E DESCRIÇÃO: toda checagem tem @topico, @subtopico e @descricao, cada um numa linha só, com os nomes exatos da divisão da matéria (mesma grafia), porque as checagens também entram no banco de exercícios do app, que filtra por tópico, subtópico e descrição. Se o tópico não tiver subtópicos, omita @subtopico.
6. Prefira mostrar um exemplo resolvido antes de pedir que o aluno resolva algo parecido.
7. Toda fórmula importante ganha um bloco FORMULA próprio, porque ela entra na folha de fórmulas da matéria. Sempre que possível, preencha @topico e @subtopico (com os nomes exatos da divisão da matéria, para o filtro da folha de fórmulas) e @descricao (para que serve a fórmula). São opcionais e cada um ocupa uma linha só.
8. Termine com um RESUMO.

FORMATO DE CADA ARQUIVO DE ESSENCIAIS (pasta essenciais/; um arquivo por TÓPICO; copie esta estrutura)
@tipo: essencial
@id: [sigla curta da matéria, ex.: calc3]-essenciais-[tópico resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@topico: [nome do tópico, copiado exatamente da divisão da matéria]
@tags: [a prova em que o tópico cai, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre o tópico]

== SUBTOPICO | [nome do subtópico, copiado exatamente da divisão]
- [o que é preciso saber, em frases curtas e objetivas]
- [definições e ideias-chave]
$$[fórmulas principais]$$
! [dica importante]
!! [erro comum ou pegadinha de prova]

== SUBTOPICO | [próximo subtópico]
…

COMO MONTAR OS ESSENCIAIS
1. Os essenciais são uma coletânea do MAIS IMPORTANTE de todos os subtópicos de um tópico, para revisar rápido antes da prova. Um arquivo por tópico, com um bloco SUBTOPICO para cada subtópico, na ordem da divisão.
2. Seja objetivo e preciso: tópicos curtos ("- …"), definições, condições de uso, fórmulas, unidades, resultados que caem em prova e erros comuns. Nada de texto corrido longo nem de exemplos completos.
3. Se o tópico não tiver subtópicos, use um único bloco "== SUBTOPICO | Geral".
4. Use figuras quando um esquema resumir melhor (ex.: convenção de sinais, diagrama típico).

FORMATO DE CADA ARQUIVO DE PASSO A PASSO (pasta passo-a-passo/; um arquivo por TÓPICO; copie esta estrutura)
@tipo: passo-a-passo
@id: [sigla curta da matéria, ex.: calc3]-passos-[tópico resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@topico: [nome do tópico, copiado exatamente da divisão da matéria]
@tags: [a prova em que o tópico cai, se indicada; minúsculas, separadas por vírgula]

== QUESTAO | [nome do tipo de questão, ex.: Calcular a tensão normal média numa barra]
@subtopico: [subtópico, copiado exatamente da divisão; omita se o tópico não tiver subtópicos]
@quando: [como reconhecer esse tipo de questão no enunciado]
@passos:
1. [primeiro passo]
2. [segundo passo]
3. […]
@formula: [opcional; as fórmulas usadas, em $$...$$]
@cuidado: [opcional; erros comuns e pegadinhas]
@exemplo: [opcional; um exemplo curto resolvido seguindo os passos]

== QUESTAO | [próximo tipo de questão]
…

COMO MONTAR O PASSO A PASSO
1. DE ONDE VÊM OS TIPOS DE QUESTÃO: percorra TODAS as listas de exercícios e TODAS as provas que estão nas fontes (e as que eu anexar a esta mensagem) e levante todos os tipos de questão que aparecem nelas, sem deixar nenhum de fora. Faça um bloco QUESTAO para cada tipo.
2. Se não houver nenhuma lista nem prova nas fontes, use os exercícios do livro-texto.
3. Se não houver nenhum exercício (nem listas, nem provas, nem exercícios do livro), NÃO gere passo a passo: avise isso no fim da resposta.
4. @passos é um roteiro numerado, genérico e aplicável a qualquer questão daquele tipo (não é a resolução de uma questão específica). Cada passo é uma ação clara. O objetivo é que o aluno consulte o roteiro enquanto resolve.
5. Em @exemplo, use (resumido) uma questão real das listas, provas ou livro, e diga de onde ela veio (ex.: "P1 2024.1, questão 3").
6. Agrupe os blocos na ordem dos subtópicos da divisão. @subtopico ocupa uma linha só.

FORMATO DE CADA ARQUIVO DE LISTA (pasta listas/; copie esta estrutura)
@tipo: lista
@id: [sigla curta da matéria, ex.: calc3]-lista-[título resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@titulo: [nome da lista]
@tags: [tópicos cobertos e a prova, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre a lista]

== EXERCICIO | 1
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que o exercício treina]
@origem: [opcional; ex.: P1 2024.1, livro cap. 5 ex. 12]
@enunciado: [problema completo; itens em linhas próprias começando com (a), (b)…]
[figura: [sigla curta da matéria, ex.: calc3]-lista-nome-ex1.png | legenda opcional]
@dica: [opcional; uma pista sem entregar a resposta]
@formula: [opcional; a fórmula ou as fórmulas úteis para resolver, em $$...$$, com uma linha dizendo o que é cada símbolo]
@resposta: [resultado final de cada item, com unidade quando houver]
@resolucao:
1. [passo]
2. [passo]

== EXERCICIO | 2
…

COMO MONTAR A LISTA
1. Nos modos de criar exercícios, ordene do mais simples para o mais difícil, cobrindo tudo o que foi pedido. No modo de adicionar os anexados, mantenha a ordem do anexo.
2. Exercícios para resolver no papel, nunca de múltipla escolha.
3. A resposta fica oculta até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
4. DICA E FÓRMULA: cada exercício pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
5. TÓPICO, SUBTÓPICO E DESCRIÇÃO: todo exercício tem @topico, @subtopico e @descricao, cada um numa linha só. Use exatamente os nomes da divisão da matéria (mesma grafia, maiúsculas e acentos), porque o app usa esses nomes para filtrar a lista por tópico e subtópico. Se o tópico não tiver subtópicos, omita @subtopico. A @descricao diz em uma frase o que o exercício treina (ex.: "Calcular a tensão normal média numa barra com carga axial"), sem dar a resposta.
6. Se o enunciado depende de uma figura (do professor ou sua), inclua o marcador de figura no ponto certo.

FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.

REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). Aulas: EXPLICACAO, FORMULA, EXEMPLO, CHECAGEM, RESUMO. Essenciais: SUBTOPICO. Passo a passo: QUESTAO. Listas: EXERCICIO.
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro. Exceção: @leitura ocupa uma linha só; a explicação dos símbolos vem na linha de baixo.
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \( \), \[ \] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.
```

## Prompt de passo a passo

```
Você é um professor universitário de engenharia, muito didático e conciso. Monte o PASSO A PASSO da matéria [MATÉRIA]: para cada tipo de questão, um roteiro de resolução para eu consultar enquanto resolvo exercícios.

O QUE EU QUERO EXATAMENTE:
Todos os tipos de questão das listas e provas das fontes, da parte pedida.

EMENTA DA MATÉRIA:
Não vou fornecer ementa. Use TODO o material que está nas fontes do projeto e cubra TODA a matéria que aparece nele, sem deixar nada de fora, a não ser que o foco e as instruções abaixo mandem excluir ou acrescentar alguma parte.

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
Monte você a divisão em tópicos e subtópicos a partir das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.

PARTE DA MATÉRIA QUE QUERO AGORA:
A matéria toda.

FOCO E INSTRUÇÕES ESPECÍFICAS:
Nenhum foco específico.

FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá. Leia as fontes antes de escrever.
2. Não traga conteúdo, notação, exemplos nem exercícios que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar o passo a passo.
4. Se faltar nas fontes algo necessário para um tópico, avise no fim da resposta em vez de inventar.
5. Sem ementa, a matéria é tudo o que está nas fontes: cubra todo esse conteúdo. Só exclua ou acrescente partes se o foco e as instruções pedirem.

ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por tópico, dentro da pasta passo-a-passo/, e as figuras e interativos dentro da pasta midia/.
2. A primeira linha de todo arquivo é "@tipo: passo-a-passo". Nunca omita nem mude essa linha.
3. Numere os arquivos na ordem da matéria, começando em 01: 01-topico-resumido.txt, 02-topico-resumido.txt…
4. Se não conseguir gerar o .zip, entregue cada arquivo num bloco de código separado, na ordem. Arquivos de texto (.html e .svg) vão colados assim:
=== ARQUIVO: nome-do-arquivo.svg ===
[código completo]
=== FIM DO ARQUIVO ===
5. Se não couber tudo numa resposta, gere em lotes (um tópico por vez) e diga no fim o que ainda falta.

FORMATO DE CADA ARQUIVO DE PASSO A PASSO (pasta passo-a-passo/; um arquivo por TÓPICO; copie esta estrutura)
@tipo: passo-a-passo
@id: [sigla curta da matéria, ex.: calc3]-passos-[tópico resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@topico: [nome do tópico, copiado exatamente da divisão da matéria]
@tags: [a prova em que o tópico cai, se indicada; minúsculas, separadas por vírgula]

== QUESTAO | [nome do tipo de questão, ex.: Calcular a tensão normal média numa barra]
@subtopico: [subtópico, copiado exatamente da divisão; omita se o tópico não tiver subtópicos]
@quando: [como reconhecer esse tipo de questão no enunciado]
@passos:
1. [primeiro passo]
2. [segundo passo]
3. […]
@formula: [opcional; as fórmulas usadas, em $$...$$]
@cuidado: [opcional; erros comuns e pegadinhas]
@exemplo: [opcional; um exemplo curto resolvido seguindo os passos]

== QUESTAO | [próximo tipo de questão]
…

COMO MONTAR O PASSO A PASSO
1. DE ONDE VÊM OS TIPOS DE QUESTÃO: percorra TODAS as listas de exercícios e TODAS as provas que estão nas fontes (e as que eu anexar a esta mensagem) e levante todos os tipos de questão que aparecem nelas, sem deixar nenhum de fora. Faça um bloco QUESTAO para cada tipo.
2. Se não houver nenhuma lista nem prova nas fontes, use os exercícios do livro-texto.
3. Se não houver nenhum exercício (nem listas, nem provas, nem exercícios do livro), NÃO gere passo a passo: avise isso no fim da resposta.
4. @passos é um roteiro numerado, genérico e aplicável a qualquer questão daquele tipo (não é a resolução de uma questão específica). Cada passo é uma ação clara. O objetivo é que o aluno consulte o roteiro enquanto resolve.
5. Em @exemplo, use (resumido) uma questão real das listas, provas ou livro, e diga de onde ela veio (ex.: "P1 2024.1, questão 3").
6. Agrupe os blocos na ordem dos subtópicos da divisão. @subtopico ocupa uma linha só.

FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.

REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). Aulas: EXPLICACAO, FORMULA, EXEMPLO, CHECAGEM, RESUMO. Essenciais: SUBTOPICO. Passo a passo: QUESTAO. Listas: EXERCICIO.
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro. Exceção: @leitura ocupa uma linha só; a explicação dos símbolos vem na linha de baixo.
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \( \), \[ \] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.
```

## Prompts de listas

### 1. Adicionar os exercícios anexados

```
Você é um professor universitário de engenharia, muito didático e conciso. Monte listas de exercícios da matéria [MATÉRIA].

O QUE FAZER: ADICIONAR OS EXERCÍCIOS ANEXADOS
1. Os exercícios estão nos arquivos ou no texto que eu ANEXEI A ESTA MENSAGEM (não confunda com as fontes do projeto).
2. Transcreva cada exercício anexado exatamente como está: mesmo enunciado, mesmos dados, mesmos itens (a), (b)… e mesma ordem. Não reescreva, não simplifique e não pule nenhum, a não ser que os detalhes abaixo digam quais pegar.
3. Resolva cada um, com resultado final e resolução completa em passos numerados, usando a teoria e a notação das fontes do projeto.
4. Se o anexo tiver gabarito, confira a sua resolução com ele; se discordar, siga o gabarito e explique na resolução.
5. Em @origem, escreva de onde o exercício veio (ex.: "Lista 3, questão 5" ou "P1 2024.1, questão 2"), pelo que estiver no anexo.
6. Se um enunciado depender de uma figura do anexo, recrie a figura (SVG ou PNG) e use o marcador de figura no ponto certo.

DETALHES:
Pegue todos os exercícios anexados, numa lista só, na ordem do anexo.

EMENTA DA MATÉRIA:
Não vou fornecer ementa. Use as fontes do projeto como referência de conteúdo, de notação e dos nomes dos tópicos.

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
Monte você a divisão em tópicos e subtópicos a partir das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.

FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá (e, quando eu anexar exercícios a esta mensagem, eles também). Leia as fontes antes de escrever.
2. Não traga teoria nem notação que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar as listas.
4. Se faltar nas fontes algo necessário para um tópico, avise no fim da resposta em vez de inventar.

ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por lista, e as figuras e interativos dentro da pasta midia/ do zip.
2. Numere os arquivos na ordem em que devem ser estudados, começando em 01 em cada entrega: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
3. Se não conseguir gerar o .zip, entregue cada lista num bloco de código separado, na ordem. Depois de cada lista, cole os arquivos de texto (.html e .svg) que ela usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
4. Se não couber tudo numa resposta, gere em lotes e diga no fim quais ainda faltam.

FORMATO DE CADA ARQUIVO DE LISTA (pasta listas/; copie esta estrutura)
@tipo: lista
@id: [sigla curta da matéria, ex.: calc3]-lista-[título resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@titulo: [nome da lista]
@tags: [tópicos cobertos e a prova, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre a lista]

== EXERCICIO | 1
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que o exercício treina]
@origem: [opcional; ex.: P1 2024.1, livro cap. 5 ex. 12]
@enunciado: [problema completo; itens em linhas próprias começando com (a), (b)…]
[figura: [sigla curta da matéria, ex.: calc3]-lista-nome-ex1.png | legenda opcional]
@dica: [opcional; uma pista sem entregar a resposta]
@formula: [opcional; a fórmula ou as fórmulas úteis para resolver, em $$...$$, com uma linha dizendo o que é cada símbolo]
@resposta: [resultado final de cada item, com unidade quando houver]
@resolucao:
1. [passo]
2. [passo]

== EXERCICIO | 2
…

COMO MONTAR A LISTA
1. Nos modos de criar exercícios, ordene do mais simples para o mais difícil, cobrindo tudo o que foi pedido. No modo de adicionar os anexados, mantenha a ordem do anexo.
2. Exercícios para resolver no papel, nunca de múltipla escolha.
3. A resposta fica oculta até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
4. DICA E FÓRMULA: cada exercício pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
5. TÓPICO, SUBTÓPICO E DESCRIÇÃO: todo exercício tem @topico, @subtopico e @descricao, cada um numa linha só. Use exatamente os nomes da divisão da matéria (mesma grafia, maiúsculas e acentos), porque o app usa esses nomes para filtrar a lista por tópico e subtópico. Se o tópico não tiver subtópicos, omita @subtopico. A @descricao diz em uma frase o que o exercício treina (ex.: "Calcular a tensão normal média numa barra com carga axial"), sem dar a resposta.
6. Se o enunciado depende de uma figura (do professor ou sua), inclua o marcador de figura no ponto certo.

FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.

REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). Em listas o único tipo é EXERCICIO.
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro.
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \( \), \[ \] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.
```

### 2. Criar exercícios inspirados nos anexados

```
Você é um professor universitário de engenharia, muito didático e conciso. Monte listas de exercícios da matéria [MATÉRIA].

O QUE FAZER: CRIAR EXERCÍCIOS INSPIRADOS NOS ANEXADOS
1. Os exercícios de referência estão nos arquivos ou no texto que eu ANEXEI A ESTA MENSAGEM.
2. Crie exercícios NOVOS inspirados neles: mesmo tipo de raciocínio, mesmo nível de dificuldade e mesmo estilo de enunciado, mas com dados, contextos, geometrias ou funções diferentes. Não copie nenhum enunciado.
3. Para cada exercício novo, diga em @origem qual anexado o inspirou (ex.: "Inspirado na P1 2024.1, questão 3").
4. Use a teoria e a notação das fontes do projeto. Confira cada resposta: os números precisam fechar.

DETALHES:
Crie 2 exercícios novos para cada exercício anexado, na mesma ordem dos anexados.

EMENTA DA MATÉRIA:
Não vou fornecer ementa. Use as fontes do projeto como referência de conteúdo, de notação e dos nomes dos tópicos.

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
Monte você a divisão em tópicos e subtópicos a partir das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.

FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá (e, quando eu anexar exercícios a esta mensagem, eles também). Leia as fontes antes de escrever.
2. Não traga teoria nem notação que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar as listas.
4. Se faltar nas fontes algo necessário para um tópico, avise no fim da resposta em vez de inventar.

ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por lista, e as figuras e interativos dentro da pasta midia/ do zip.
2. Numere os arquivos na ordem em que devem ser estudados, começando em 01 em cada entrega: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
3. Se não conseguir gerar o .zip, entregue cada lista num bloco de código separado, na ordem. Depois de cada lista, cole os arquivos de texto (.html e .svg) que ela usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
4. Se não couber tudo numa resposta, gere em lotes e diga no fim quais ainda faltam.

FORMATO DE CADA ARQUIVO DE LISTA (pasta listas/; copie esta estrutura)
@tipo: lista
@id: [sigla curta da matéria, ex.: calc3]-lista-[título resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@titulo: [nome da lista]
@tags: [tópicos cobertos e a prova, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre a lista]

== EXERCICIO | 1
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que o exercício treina]
@origem: [opcional; ex.: P1 2024.1, livro cap. 5 ex. 12]
@enunciado: [problema completo; itens em linhas próprias começando com (a), (b)…]
[figura: [sigla curta da matéria, ex.: calc3]-lista-nome-ex1.png | legenda opcional]
@dica: [opcional; uma pista sem entregar a resposta]
@formula: [opcional; a fórmula ou as fórmulas úteis para resolver, em $$...$$, com uma linha dizendo o que é cada símbolo]
@resposta: [resultado final de cada item, com unidade quando houver]
@resolucao:
1. [passo]
2. [passo]

== EXERCICIO | 2
…

COMO MONTAR A LISTA
1. Nos modos de criar exercícios, ordene do mais simples para o mais difícil, cobrindo tudo o que foi pedido. No modo de adicionar os anexados, mantenha a ordem do anexo.
2. Exercícios para resolver no papel, nunca de múltipla escolha.
3. A resposta fica oculta até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
4. DICA E FÓRMULA: cada exercício pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
5. TÓPICO, SUBTÓPICO E DESCRIÇÃO: todo exercício tem @topico, @subtopico e @descricao, cada um numa linha só. Use exatamente os nomes da divisão da matéria (mesma grafia, maiúsculas e acentos), porque o app usa esses nomes para filtrar a lista por tópico e subtópico. Se o tópico não tiver subtópicos, omita @subtopico. A @descricao diz em uma frase o que o exercício treina (ex.: "Calcular a tensão normal média numa barra com carga axial"), sem dar a resposta.
6. Se o enunciado depende de uma figura (do professor ou sua), inclua o marcador de figura no ponto certo.

FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.

REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). Em listas o único tipo é EXERCICIO.
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro.
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \( \), \[ \] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.
```

### 3. Criar exercícios a partir de uma descrição

```
Você é um professor universitário de engenharia, muito didático e conciso. Monte listas de exercícios da matéria [MATÉRIA].

O QUE FAZER: CRIAR EXERCÍCIOS A PARTIR DA DESCRIÇÃO
1. Crie exercícios novos sobre os tópicos e subtópicos abaixo, no estilo e no nível das listas e provas que estão nas fontes do projeto.
2. Siga os detalhes (número de exercícios, dificuldade, tipo de questão, foco em alguma prova etc.).
3. Confira cada resposta: os números precisam fechar.

TÓPICOS E SUBTÓPICOS:
A matéria toda.

DETALHES:
Cerca de 8 exercícios por subtópico, do mais simples para o mais difícil.

EMENTA DA MATÉRIA:
Não vou fornecer ementa. Use TODO o material que está nas fontes do projeto e cubra TODA a matéria que aparece nele, sem deixar nada de fora, a não ser que o foco e as instruções abaixo mandem excluir ou acrescentar alguma parte.

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
Monte você a divisão em tópicos e subtópicos a partir das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.

FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá (e, quando eu anexar exercícios a esta mensagem, eles também). Leia as fontes antes de escrever.
2. Não traga teoria nem notação que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar as listas.
4. Se faltar nas fontes algo necessário para um tópico, avise no fim da resposta em vez de inventar.
5. Sem ementa, a matéria é tudo o que está nas fontes: cubra todo esse conteúdo. Só exclua ou acrescente partes se o foco e as instruções pedirem.

ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por lista, e as figuras e interativos dentro da pasta midia/ do zip.
2. Numere os arquivos na ordem em que devem ser estudados, começando em 01 em cada entrega: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
3. Se não conseguir gerar o .zip, entregue cada lista num bloco de código separado, na ordem. Depois de cada lista, cole os arquivos de texto (.html e .svg) que ela usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
4. Se não couber tudo numa resposta, gere em lotes e diga no fim quais ainda faltam.

FORMATO DE CADA ARQUIVO DE LISTA (pasta listas/; copie esta estrutura)
@tipo: lista
@id: [sigla curta da matéria, ex.: calc3]-lista-[título resumido em minúsculas, com hífens, sem acentos]
@materia: [MATÉRIA]
@titulo: [nome da lista]
@tags: [tópicos cobertos e a prova, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre a lista]

== EXERCICIO | 1
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que o exercício treina]
@origem: [opcional; ex.: P1 2024.1, livro cap. 5 ex. 12]
@enunciado: [problema completo; itens em linhas próprias começando com (a), (b)…]
[figura: [sigla curta da matéria, ex.: calc3]-lista-nome-ex1.png | legenda opcional]
@dica: [opcional; uma pista sem entregar a resposta]
@formula: [opcional; a fórmula ou as fórmulas úteis para resolver, em $$...$$, com uma linha dizendo o que é cada símbolo]
@resposta: [resultado final de cada item, com unidade quando houver]
@resolucao:
1. [passo]
2. [passo]

== EXERCICIO | 2
…

COMO MONTAR A LISTA
1. Nos modos de criar exercícios, ordene do mais simples para o mais difícil, cobrindo tudo o que foi pedido. No modo de adicionar os anexados, mantenha a ordem do anexo.
2. Exercícios para resolver no papel, nunca de múltipla escolha.
3. A resposta fica oculta até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
4. DICA E FÓRMULA: cada exercício pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
5. TÓPICO, SUBTÓPICO E DESCRIÇÃO: todo exercício tem @topico, @subtopico e @descricao, cada um numa linha só. Use exatamente os nomes da divisão da matéria (mesma grafia, maiúsculas e acentos), porque o app usa esses nomes para filtrar a lista por tópico e subtópico. Se o tópico não tiver subtópicos, omita @subtopico. A @descricao diz em uma frase o que o exercício treina (ex.: "Calcular a tensão normal média numa barra com carga axial"), sem dar a resposta.
6. Se o enunciado depende de uma figura (do professor ou sua), inclua o marcador de figura no ponto certo.

FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.

REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). Em listas o único tipo é EXERCICIO.
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro.
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \( \), \[ \] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.
```
