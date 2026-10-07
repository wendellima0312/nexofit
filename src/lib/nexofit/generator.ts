import { exercises, type Exercise, type Experience, type Goal, type Location, type MovementPattern } from "./catalog";

export type ProfileInput = {
  name: string;
  adult: boolean;
  safetyBlock: boolean;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  location: Location;
  equipment: string[];
  avoidExerciseIds: string[];
};

export type Prescription = {
  exercise: Exercise;
  role: "aquecimento" | "principal" | "acessorio";
  sets: number;
  reps: string;
  restSeconds: number;
  targetRir: string;
  notes: string;
};

export type WorkoutDay = {
  id: string;
  title: string;
  focus: string;
  prescriptions: Prescription[];
};

export type WorkoutPlan = {
  safetyBlocked: boolean;
  explanation: string;
  days: WorkoutDay[];
};

const patterns: MovementPattern[] = ["agachar", "empurrar", "puxar", "dobrar-quadril", "core", "unilateral", "acessorio"];

function allowedByLocation(profile: ProfileInput, exercise: Exercise) {
  return profile.location === "ambos" || exercise.location === "ambos" || exercise.location === profile.location;
}

function allowedByEquipment(profile: ProfileInput, exercise: Exercise) {
  if (exercise.equipment === "peso corporal") return true;
  if (!profile.equipment.length) return exercise.equipment === "peso corporal";
  return profile.equipment.includes(exercise.equipment);
}

function exerciseCount(profile: ProfileInput) {
  const base = profile.sessionMinutes < 40 ? 4 : profile.sessionMinutes < 60 ? 5 : 6;
  if (profile.experience === "avancado" && profile.goal !== "retorno") return Math.min(base + 1, 7);
  if (profile.experience === "iniciante" || profile.experience === "nao_sei" || profile.goal === "retorno") return Math.max(base - 1, 3);
  return base;
}

function prescription(profile: ProfileInput, exercise: Exercise, index: number): Prescription {
  const beginner = profile.experience === "iniciante" || profile.experience === "nao_sei" || profile.goal === "retorno";
  const strength = profile.goal === "forca";
  const role = index === 0 ? "principal" : index === 1 && beginner ? "principal" : "acessorio";
  return {
    exercise,
    role,
    sets: role === "principal" ? (beginner ? 2 : strength ? 4 : 3) : beginner ? 2 : 3,
    reps: strength && role === "principal" ? "4-6" : profile.goal === "condicionamento" ? "10-15" : "8-12",
    restSeconds: strength && role === "principal" ? 150 : profile.goal === "condicionamento" ? 60 : 90,
    targetRir: beginner ? "2-4 RIR" : strength ? "1-3 RIR" : "1-2 RIR",
    notes: beginner
      ? "Escolha carga conservadora e pare com tecnica boa, sem buscar falha."
      : "Aumente carga apenas quando completar a faixa alta com tecnica e esforco dentro da meta.",
  };
}

export function generateWorkoutPlan(profile: ProfileInput): WorkoutPlan {
  if (!profile.adult || profile.safetyBlock) {
    return {
      safetyBlocked: true,
      explanation:
        "Por seguranca, o NexoFit nao gera um plano padrao para menores de 18 anos, gestacao ou pos-parto, dor atual, cirurgia recente, condicao clinica relevante ou restricao medica declarada. Procure acompanhamento profissional antes de iniciar ou modificar treinos.",
      days: [],
    };
  }

  const count = exerciseCount(profile);
  const pool = exercises.filter(
    (exercise) =>
      allowedByLocation(profile, exercise) &&
      allowedByEquipment(profile, exercise) &&
      !profile.avoidExerciseIds.includes(exercise.id),
  );

  const days = Array.from({ length: Math.max(1, Math.min(profile.daysPerWeek, 6)) }, (_, dayIndex) => {
    const selected: Exercise[] = [];
    for (let offset = 0; selected.length < count && offset < patterns.length * 4; offset += 1) {
      const pattern = patterns[(dayIndex + offset) % patterns.length];
      const candidates = pool.filter(
        (exercise) =>
          exercise.movementPattern === pattern &&
          !selected.some((item) => item.primaryMuscle === exercise.primaryMuscle),
      );
      const fallback = pool.filter((exercise) => exercise.movementPattern === pattern);
      const list = candidates.length ? candidates : fallback;
      const candidate = list[(dayIndex + offset) % Math.max(list.length, 1)];
      if (candidate && !selected.some((item) => item.id === candidate.id)) selected.push(candidate);
    }

    return {
      id: `dia-${dayIndex + 1}`,
      title: `Treino ${dayIndex + 1}`,
      focus: selected.slice(0, 3).map((exercise) => exercise.primaryMuscle).join(", "),
      prescriptions: selected.map((exercise, index) => prescription(profile, exercise, index)),
    };
  });

  return {
    safetyBlocked: false,
    explanation:
      "Plano gerado de forma deterministica a partir de dias, duracao, objetivo, experiencia, local, equipamentos e exclusoes. A distribuicao alterna padroes de movimento para reduzir concentracao de volume e preservar progresso gradual.",
    days,
  };
}

export function findSubstitutes(exerciseId: string, profile: ProfileInput) {
  const exercise = exercises.find((item) => item.id === exerciseId);
  if (!exercise) return [];
  return exercise.substituteIds
    .map((id) => exercises.find((item) => item.id === id))
    .filter((item): item is Exercise => Boolean(item))
    .filter((item) => allowedByLocation(profile, item) && allowedByEquipment(profile, item));
}

export function shouldSuggestProgression(history: { reps: number; targetMax: number; rirOk: boolean; pain: boolean; techniqueOk: boolean }[]) {
  if (history.length < 2) return false;
  return history.every((set) => set.reps >= set.targetMax && set.rirOk && !set.pain && set.techniqueOk);
}
