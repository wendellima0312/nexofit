export type Experience = "nao_sei" | "iniciante" | "intermediario" | "avancado";
export type Goal = "forca" | "hipertrofia" | "condicionamento" | "saude" | "retorno";
export type Location = "academia" | "casa" | "ambos";
export type MovementPattern =
  | "empurrar"
  | "puxar"
  | "agachar"
  | "dobrar-quadril"
  | "unilateral"
  | "core"
  | "acessorio";

export type Exercise = {
  id: string;
  name: string;
  alternativeName: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  movementPattern: MovementPattern;
  equipment: string;
  location: Location;
  complexity: "baixa" | "media" | "alta";
  steps: string[];
  startPosition: string;
  phases: string;
  breathing: string;
  commonMistakes: string[];
  tips: string[];
  cautions: string;
  substituteIds: string[];
  media: {
    type: "svg";
    url: string;
    source: string;
    license: string;
    alt: string;
    caption: string;
  };
};

const media = (name: string, pattern: MovementPattern) => ({
  type: "svg" as const,
  url: "/exercise-fallback.svg",
  source: "Ilustracao esquematica original do projeto NexoFit",
  license: "Propria do projeto; uso comercial permitido neste app",
  alt: `Diagrama simples indicando o padrao ${pattern} para ${name}.`,
  caption: "Ilustracao propria. Use como guia geral e leia as instrucoes antes da serie.",
});

const groups = [
  { muscle: "Peitoral", pattern: "empurrar" as const, base: ["supino", "flexao", "crucifixo", "mergulho"], secondary: ["triceps", "deltoides"] },
  { muscle: "Costas", pattern: "puxar" as const, base: ["remada", "puxada", "barra assistida", "pullover"], secondary: ["biceps", "posterior de ombro"] },
  { muscle: "Quadriceps", pattern: "agachar" as const, base: ["agachamento", "leg press", "afundo", "step-up"], secondary: ["gluteos", "core"] },
  { muscle: "Posterior de coxa", pattern: "dobrar-quadril" as const, base: ["levantamento romeno", "mesa flexora", "ponte de gluteos", "bom dia"], secondary: ["gluteos", "lombar"] },
  { muscle: "Ombros", pattern: "empurrar" as const, base: ["desenvolvimento", "elevacao lateral", "elevacao frontal", "face pull"], secondary: ["trapezio", "core"] },
  { muscle: "Biceps", pattern: "acessorio" as const, base: ["rosca direta", "rosca alternada", "rosca martelo", "rosca inclinada"], secondary: ["antebraco"] },
  { muscle: "Triceps", pattern: "acessorio" as const, base: ["triceps corda", "triceps testa", "triceps banco", "extensao acima da cabeca"], secondary: ["ombros"] },
  { muscle: "Core", pattern: "core" as const, base: ["prancha", "dead bug", "abdominal reverso", "pallof press"], secondary: ["estabilizadores"] },
  { muscle: "Gluteos", pattern: "unilateral" as const, base: ["elevacao pelvica", "abducao de quadril", "passada", "coice"], secondary: ["posterior de coxa", "core"] },
  { muscle: "Panturrilhas", pattern: "acessorio" as const, base: ["panturrilha em pe", "panturrilha sentado", "panturrilha unilateral", "saltito controlado"], secondary: ["tornozelos"] },
];

const variants = [
  { suffix: "com halteres", equipment: "halteres", location: "ambos" as const, complexity: "media" as const },
  { suffix: "com peso corporal", equipment: "peso corporal", location: "casa" as const, complexity: "baixa" as const },
  { suffix: "na maquina", equipment: "maquina", location: "academia" as const, complexity: "baixa" as const },
  { suffix: "com elastico", equipment: "elastico", location: "ambos" as const, complexity: "baixa" as const },
  { suffix: "com barra", equipment: "barra", location: "academia" as const, complexity: "alta" as const },
  { suffix: "no cabo", equipment: "cabo", location: "academia" as const, complexity: "media" as const },
];

function slug(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const exercises: Exercise[] = groups.flatMap((group) =>
  group.base.flatMap((base) =>
    variants.map((variant) => {
      const name = `${base} ${variant.suffix}`;
      return {
        id: slug(name),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        alternativeName: base.charAt(0).toUpperCase() + base.slice(1),
        primaryMuscle: group.muscle,
        secondaryMuscles: group.secondary,
        movementPattern: group.pattern,
        equipment: variant.equipment,
        location: variant.location,
        complexity: variant.complexity,
        steps: [
          "Prepare o equipamento e confira se ha espaco livre ao redor.",
          "Assuma a posicao inicial com controle, coluna neutra e respiracao calma.",
          "Execute a fase principal sem impulso, mantendo a amplitude confortavel.",
          "Retorne devagar, pare se houver dor e registre como a serie se sentiu.",
        ],
        startPosition: `Posicione-se para ${base} usando ${variant.equipment}, com apoios firmes e movimento sob controle.`,
        phases: "Fase de preparacao, fase principal com controle e retorno lento ate a posicao inicial.",
        breathing: "Inspire antes da fase mais dificil e solte o ar durante o esforco, sem prender a respiracao por tempo excessivo.",
        commonMistakes: ["Usar impulso", "Perder controle da amplitude", "Ignorar dor ou desconforto agudo"],
        tips: ["Comece leve", "Mantenha uma margem de 1 a 3 repeticoes em reserva", "Priorize tecnica antes de carga"],
        cautions: "Evite se gerar dor aguda, tontura, falta de ar incomum, dor no peito ou mal-estar importante.",
        substituteIds: [],
        media: media(name, group.pattern),
      } satisfies Exercise;
    }),
  ),
);

const byPattern = new Map<MovementPattern, Exercise[]>();
for (const exercise of exercises) {
  byPattern.set(exercise.movementPattern, [...(byPattern.get(exercise.movementPattern) ?? []), exercise]);
}

for (const exercise of exercises) {
  exercise.substituteIds = (byPattern.get(exercise.movementPattern) ?? [])
    .filter((candidate) => candidate.id !== exercise.id)
    .slice(0, 4)
    .map((candidate) => candidate.id);
}

export const catalogVersion = "2026.10.07-nexofit-initial";
