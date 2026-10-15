// roteiro do vídeo. edite aqui textos, narração e tempos sem mexer nos componentes.
//
// durationSec: duração padrão da cena (usada quando não existe src/timings.json).
// cue: momento em que um elemento entra.
//   at   = segundos desde o início da cena (padrão, sem narração)
//   word = trecho da fala que dispara o elemento quando há src/timings.json
//          (o primeiro trecho igual encontrado depois do cue anterior da mesma cena)
//
// mantenha "id" e "narration" entre aspas duplas e numa linha só:
// scripts/align.py lê esses dois campos direto deste arquivo.

export type Cue = {at: number; word?: string};

export const scenes = [
  {
    id: "gancho",
    durationSec: 3,
    narration: "você tá automatizando um processo que nem devia existir.",
    screen: {
      line1: "você tá automatizando um processo",
      line2: "que nem devia existir",
    },
    cues: {
      line1: {at: 0},
      line2: {at: 1.3, word: "que nem"},
    },
  },
  {
    id: "barato",
    durationSec: 6,
    narration: "a ia deixou automatizar barato demais. dá pra automatizar qualquer coisa numa tarde. inclusive o que ninguém usa.",
    screen: {
      title: "a ia deixou automatizar barato demais",
      support: "dá pra automatizar qualquer coisa numa tarde.",
      highlight: "inclusive o que ninguém usa",
      clockFrom: "13:00",
      clockTo: "18:00",
    },
    cues: {
      title: {at: 0},
      support: {at: 2.4, word: "dá pra"},
      clock: {at: 2.4, word: "dá pra"},
      highlight: {at: 4.4, word: "inclusive"},
    },
  },
  {
    id: "passos",
    durationSec: 11,
    narration: "o musk usa um algoritmo de 5 passos. um, questiona o requisito: quem pediu isso? dois, apaga. três, simplifica o que sobrou. quatro, acelera. e só no cinco, automatiza.",
    screen: {
      title: "o algoritmo de 5 passos",
      plates: [
        {n: "1", text: "questiona o requisito", cue: {at: 2.2, word: "um questiona"}},
        {n: "2", text: "apaga", cue: {at: 4.6, word: "dois apaga"}},
        {n: "3", text: "simplifica", cue: {at: 5.9, word: "três simplifica"}},
        {n: "4", text: "acelera", cue: {at: 7.6, word: "quatro acelera"}},
        {n: "5", text: "automatiza", cue: {at: 8.9, word: "cinco"}},
      ],
      stamp: "por último",
    },
    cues: {
      title: {at: 0},
      stamp: {at: 9.6, word: "automatiza"},
    },
  },
  {
    id: "governo",
    durationSec: 7,
    narration: "só que eu sou servidor público. no governo não dá pra sair apagando etapa. tem norma, tem controle, tem prestação de contas.",
    screen: {
      line1: "só que eu sou servidor público",
      line2: "no governo não dá pra sair apagando etapa",
      chips: [
        {text: "norma", cue: {at: 4.2, word: "norma"}},
        {text: "controle", cue: {at: 4.9, word: "controle"}},
        {text: "prestação de contas", cue: {at: 5.6, word: "prestação"}},
      ],
    },
    cues: {
      line1: {at: 0},
      line2: {at: 1.7, word: "no governo"},
    },
  },
  {
    id: "teste",
    durationSec: 8,
    narration: "então eu adaptei o teste. pra cada etapa, duas perguntas: se eu apagar, o que quebra? e isso tem base em alguma norma, ou é só costume?",
    screen: {
      title: "então eu adaptei o teste",
      cards: [
        {label: "pergunta 1", text: "se eu apagar, o que quebra?", cue: {at: 2.8, word: "se eu apagar"}},
        {label: "pergunta 2", text: "tem base normativa ou é só costume?", cue: {at: 5.0, word: "isso tem base"}},
      ],
    },
    cues: {
      title: {at: 0},
    },
  },
  {
    id: "decisao",
    durationSec: 8,
    narration: "não quebra nada e é só costume? apaga. não quebra nada mas tem norma? propõe mudar a norma. o resto, simplifica. e só depois automatiza.",
    screen: {
      rows: [
        {
          condition: ["nada quebra", "só costume"],
          cue: {at: 0.1, word: "não quebra nada"},
          chips: [{text: "apaga", color: "red", cue: {at: 1.5, word: "apaga"}}],
        },
        {
          condition: ["nada quebra", "tem norma"],
          cue: {at: 2.4, word: "mas tem norma"},
          chips: [{text: "propõe mudar a norma", color: "amber", cue: {at: 3.6, word: "propõe"}}],
        },
        {
          condition: ["quebra algo"],
          cue: {at: 5.2, word: "o resto"},
          chips: [
            {text: "simplifica", color: "yellow", cue: {at: 5.8, word: "simplifica"}},
            {text: "automatiza", color: "green", cue: {at: 6.8, word: "automatiza"}},
          ],
        },
      ],
    },
    cues: {},
  },
  {
    id: "planilha",
    durationSec: 7,
    narration: "tô passando todas as minhas atividades por essa planilha. comenta planilha que eu te mando o modelo.",
    screen: {
      columns: ["atividade", "o que quebra?", "base normativa?", "decisão"],
      rows: [
        {activity: "relatório que ninguém lê", breaks: "nada", basis: "costume", decision: "eliminar", color: "red"},
        {activity: "formulário exigido em manual", breaks: "nada", basis: "sim", decision: "propor mudança na norma", color: "amber"},
        {activity: "conferência em três planilhas", breaks: "retrabalho", basis: "sim", decision: "simplificar primeiro", color: "yellow"},
        {activity: "relatório mensal de obra", breaks: "perda de controle", basis: "sim", decision: "automatizar", color: "green"},
      ],
      // o texto entre {chaves} fica em amarelo
      cta: "comenta {PLANILHA} que eu te mando o modelo",
      handle: "@epertiosaas",
    },
    cues: {
      sheet: {at: 0},
      rowsStart: {at: 0.4},
      cta: {at: 3.3, word: "comenta"},
    },
  },
] as const;

export type Scene = (typeof scenes)[number];
export type SceneId = Scene["id"];
export type ChipColor = "red" | "amber" | "yellow" | "green";

export const getScene = <T extends SceneId>(id: T) =>
  scenes.find((s) => s.id === id) as Extract<Scene, {id: T}>;
