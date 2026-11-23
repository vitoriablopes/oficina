// Prompts para gerar aulas e listas com IA, e o modelo do formato.

const MIDIA = `FIGURAS E INTERATIVOS (valem para aulas e listas)

QUANDO USAR
1. Sempre que uma figura, um gráfico, uma animação ou um interativo for possível e ajudar a entender um conceito, FAÇA. Isso é obrigatório, não opcional. Exemplos: gráfico de uma função, região de integração, superfície 3D, campo vetorial, diagrama de corpo livre, viga com diagrama de esforços, círculo de Mohr, um controle deslizante que muda um parâmetro e mostra o efeito na hora.
2. Prefira um interativo quando manipular algo (arrastar, mudar um valor, girar) ensinar mais do que olhar uma figura parada.

COMO INSERIR
3. Figura, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[figura: nome-do-arquivo.png | legenda opcional]
4. Interativo, em qualquer ponto de qualquer bloco ou campo, numa linha sozinha:
[interativo: nome-do-arquivo.html | altura em px, opcional, padrão 400 | legenda opcional]
5. Use quantas figuras e interativos forem necessários.
5b. ONDE PÔR A FIGURA EM CHECAGENS E EXERCÍCIOS: o marcador fica no campo em que a figura é usada. No @enunciado (ou @pergunta) só entram as figuras que fazem parte do enunciado. Uma figura que só serve de ajuda ou de explicação (por exemplo, um diagrama de corpo livre da solução) vai dentro de @dica, @formula ou @resolucao, nunca junto do enunciado, para não entregar a resposta.
6. Nomes de arquivo em minúsculas, sem espaços nem acentos, começando pelo @id da aula ou da lista. Ex.: calc3-integrais-polares-regiao.png

COMO FAZER AS FIGURAS
7. Formatos aceitos: .png, .jpg, .svg ou .gif.
8. Gere você mesmo as figuras, por exemplo com Python (matplotlib) ou desenhando em SVG. Fundo branco, linhas nítidas, rótulos legíveis no celular, destaques em azul pastel.

COMO FAZER OS INTERATIVOS
9. Cada interativo é um único arquivo .html autossuficiente: HTML, CSS e JavaScript dentro dele. Nada de .jsx, .py ou arquivos separados.
10. Bibliotecas apenas por CDN com https e versão fixa. Sugestões: Plotly (gráficos 2D e 3D, superfícies), JSXGraph (geometria e funções com pontos arrastáveis), Three.js (3D), p5.js ou Canvas (animações e desenhos), KaTeX (fórmulas dentro do interativo). React só se carregado por CDN dentro do próprio .html.
11. Ele roda isolado dentro do app: não use localStorage, cookies, alert(), pop-ups nem requisições para fora (só os CDNs).
12. Deve funcionar no celular: largura 100%, controles grandes e que funcionem com toque, textos em português do Brasil, fundo branco, detalhes em azul pastel.
13. Inclua uma frase curta no topo dizendo o que mexer e o que observar.`;

const REGRAS_FORMATO = (tipo) => `REGRAS DE FORMATO (o app lê o arquivo automaticamente; siga à risca)
1. O arquivo começa com os metadados, um por linha, cada um começando com @, e o primeiro é sempre @tipo (@tipo, @id, @materia, @topico, @titulo, @tags…).
2. Cada bloco começa com uma linha "== TIPO | título" (o título é opcional). ${tipo === 'lista' ? 'Em listas o único tipo é EXERCICIO.' : 'Aulas: EXPLICACAO, FORMULA, EXEMPLO, CHECAGEM, RESUMO. Essenciais: SUBTOPICO. Passo a passo: QUESTAO. Listas: EXERCICIO.'}
3. Dentro dos blocos, os campos começam no início da linha com @nome: (ex.: @enunciado:, @resposta:). Escreva os nomes exatamente assim: minúsculas, sem acento, seguidos de dois-pontos. Nunca traduza nem renomeie.
4. Um campo pode ocupar várias linhas e termina quando começa o próximo campo (@…) ou o próximo bloco (== …). Campos opcionais sem conteúdo são omitidos por inteiro.${tipo === 'aula' ? ' Exceção: @leitura ocupa uma linha só; a explicação dos símbolos vem na linha de baixo.' : ''}
5. Dentro do texto valem: parágrafos separados por linha em branco; "- item" e "1. item" para listas; "### subtítulo"; tabelas com | (linha |---| depois do cabeçalho); "! dica" num quadro amarelo; "!! atenção" num quadro de alerta; **negrito** e *itálico*.
6. Toda matemática vai em LaTeX: $...$ no meio do texto e $$...$$ em linha própria (pode ocupar várias linhas). Nunca use \\( \\), \\[ \\] nem símbolos Unicode no lugar de LaTeX.
7. Escreva em português do Brasil.`;

const ENTREGA = (oque) => `ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por ${oque}, e as figuras e interativos dentro da pasta midia/ do zip.
2. Numere os arquivos na ordem em que devem ser estudados, começando em 01 em cada entrega: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
3. Se não conseguir gerar o .zip, entregue cada ${oque} num bloco de código separado, na ordem. Depois de cada ${oque}, cole os arquivos de texto (.html e .svg) que ela usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
4. Se não couber tudo numa resposta, gere em lotes e diga no fim quais ainda faltam.`;

const FONTES = (oque, { lista = false, escopoTotal = true } = {}) => `FONTES (obrigatório)
1. Use como base SOMENTE os arquivos que estão nas fontes deste projeto: livros-texto, slides do professor, notas de aula, listas de exercícios, provas antigas e o que mais estiver lá${lista ? ' (e, quando eu anexar exercícios a esta mensagem, eles também)' : ''}. Leia as fontes antes de escrever.
2. Não traga ${lista ? 'teoria nem notação' : 'conteúdo, notação, exemplos nem exercícios'} que não estejam nas fontes. Use a mesma notação, os mesmos nomes e a mesma ordem de apresentação do professor sempre que as fontes mostrarem.
3. Se o foco ou os detalhes acima citarem uma prova, uma lista ou um material específico, priorize esse material (o estilo, o nível e os tipos de questão dele) ao montar ${oque}.
4. O QUE ESTÁ FALTANDO: antes de começar, compare a ementa, a parte pedida e os detalhes com o que existe nas fontes. Se algo estiver faltando (um tópico da ementa sem material, uma prova, lista ou capítulo citado nos detalhes que não está nas fontes), avise logo no início da resposta, liste exatamente o que falta e peça para eu enviar o(s) arquivo(s). Se o que falta for essencial, espere eu enviar antes de gerar; se não for, gere o resto e marque com clareza o que ficou pendente. Nunca invente o conteúdo que falta.${escopoTotal ? `
5. Sem ementa, a matéria é tudo o que está nas fontes: cubra todo esse conteúdo. Só exclua ou acrescente partes se o foco e as instruções pedirem.` : ''}`;

const CONFERENCIA = `CONFERÊNCIA ANTES DE ENVIAR (obrigatório)
1. Antes de gerar o arquivo final, revise tudo com calma (double check): refaça as contas de todos os exemplos, checagens e exercícios e confira cada resposta; confira se as explicações estão completas e corretas segundo as fontes.
2. Confira o formato de cada arquivo: @tipo na primeira linha, metadados, blocos "== TIPO | título", nomes dos campos exatamente como no modelo, LaTeX válido, nomes de @topico e @subtopico idênticos aos da divisão, e cada marcador de figura ou interativo com o arquivo correspondente em midia/.
3. Confira se cobriu tudo o que a ementa, a parte pedida e os detalhes pedem.
4. Só gere e envie o .zip (ou os arquivos) depois que essa revisão estiver certa. Se encontrar algum erro, corrija antes de enviar.`;

const CONTEXTO = ({ ementa = '', divisao = '', parte = '', foco = '', escopoTotal = true }) => `EMENTA DA MATÉRIA:
${ementa.trim() || (escopoTotal ? 'Não vou fornecer ementa. Use TODO o material que está nas fontes do projeto e cubra TODA a matéria que aparece nele, sem deixar nada de fora, a não ser que o foco e as instruções abaixo mandem excluir ou acrescentar alguma parte.' : 'Não vou fornecer ementa. Use as fontes do projeto como referência de conteúdo, de notação e dos nomes dos tópicos.')}

DIVISÃO DA MATÉRIA (tópicos e subtópicos):
${divisao.trim() || `Monte você a divisão em tópicos e subtópicos a partir ${ementa.trim() ? 'da ementa e ' : ''}das fontes, na ordem em que a matéria é dada, e use exatamente os mesmos nomes em todos os arquivos (em @topico e @subtopico). Liste essa divisão no fim da resposta.`}

PARTE DA MATÉRIA QUE QUERO AGORA:
${parte.trim() || 'A matéria toda.'}

FOCO E INSTRUÇÕES ESPECÍFICAS:
${foco.trim() || 'Nenhum foco específico.'}`;

const AULA_SPEC = (M, S) => `FORMATO DE CADA ARQUIVO DE AULA (pasta aulas/; copie esta estrutura)
@tipo: aula
@id: ${S}-[título resumido em minúsculas, com hífens, sem acentos]
@materia: ${M}
@topico: [tópico a que a aula pertence, copiado exatamente da divisão da matéria]
@subtopico: [subtópico que a aula ensina, copiado exatamente da divisão; omita se o tópico não tiver subtópicos]
@titulo: [título da aula]
@tags: [o tópico a que a aula pertence, mais 2 a 4 tags de conteúdo e a prova, se indicada; tudo em minúsculas, separado por vírgula]
@tempo: [duração estimada em minutos]
@descricao: [uma frase dizendo o que a aula ensina]

== EXPLICACAO | [título do mini-tópico]
[explicação completa e detalhada do mini-tópico, com $...$ e $$...$$ e as fórmulas no ponto em que aparecem]
[figura: ${S}-nome.png | legenda]

== EXEMPLO | [título curto]
@enunciado: [enunciado COMPLETO do problema ou da aplicação, com todos os dados]
@resolucao:
1. [passo — dizendo onde e como o conceito da aula foi usado]
2. [passo — idem]
@resposta: [resultado final, com unidade]

== FORMULA | Fórmulas da aula
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [opcional; uma frase sobre o conjunto de fórmulas]
### [nome da fórmula 1]
$$[fórmula 1]$$
@leitura: [a fórmula 1 escrita por extenso, numa linha só, do jeito que se fala em voz alta]
[o que significa cada símbolo, unidades e quando usar]
### [nome da fórmula 2]
$$[fórmula 2]$$
@leitura: [a fórmula 2 por extenso, numa linha só]
[o que significa cada símbolo, unidades e quando usar]

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
1. QUALIDADE ACIMA DE TUDO: cada aula precisa bastar sozinha para eu entender bem o conteúdo — os conceitos, a teoria (de onde vem, por que funciona, hipóteses e limites de validade) e a prática das questões (como reconhecer e resolver os tipos de questão que caem nas listas e provas das fontes). Não resuma nem economize: prefira uma aula completa a uma aula curta.
2. SE PRECISAR, DIVIDA A ENTREGA: se não couber tudo com essa qualidade numa resposta, divida o trabalho em várias etapas ou respostas (por exemplo, um tópico por vez). Nunca encurte o conteúdo para caber. No fim de cada resposta, diga o que vem na próxima e continue quando eu escrever "continue".
3. EXPLICAÇÕES ROBUSTAS E NÚMERO DE BLOCOS RAZOÁVEL: se a aula tiver vários mini-tópicos, ela pode ter mais de um bloco EXPLICACAO (um por mini-tópico), mas cada bloco precisa trazer os detalhes e as especificidades daquele mini-tópico: definição, intuição, desenvolvimento ou dedução (quando as fontes fizerem), hipóteses, convenções de sinal, unidades, casos particulares e erros comuns. NÃO quebre a aula em muitos blocos curtos e rasos: um bloco que não consegue transmitir o conteúdo sozinho deve ser juntado ao vizinho. Não há limite de blocos por aula, mas a quantidade deve ser razoável e fazer sentido para o conteúdo (cada bloco = uma ideia completa).
4. FÓRMULAS DENTRO DA EXPLICAÇÃO: toda fórmula aparece no bloco EXPLICACAO em que é apresentada, em $$...$$, com o significado de cada símbolo e quando usar. Depois, perto do fim da aula (antes do RESUMO), UM ÚNICO bloco FORMULA reúne todas as fórmulas da aula, cada uma com "### nome", $$...$$, @leitura e o significado. Não faça um bloco FORMULA para cada fórmula.
5. APLICAÇÕES E EXEMPLOS COMPLETOS: sempre que falar de uma aplicação ou de um exemplo, não diga apenas onde ele aparece: traga o enunciado completo e a resolução passo a passo, dizendo explicitamente em cada passo onde e como o conceito da aula foi usado (ex.: "aqui entra a fórmula X porque…"). Use blocos EXEMPLO para isso, de preferência com questões reais das listas, provas ou livro das fontes, citando a origem no título ou no enunciado.
6. Prefira mostrar um exemplo resolvido antes de pedir que o aluno resolva algo parecido.
7. Coloque checagens onde um bom professor pararia para conferir se o aluno entendeu, por exemplo depois de um conceito novo ou antes de avançar para algo que depende dele. Não há número mínimo nem máximo de checagens: decida pelo que for mais didático em cada aula.
8. As checagens são para resolver no papel (cálculo, conceito ou interpretação), nunca de múltipla escolha. A resposta fica oculta no app até o aluno pedir, então sempre traga o resultado final e a resolução completa em passos numerados.
9. DICA E FÓRMULA: cada checagem pode ter dois botões de ajuda no app, "Mostrar dica" e "Mostrar fórmula". O botão "Mostrar dica" mostra exatamente o conteúdo de @dica; o botão "Mostrar fórmula" mostra exatamente o conteúdo de @formula. Escreva @dica quando houver um caminho que valha a pena sugerir, sem entregar a resposta. Escreva @formula quando houver uma ou mais fórmulas que ajudem a resolver, em LaTeX ($$...$$), sem já aplicá-las ao problema. Se não houver dica ou fórmula útil, omita o campo inteiro: o botão correspondente não aparece.
10. TÓPICO, SUBTÓPICO E DESCRIÇÃO: toda checagem tem @topico, @subtopico e @descricao, cada um numa linha só, com os nomes exatos da divisão da matéria (mesma grafia), porque as checagens também entram no banco de exercícios do app, que filtra por tópico, subtópico e descrição. Se o tópico não tiver subtópicos, omita @subtopico. Preencha também @topico e @subtopico do bloco FORMULA.
11. Termine com um RESUMO.`;

const ESSENCIAL_SPEC = (M, S) => `FORMATO DE CADA ARQUIVO DE ESSENCIAIS (pasta essenciais/; um arquivo por TÓPICO; copie esta estrutura)
@tipo: essencial
@id: ${S}-essenciais-[tópico resumido em minúsculas, com hífens, sem acentos]
@materia: ${M}
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
4. Use figuras quando um esquema resumir melhor (ex.: convenção de sinais, diagrama típico).`;

const PASSOS_SPEC = (M, S) => `FORMATO DE CADA ARQUIVO DE PASSO A PASSO (pasta passo-a-passo/; um arquivo por TÓPICO; copie esta estrutura)
@tipo: passo-a-passo
@id: ${S}-passos-[tópico resumido em minúsculas, com hífens, sem acentos]
@materia: ${M}
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
6. Agrupe os blocos na ordem dos subtópicos da divisão. @subtopico ocupa uma linha só.`;

const LISTA_SPEC = (M, S) => `FORMATO DE CADA ARQUIVO DE LISTA (pasta listas/; copie esta estrutura)
@tipo: lista
@id: ${S}-lista-[título resumido em minúsculas, com hífens, sem acentos]
@materia: ${M}
@titulo: [nome da lista]
@tags: [tópicos cobertos e a prova, se indicada; minúsculas, separadas por vírgula]
@descricao: [opcional: uma frase sobre a lista]

== EXERCICIO | 1
@topico: [tópico da matéria, copiado exatamente da divisão acima]
@subtopico: [subtópico, copiado exatamente da divisão acima]
@descricao: [uma frase curta dizendo o que o exercício treina]
@origem: [opcional; ex.: P1 2024.1, livro cap. 5 ex. 12]
@enunciado: [problema completo; itens em linhas próprias começando com (a), (b)…]
[figura: ${S}-lista-nome-ex1.png | legenda opcional]
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
6. Se o enunciado depende de uma figura (do professor ou sua), inclua o marcador de figura no ponto certo.`;

export function promptPacote({ materia = '', sigla = '', topicos = '', ementa = '', parte = '', foco = '', incluir = { aulas: true, essenciais: true, passos: true }, detalhes = {} } = {}) {
  const M = materia.trim() || '[MATÉRIA]';
  const S = sigla.trim() || '[sigla curta da matéria, ex.: calc3]';
  const I = { aulas: !!incluir.aulas, essenciais: !!incluir.essenciais, passos: !!incluir.passos, listas: !!incluir.listas };
  if (!I.aulas && !I.essenciais && !I.passos && !I.listas) I.aulas = true;
  const D = (k) => String(detalhes[k] || '').trim();
  const nomes = [I.aulas && 'aulas', I.essenciais && 'essenciais', I.passos && 'passo a passo', I.listas && 'listas de exercícios'].filter(Boolean);
  const lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] : nomes[0];
  const pastas = [I.aulas && 'aulas/ (um .txt por aula)', I.essenciais && 'essenciais/ (um .txt por tópico)', I.passos && 'passo-a-passo/ (um .txt por tópico)', I.listas && 'listas/ (um .txt por lista)'].filter(Boolean);
  const tipos = [I.aulas && '"@tipo: aula"', I.essenciais && '"@tipo: essencial"', I.passos && '"@tipo: passo-a-passo"', I.listas && '"@tipo: lista"'].filter(Boolean);
  return `Você é um professor universitário de engenharia, muito didático e claro, que explica cada assunto de forma completa (teoria e prática) sem enrolar. Monte o material de estudo da matéria ${M} a partir das fontes deste projeto, seguindo a ementa e a divisão da matéria abaixo: ${lista}.

O QUE GERAR E DETALHES DE CADA PARTE
${[I.aulas && `- AULAS: em geral uma aula por subtópico da parte pedida (junte subtópicos pequenos ou divida um grande quando for mais didático). Cada aula tem @topico e @subtopico.
  Detalhes das aulas: ${D('aulas') || 'nenhum detalhe extra.'}`,
  I.essenciais && `- ESSENCIAIS: um arquivo por tópico, reunindo o mais importante de todos os subtópicos daquele tópico.
  Detalhes dos essenciais: ${D('essenciais') || 'nenhum detalhe extra.'}`,
  I.passos && `- PASSO A PASSO: um arquivo por tópico, com o roteiro de resolução de TODOS os tipos de questão das listas e provas das fontes, separado por subtópico (regras de origem abaixo).
  Detalhes do passo a passo: ${D('passos') || 'nenhum detalhe extra.'}`,
  I.listas && `- LISTAS DE EXERCÍCIOS: exercícios novos sobre a parte pedida, no estilo e no nível das listas e provas das fontes, com @topico, @subtopico e @descricao em cada exercício.
  Detalhes das listas: ${D('listas') || 'uma lista por tópico, com cerca de 8 exercícios por subtópico, do mais simples para o mais difícil.'}`].filter(Boolean).join('\n')}

${CONTEXTO({ ementa, divisao: topicos, parte, foco })}

${FONTES('o material')}

ENTREGA
1. Gere UM arquivo .zip com estas pastas: ${pastas.join(', ')} e midia/ (figuras e interativos).
2. A primeira linha de TODO arquivo .txt diz o que ele é, e o app usa isso para saber onde pôr cada arquivo: ${tipos.join(', ')}. Nunca omita nem mude essa linha.
3. Em cada pasta, numere os arquivos na ordem da matéria, começando em 01: 01-titulo-resumido.txt, 02-titulo-resumido.txt…
4. Use em @topico e @subtopico exatamente os mesmos nomes em todos os arquivos, copiados da divisão da matéria. É assim que o app junta tudo por tópico.
5. Se não conseguir gerar o .zip, entregue cada arquivo num bloco de código separado, na ordem, com o nome do arquivo antes. Depois de cada um, cole os arquivos de texto (.html e .svg) que ele usa assim:
=== ARQUIVO: nome-do-arquivo.html ===
[código completo]
=== FIM DO ARQUIVO ===
Para figuras que não sejam texto (.png, .jpg, .gif), liste no fim o nome de cada arquivo que falta e o que ele deve mostrar.
6. Se não couber tudo numa resposta, gere em lotes (por exemplo, um tópico por vez, com tudo o que for dele) e diga no fim o que ainda falta.

${[I.aulas && AULA_SPEC(M, S), I.essenciais && ESSENCIAL_SPEC(M, S), I.passos && PASSOS_SPEC(M, S), I.listas && LISTA_SPEC(M, S)].filter(Boolean).join('\n\n')}

${MIDIA}

${CONFERENCIA}

${REGRAS_FORMATO(I.aulas || I.essenciais || I.passos ? 'aula' : 'lista')}`;
}

export function promptPassos({ materia = '', sigla = '', topicos = '', ementa = '', parte = '', detalhes = '' } = {}) {
  const M = materia.trim() || '[MATÉRIA]';
  const S = sigla.trim() || '[sigla curta da matéria, ex.: calc3]';
  return `Você é um professor universitário de engenharia, muito didático e conciso. Monte o PASSO A PASSO da matéria ${M}: para cada tipo de questão, um roteiro de resolução para eu consultar enquanto resolvo exercícios.

O QUE EU QUERO EXATAMENTE:
${detalhes.trim() || 'Todos os tipos de questão das listas e provas das fontes, da parte pedida.'}

${CONTEXTO({ ementa, divisao: topicos, parte, foco: detalhes })}

${FONTES('o passo a passo')}

ENTREGA
1. Gere um arquivo .zip com um arquivo .txt por tópico, dentro da pasta passo-a-passo/, e as figuras e interativos dentro da pasta midia/.
2. A primeira linha de todo arquivo é "@tipo: passo-a-passo". Nunca omita nem mude essa linha.
3. Numere os arquivos na ordem da matéria, começando em 01: 01-topico-resumido.txt, 02-topico-resumido.txt…
4. Se não conseguir gerar o .zip, entregue cada arquivo num bloco de código separado, na ordem. Arquivos de texto (.html e .svg) vão colados assim:
=== ARQUIVO: nome-do-arquivo.svg ===
[código completo]
=== FIM DO ARQUIVO ===
5. Se não couber tudo numa resposta, gere em lotes (um tópico por vez) e diga no fim o que ainda falta.

${PASSOS_SPEC(M, S)}

${MIDIA}

${CONFERENCIA}

${REGRAS_FORMATO('aula')}`;
}
export const promptAulas = (o = {}) => promptPacote({ ...o, incluir: { aulas: true } });

export const MODOS_LISTA = {
  anexados: 'Adicionar os exercícios anexados',
  inspirados: 'Criar exercícios inspirados nos anexados',
  descricao: 'Criar exercícios a partir de uma descrição',
};
export function promptListas({ materia = '', sigla = '', divisao = '', ementa = '', topicos = '', detalhes = '', modo = 'descricao' } = {}) {
  const M = materia.trim() || '[MATÉRIA]';
  const S = sigla.trim() || '[sigla curta da matéria, ex.: calc3]';
  const det = detalhes.trim();
  let pedido;
  if (modo === 'anexados') pedido = `O QUE FAZER: ADICIONAR OS EXERCÍCIOS ANEXADOS
1. Os exercícios estão nos arquivos ou no texto que eu ANEXEI A ESTA MENSAGEM (não confunda com as fontes do projeto).
2. Transcreva cada exercício anexado exatamente como está: mesmo enunciado, mesmos dados, mesmos itens (a), (b)… e mesma ordem. Não reescreva, não simplifique e não pule nenhum, a não ser que os detalhes abaixo digam quais pegar.
3. Resolva cada um, com resultado final e resolução completa em passos numerados, usando a teoria e a notação das fontes do projeto.
4. Se o anexo tiver gabarito, confira a sua resolução com ele; se discordar, siga o gabarito e explique na resolução.
5. Em @origem, escreva de onde o exercício veio (ex.: "Lista 3, questão 5" ou "P1 2024.1, questão 2"), pelo que estiver no anexo.
6. Se um enunciado depender de uma figura do anexo, recrie a figura (SVG ou PNG) e use o marcador de figura no ponto certo.

DETALHES:
${det || 'Pegue todos os exercícios anexados, numa lista só, na ordem do anexo.'}`;
  else if (modo === 'inspirados') pedido = `O QUE FAZER: CRIAR EXERCÍCIOS INSPIRADOS NOS ANEXADOS
1. Os exercícios de referência estão nos arquivos ou no texto que eu ANEXEI A ESTA MENSAGEM.
2. Crie exercícios NOVOS inspirados neles: mesmo tipo de raciocínio, mesmo nível de dificuldade e mesmo estilo de enunciado, mas com dados, contextos, geometrias ou funções diferentes. Não copie nenhum enunciado.
3. Para cada exercício novo, diga em @origem qual anexado o inspirou (ex.: "Inspirado na P1 2024.1, questão 3").
4. Use a teoria e a notação das fontes do projeto. Confira cada resposta: os números precisam fechar.

DETALHES:
${det || 'Crie 2 exercícios novos para cada exercício anexado, na mesma ordem dos anexados.'}`;
  else pedido = `O QUE FAZER: CRIAR EXERCÍCIOS A PARTIR DA DESCRIÇÃO
1. Crie exercícios novos sobre os tópicos e subtópicos abaixo, no estilo e no nível das listas e provas que estão nas fontes do projeto.
2. Siga os detalhes (número de exercícios, dificuldade, tipo de questão, foco em alguma prova etc.).
3. Confira cada resposta: os números precisam fechar.

TÓPICOS E SUBTÓPICOS:
${topicos.trim() || 'A matéria toda.'}

DETALHES:
${det || 'Cerca de 8 exercícios por subtópico, do mais simples para o mais difícil.'}`;
  return `Você é um professor universitário de engenharia, muito didático e conciso. Monte listas de exercícios da matéria ${M}.

${pedido}

${CONTEXTO({ ementa, divisao, escopoTotal: modo === 'descricao' && !topicos.trim() }).replace(/\n\nPARTE DA MATÉRIA QUE QUERO AGORA:[\s\S]*$/, '')}

${FONTES('as listas', { lista: true, escopoTotal: modo === 'descricao' && !topicos.trim() })}

${ENTREGA('lista')}

${LISTA_SPEC(M, S)}

${MIDIA}

${CONFERENCIA}

${REGRAS_FORMATO('lista')}`;
}

export const MODELO_AULA = `@tipo: aula
@id: calc3-integrais-polares
@materia: Cálculo 3
@topico: Integrais duplas
@subtopico: Coordenadas polares
@titulo: Integrais duplas em coordenadas polares
@tags: integrais duplas, coordenadas polares, p1
@tempo: 40
@descricao: Uma frase dizendo o que a aula ensina.

== EXPLICACAO | Título curto
Explicação completa: definição, intuição, dedução, hipóteses e erros comuns.
A fórmula aparece aqui, no ponto em que é apresentada:
$$x = r\\cos\\theta \\qquad y = r\\sin\\theta$$
onde $r$ é a distância à origem e $\\theta$ o ângulo.

[figura: calc3-integrais-polares-ponto.svg | Legenda da figura]
[interativo: calc3-integrais-polares-area.html | 420 | Legenda do interativo]

! Dica num quadro amarelo.
!! Atenção num quadro de alerta.

== EXEMPLO | Título (ex.: P1 2024.1, questão 2)
@enunciado: Enunciado completo, com todos os dados.
@resolucao:
1. Primeiro passo — aqui usamos o conceito X porque…
2. Segundo passo — a fórmula Y entra assim…
@resposta: Resultado final.

== CHECAGEM | Título opcional
@topico: Integrais duplas
@subtopico: Coordenadas polares
@descricao: O que esta checagem treina.
@pergunta: O que a aluna resolve no papel.
@dica: Uma pista (opcional; sem ela, o botão "Mostrar dica" não aparece).
@formula: $$dA = r\\,dr\\,d\\theta$$ (opcional; sem ela, o botão "Mostrar fórmula" não aparece)
@resposta: Resultado final.
@resolucao:
1. Passo.
2. Passo.

== FORMULA | Fórmulas da aula
@topico: Integrais duplas
@subtopico: Coordenadas polares
### Troca para polares
$$x = r\\cos\\theta \\qquad y = r\\sin\\theta$$
@leitura: x igual a r cosseno de teta, y igual a r seno de teta
O que significa cada símbolo e quando usar.
### Elemento de área
$$dA = r\\,dr\\,d\\theta$$
@leitura: d A igual a r d r d teta
O que significa cada símbolo e quando usar.

== RESUMO
- Ponto-chave.
- Outro ponto-chave.`;

export const MODELO_LISTA = `@tipo: lista
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
$$x = r\cos\theta \qquad y = r\sin\theta$$
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
@resposta: …`;

export const MODELO_ESSENCIAL = `@tipo: essencial
@id: calc3-essenciais-integrais-duplas
@materia: Cálculo 3
@topico: Integrais duplas
@tags: p1

== SUBTOPICO | Regiões retangulares
- Ideia-chave em uma frase.
- Condição de uso: …
$$\\int_a^b\\int_c^d f\\,dy\\,dx$$

== SUBTOPICO | Coordenadas polares
- Quando usar: …
$$dA = r\\,dr\\,d\\theta$$
!! Erro comum: esquecer o $r$.`;

export const MODELO_PASSOS = `@tipo: passo-a-passo
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
@formula: $$dA = r\\,dr\\,d\\theta$$
@cuidado: Erro comum (opcional).
@exemplo: Exemplo curto resolvido (opcional).`;
