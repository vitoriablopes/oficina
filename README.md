# Oficina

O ateliê das matérias da faculdade. Cada matéria tem:

- **Trilha de aulas**: cada aula é dividida em partes (explicação, fórmula, exemplo resolvido, checagem, resumo). As checagens têm **Mostrar dica**, **Mostrar fórmula**, **Mostrar resposta**, resolução passo a passo e **Acertei / Errei** (opcional).
- **Essenciais**: um por tópico, com o mais importante de cada subtópico, numa página só para revisar rápido (com busca e impressão).
- **Passo a passo**: o roteiro de resolução de cada tipo de questão das listas e provas, separado por tópico e subtópico (quando usar, passos, fórmula, cuidados e exemplo). Dá para favoritar ☆ os que você quer focar e marcar ✓ os já aprendidos, e filtrar por isso.
- **Mapa de listas** (também no menu **Listas**): listas de exercícios em fila. **Pular** e **Errei** mandam o exercício para o fim; a lista termina quando todos estiverem certos. Dentro de cada lista dá para estudar só um **tópico ou subtópico**, e cada exercício mostra o tópico, o subtópico e uma descrição.
- **Banco de exercícios** (menu Listas): junta os exercícios de todas as listas e as checagens de todas as aulas. Pesquise por tópico, subtópico, descrição ou enunciado, filtre por matéria, origem (lista ou aula) e situação (nunca feitos, já errei, acertados, salvos), marque os que quiser e pratique só esses. Os acertos e erros voltam para a lista ou aula de origem.
- **Exercícios salvos**: a estrelinha ☆ guarda exercícios e checagens para consultar depois, sempre dizendo de qual aula ou lista vieram (menu Listas › Salvos, ou a aba Salvos da matéria).
- **Acompanhar** (aba de cada matéria): uma tabelinha das avaliações em formato de calendário (data, nome, peso, nota ou previsão), a **nota final**, a **previsão** (com as notas que você acha que vai tirar) e a **nota que precisa tirar** nas que faltam. Toque numa avaliação para editar. Em *Configurar o cálculo* você escolhe a média para passar e entre **média ponderada** ou **condições com nome** (ex.: “Média parcial” = P1 + P2, vale se ≥ 7; “Com prova final” = P1 + P2 + PF×2, vale se a média parcial for < 7; há um botão com esse modelo pronto). Avaliações podem ficar fora da nota necessária, usando a previsão. Embaixo, um bloco grande de anotações livres.
- **Revisar hoje** (Início): os exercícios e checagens que você errou e ainda não acertou (botão para refazer na hora) e o passo a passo ainda não aprendido, com os favoritos primeiro.
- **Tempo de estudo e timer de foco**: o app conta sozinho o tempo em cada matéria enquanto você está nas telas de estudo dela (aulas, listas, banco, essenciais, passo a passo e fórmulas). A pílula ⏱ no canto mostra o tempo de hoje e abre o timer de foco (25 ou 50 min, com pausa de 5). Na aba Acompanhar aparecem hoje, 7 dias, total e um gráfico de 14 dias.
- **Plano até a prova** (aba Acompanhar): em cada avaliação você marca **o que cai** (os tópicos da matéria). O app distribui as aulas e listas pendentes desses tópicos pelos dias até a prova e reserva o último dia para revisar os essenciais e o passo a passo ainda não aprendido. Sem tópicos marcados, usa as aulas com a tag de mesmo nome da avaliação (ex.: `p1`). O plano se refaz sozinho conforme você estuda, e o **Início** mostra o que está no plano para hoje.
- **Editar e excluir matérias** (✎ Editar, no topo da matéria): nome, sigla usada nos ids, código da disciplina, professor(a), período, arquivar, clonar e excluir. Trocar o nome atualiza todas as aulas e listas e mantém o progresso.
- **Nova matéria**: crie uma matéria vazia (Matérias › + Nova, ou no Estúdio › Prompts) e escolha-a na lista ao gerar os prompts; a ementa e a divisão ficam salvas em cada matéria.
- **Períodos e arquivo**: cada matéria pode ter período (26.1, 26.2, 26.3…), ser reordenada (Matérias › Organizar) e ser arquivada. A tela de Matérias mostra só as não arquivadas, separadas por período; as arquivadas ficam em **Mais matérias**.
- **Clonar matéria** (⋯ Opções na matéria): cria uma cópia com outro nome e período, **tudo limpo** (progresso do zero) ou **com todos os dados**, e pode arquivar a original. Útil para refazer uma matéria sem perder nada.
- **Busca em tudo**: matérias, trilha, mapa de listas, folha de fórmulas, salvos, banco e Estúdio têm campo de pesquisa.
- **Folha de fórmulas**: todo bloco `== FORMULA` das aulas entra aqui sozinho, filtrável por tags e por tópico/subtópico, e pronto para imprimir.
- **Tags** em cada aula e lista, com filtro dentro da matéria.
- **🔊 Ouvir**: cada parte tem um botão de ouvir, e o 🎧 no topo da aula lê a aula inteira, parando nas checagens.
- **LaTeX** em tudo (KaTeX, funciona offline), **figuras** e **interativos em HTML** em qualquer ponto.

Funciona no celular e no computador, pode ser **instalado como app** e funciona offline. Com o Firebase configurado, aulas, listas, figuras e progresso sincronizam entre aparelhos.

---

## 1. Publicar no GitHub Pages

1. No GitHub, crie um repositório **público** novo (ex.: `oficina`).
2. **Add file › Upload files** e arraste **todo o conteúdo desta pasta** (o `index.html` fica na raiz, junto com `css`, `js`, `fonts`, `icons`, `vendor`, `exemplos`). **Commit changes**.
3. **Settings › Pages** › *Deploy from a branch* › branch **main**, pasta **/ (root)** › **Save**.
4. Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/oficina/`.

Já funciona, salvando tudo **no aparelho**. Para sincronizar, faça a parte 2.

## 2. Sincronização com Firebase

> O `js/config.js` deste zip já vem com o projeto do Firebase do Atelier e o seu e-mail. Falta só acrescentar as regras `oficina_…` no Firestore (passo 4) e entrar em Ajustes.


Pode usar **o mesmo projeto do Atelier**: a Oficina guarda tudo em coleções separadas (`oficina_itens`, `oficina_midia`, `oficina_config`), então não mistura nada.

1. Se for o mesmo projeto do Atelier: pule para o passo 4. Se for um projeto novo, siga os passos 1–5 do README do Atelier (criar projeto, ligar login com Google, criar o Firestore).
2. Em **Authentication › Configurações › Domínios autorizados**, confira que `SEU-USUARIO.github.io` está lá.
3. (projeto novo) Copie o `firebaseConfig` em *Configurações do projeto › Seus apps*.
4. **Firestore › Regras**: acrescente os blocos `oficina_…` do arquivo `firestore.rules` (se for o projeto do Atelier, cole-os **dentro** do `match /databases/{database}/documents { … }` que já existe, sem apagar as regras do Atelier). Troque `SEU-EMAIL@gmail.com` pelo seu e-mail e **Publicar**.
5. No GitHub, edite `js/config.js`: cole o `firebaseConfig` no lugar de `firebase: null` e coloque seu e-mail em `admins`.
6. Abra o site › **Ajustes › Entrar com Google**. Faça o mesmo no celular.

> Figuras grandes: cada mídia na nuvem tem limite de ~900 KB (limite do Firestore). Imagens maiores são reduzidas sozinhas na importação; um GIF muito grande fica só no aparelho (o app avisa).

## 3. Instalar no celular

- **Android (Chrome):** menu **⋮** › **Instalar app**.
- **iPhone (Safari):** **Compartilhar** › **Adicionar à Tela de Início**.

## 4. Pôr aulas e listas

Tudo pelo **Estúdio**:

- **Prompts para IA**: o **pacote da matéria** gera, num zip só, aulas, essenciais, passo a passo e listas (você marca o que quer e detalha cada parte). Também há um prompt só de **passo a passo**, onde você descreve exatamente o que quer. Crie um projeto no ChatGPT (ou no Claude) para a matéria e ponha nas fontes do projeto os livros-texto, slides, notas de aula, listas e provas. No Estúdio, preencha matéria, sigla, ementa, divisão da matéria, a parte que você quer agora e o foco (ex.: “no estilo da P1 de 2024.1”), copie o prompt e mande dentro do projeto. Para listas há três tipos de prompt: **adicionar os exercícios anexados** (transcreve e resolve), **criar exercícios inspirados nos anexados** e **criar exercícios a partir de uma descrição** (tópicos, subtópicos e detalhes, como o número de exercícios). O prompt manda a IA usar só as fontes do projeto e devolver um `.zip` com um `.txt` por aula (ou lista) e a pasta `midia/` com figuras e interativos.
- **Colar uma**: cola o código de **uma** aula ou lista, vê a pré-visualização com avisos de formato e escolhe a **posição** (vazio = no fim; um número = entra ali e as seguintes descem).
- **Importar vários**: um `.zip` ou vários arquivos de uma vez. O número no começo do nome (`01-`, `02-`…) define a ordem inicial, e você **precisa confirmar a ordem** arrastando (ou com ↑ ↓) antes de importar.
- Um item com o mesmo `@id` de outro que já existe **substitui** a versão antiga, mantendo a posição e o progresso.
- **Carregar o exemplo**: uma aula e uma lista de Cálculo 3, com figura, interativo, fórmulas e checagens.

A primeira linha de cada arquivo (`@tipo: aula`, `lista`, `essencial` ou `passo-a-passo`) diz ao app o que ele é; num zip, pode vir tudo misturado ou em pastas (`aulas/`, `essenciais/`, `passo-a-passo/`, `listas/`, `midia/`).

O formato completo está em **`MODELO-DA-OFICINA.md`** e em *Estúdio › Modelo do código*.

## 5. Exportar e backup

*Estúdio › Minhas aulas e listas*:

- **⇩** ao lado de cada item: um `.txt` (ou `.zip`, se tiver figuras/interativos).
- **Exportar matéria**: `.zip` com `aulas/`, `listas/` e `midia/`, no mesmo formato da importação.
- **Backup completo**: `.zip` com todas as matérias, mídias e o seu progresso. Para restaurar, importe o zip em *Importar vários* e marque “Restaurar também o progresso”.

## 6. Estrutura

```
index.html            página do app
manifest.webmanifest  instalação como app
sw.js                 funcionamento offline
firestore.rules       regras do banco
js/config.js          ← o único arquivo de configuração
js/parser.js          leitor do formato de aula/lista
js/math.js            LaTeX (KaTeX) e leitura das fórmulas em voz alta
js/…                  resto do app
vendor/               KaTeX e JSZip (sem depender de CDN)
exemplos/             a aula e a lista de exemplo
```
