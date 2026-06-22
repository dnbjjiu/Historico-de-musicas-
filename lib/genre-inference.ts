export type GenreInferenceInput = {
  title: string;
  channelTitle: string;
  categoryId?: string | null;
};

const genreRules = [
  {
    name: "Outros",
    color: "#71717a",
    patterns: [
      "hostinger",
      "google ai studio",
      "tutorial",
      "review",
      "unboxing",
      "curso",
      "aula",
      "podcast",
      "entrevista",
      "documentary",
      "documentário",
      "documentario",
      "gameplay",
      "trailer",
      "comparativo",
      "comparison"
    ]
  },
  {
    name: "Gospel",
    color: "#a78bfa",
    patterns: [
      "gospel",
      "louvor",
      "adoração",
      "adoracao",
      "worship",
      "preto no branco",
      "gabriela rocha",
      "isadora pompeo"
    ]
  },
  {
    name: "Forró",
    color: "#f59e0b",
    patterns: ["forró", "forro", "piseiro", "xote", "vaquejada", "joão gomes", "joao gomes"]
  },
  {
    name: "Sertanejo",
    color: "#fb923c",
    patterns: [
      "sertanejo",
      "modão",
      "modao",
      "ao vivo em goiânia",
      "ze neto",
      "cristiano",
      "jorge e mateus",
      "marília mendonça",
      "marilia mendonca",
      "gusttavo lima",
      "henrique e juliano",
      "maiara",
      "maraisa"
    ]
  },
  {
    name: "Rap",
    color: "#60a5fa",
    patterns: [
      "rap",
      "trap",
      "hip hop",
      "froid",
      "matue",
      "matuê",
      "bk'",
      "emicida",
      "racionais",
      "sidoka",
      "veigh",
      "teto",
      "wiu",
      "djonga"
    ]
  },
  {
    name: "Funk",
    color: "#f472b6",
    patterns: ["funk", "mc ", "mc-", "dj ", "mandelão", "mandelao", "phonk br"]
  },
  {
    name: "Pagode",
    color: "#34d399",
    patterns: [
      "pagode",
      "samba",
      "grupo menos é mais",
      "menos e mais",
      "thiaguinho",
      "pericles",
      "péricles",
      "ferrugem",
      "sorriso maroto"
    ]
  },
  {
    name: "Eletrônica",
    color: "#22d3ee",
    patterns: [
      "electronic",
      "eletrônica",
      "eletronica",
      "edm",
      "house",
      "techno",
      "remix",
      "slowed",
      "nightcore",
      "daft punk",
      "avicii",
      "alok",
      "calvin harris",
      "marshmello"
    ]
  },
  {
    name: "Rock",
    color: "#f87171",
    patterns: [
      "rock",
      "metal",
      "punk",
      "linkin park",
      "nirvana",
      "queen",
      "system of a down",
      "guns n",
      "ac/dc",
      "arctic monkeys"
    ]
  },
  {
    name: "MPB",
    color: "#84cc16",
    patterns: [
      "mpb",
      "caetano",
      "gilberto gil",
      "chico buarque",
      "djavan",
      "ana carolina",
      "marisa monte",
      "milton nascimento",
      "tribalistas"
    ]
  },
  {
    name: "Pop",
    color: "#c6ff34",
    patterns: [
      "pop",
      "official video",
      "official music video",
      "lyrics",
      "lyric video",
      "taylor swift",
      "ariana grande",
      "billie eilish",
      "the weeknd",
      "bruno mars",
      "dua lipa"
    ]
  }
];

export const defaultGenres = genreRules.map(({ name, color }) => ({ name, color }));

export function inferGenre(input: GenreInferenceInput): { name: string; color: string } {
  const haystack = normalize(`${input.title} ${input.channelTitle}`);

  for (const rule of genreRules) {
    if (rule.patterns.some((pattern) => haystack.includes(normalize(pattern)))) {
      return { name: rule.name, color: rule.color };
    }
  }

  if (input.categoryId && input.categoryId !== "10") {
    return { name: "Outros", color: "#71717a" };
  }

  return { name: "Pop", color: "#c6ff34" };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
