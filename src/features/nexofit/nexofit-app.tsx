"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Activity, AlertTriangle, BarChart3, Bell, Bot, Camera, CheckCircle2, Droplets, Dumbbell, Medal, MessageCircle, Moon, Play, RotateCcw, ShieldCheck, Timer, Trophy, UserRound, UsersRound } from "lucide-react";
import { exercises } from "@/lib/nexofit/catalog";
import { aiCoachSystemPrompt } from "@/lib/nexofit/ai-coach";
import { findSubstitutes, generateWorkoutPlan, shouldSuggestProgression, type ProfileInput, type WorkoutPlan } from "@/lib/nexofit/generator";

const defaultProfile: ProfileInput = {
  name: "",
  adult: true,
  safetyBlock: false,
  goal: "hipertrofia",
  experience: "iniciante",
  daysPerWeek: 3,
  sessionMinutes: 50,
  location: "ambos",
  equipment: ["halteres", "peso corporal", "elastico", "maquina", "cabo", "barra"],
  avoidExerciseIds: [],
};

type Log = {
  exerciseId: string;
  reps: number;
  load: number;
  rirOk: boolean;
  pain: boolean;
  techniqueOk: boolean;
};

type Post = {
  id: string;
  author: string;
  text: string;
  image?: string;
  createdAt: string;
  likes: number;
};

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

type Reminder = {
  id: string;
  type: "treino" | "agua" | "mobilidade" | "recuperacao" | "personalizado";
  title: string;
  time: string;
  days: string[];
  enabled: boolean;
};

const tabs: { id: "hoje" | "treino" | "catalogo" | "progresso" | "lembretes" | "social" | "ia" | "perfil"; icon: typeof Activity; label: string }[] = [
  { id: "hoje", icon: Activity, label: "Hoje" },
  { id: "treino", icon: Dumbbell, label: "Treino" },
  { id: "catalogo", icon: Play, label: "Guia" },
  { id: "progresso", icon: BarChart3, label: "Progresso" },
  { id: "lembretes", icon: Bell, label: "Lembretes" },
  { id: "social", icon: UsersRound, label: "Feed" },
  { id: "ia", icon: Bot, label: "IA" },
  { id: "perfil", icon: UserRound, label: "Perfil" },
];

const defaultReminders: Reminder[] = [
  { id: "treino-padrao", type: "treino", title: "Treino do dia", time: "07:00", days: ["seg", "qua", "sex"], enabled: true },
  { id: "agua-manha", type: "agua", title: "Beber agua", time: "10:00", days: ["seg", "ter", "qua", "qui", "sex"], enabled: true },
  { id: "mobilidade", type: "mobilidade", title: "Mobilidade leve", time: "18:30", days: ["ter", "qui"], enabled: false },
  { id: "sono", type: "recuperacao", title: "Preparar sono e recuperacao", time: "22:00", days: ["dom", "seg", "ter", "qua", "qui"], enabled: false },
];

const equipmentOptions = ["peso corporal", "halteres", "elastico", "barra", "cabo", "maquina"];

function saveLocal(profile: ProfileInput, logs: Log[]) {
  localStorage.setItem("nexofit-profile", JSON.stringify(profile));
  localStorage.setItem("nexofit-logs", JSON.stringify(logs));
}

function loadLocal() {
  if (typeof window === "undefined") return { profile: defaultProfile, logs: [] as Log[] };
  try {
    return {
      profile: { ...defaultProfile, ...JSON.parse(localStorage.getItem("nexofit-profile") ?? "{}") },
      logs: JSON.parse(localStorage.getItem("nexofit-logs") ?? "[]") as Log[],
    };
  } catch {
    return { profile: defaultProfile, logs: [] as Log[] };
  }
}

export function NexoFitApp() {
  const initial = loadLocal();
  const [profile, setProfile] = useState<ProfileInput>(initial.profile);
  const [logs, setLogs] = useState<Log[]>(initial.logs);
  const [posts, setPosts] = useState<Post[]>(() => (typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem("nexofit-posts") ?? "[]")));
  const [reminders, setReminders] = useState<Reminder[]>(() => (typeof window === "undefined" ? defaultReminders : JSON.parse(localStorage.getItem("nexofit-reminders") ?? JSON.stringify(defaultReminders))));
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: "assistant", content: "Oi! Sou o treinador NexoFit. Vou adaptar minhas respostas ao seu nome, rotina, experiencia e feedback, sempre sem substituir acompanhamento medico ou avaliacao presencial." },
  ]);
  const [activeTab, setActiveTab] = useState<"hoje" | "treino" | "catalogo" | "progresso" | "lembretes" | "social" | "ia" | "perfil">("hoje");
  const [activeExercise, setActiveExercise] = useState(exercises[0].id);
  const plan = useMemo<WorkoutPlan>(() => generateWorkoutPlan(profile), [profile]);
  const currentDay = plan.days[0];
  const volume = logs.reduce((sum, log) => sum + log.load * log.reps, 0);

  function updateProfile(next: ProfileInput) {
    setProfile(next);
    saveLocal(next, logs);
  }

  function addLog(log: Log) {
    const next = [...logs, log];
    setLogs(next);
    saveLocal(profile, next);
  }

  function addPost(post: Post) {
    const next = [post, ...posts];
    setPosts(next);
    localStorage.setItem("nexofit-posts", JSON.stringify(next));
  }

  function updateReminders(next: Reminder[]) {
    setReminders(next);
    localStorage.setItem("nexofit-reminders", JSON.stringify(next));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="grid gap-4 rounded-lg bg-[#103b2d] p-5 text-white shadow-sm md:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src="/nexofit-logo.png" alt="NexoFit" className="h-12 max-w-64 object-contain" />
            <div>
              <p className="text-sm text-emerald-100">NexoFit</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Treino seguro, claro e ajustavel.</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-emerald-50">
            Organizador de musculacao e educacao fisica. Nao substitui avaliacao profissional, diagnostico, tratamento ou reabilitacao.
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Metric label="Catalogo" value={`${exercises.length}+ exercicios`} />
            <Metric label="Semana" value={`${profile.daysPerWeek} dias`} />
            <Metric label="Sessao" value={`${profile.sessionMinutes} min`} />
          </div>
        </div>
        <div className="rounded-lg bg-white/10 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} /> Limites de seguranca</p>
          <p className="text-sm leading-6 text-emerald-50">
            Se houver dor aguda, tontura, falta de ar incomum, dor no peito ou mal-estar importante, interrompa o treino e busque orientacao apropriada.
          </p>
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold dark:border-neutral-800 dark:bg-neutral-900 sm:grid-cols-8">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 ${activeTab === id ? "bg-emerald-700 text-white" : "text-slate-600 dark:text-neutral-300"}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {plan.safetyBlocked ? (
        <SafetyPanel explanation={plan.explanation} />
      ) : activeTab === "hoje" ? (
        <TodayPanel plan={plan} profile={profile} logs={logs} setActiveTab={setActiveTab} />
      ) : activeTab === "treino" && currentDay ? (
        <WorkoutPanel day={currentDay} addLog={addLog} profile={profile} setActiveExercise={setActiveExercise} setActiveTab={setActiveTab} />
      ) : activeTab === "catalogo" ? (
        <CatalogPanel activeExercise={activeExercise} setActiveExercise={setActiveExercise} profile={profile} />
      ) : activeTab === "progresso" ? (
        <ProgressPanel logs={logs} volume={volume} />
      ) : activeTab === "lembretes" ? (
        <RemindersPanel reminders={reminders} updateReminders={updateReminders} />
      ) : activeTab === "social" ? (
        <SocialPanel profile={profile} posts={posts} addPost={addPost} />
      ) : activeTab === "ia" ? (
        <AiCoachPanel profile={profile} messages={aiMessages} setMessages={setAiMessages} />
      ) : (
        <ProfilePanel profile={profile} updateProfile={updateProfile} />
      )}
    </div>
  );
}

function RemindersPanel({ reminders, updateReminders }: { reminders: Reminder[]; updateReminders: (reminders: Reminder[]) => void }) {
  const days = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const icons = {
    treino: Dumbbell,
    agua: Droplets,
    mobilidade: Activity,
    recuperacao: Moon,
    personalizado: Bell,
  };

  function patchReminder(id: string, patch: Partial<Reminder>) {
    updateReminders(reminders.map((reminder) => (reminder.id === id ? { ...reminder, ...patch } : reminder)));
  }

  function addReminder() {
    updateReminders([
      {
        id: crypto.randomUUID(),
        type: "personalizado",
        title: "Novo lembrete fitness",
        time: "08:00",
        days: ["seg", "qua", "sex"],
        enabled: true,
      },
      ...reminders,
    ]);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><Bell size={20} /> Lembretes fitness</h2>
            <p className="mt-1 text-sm text-slate-500">Configure avisos de treino, agua, mobilidade e recuperacao sem mensagens de culpa.</p>
          </div>
          <button onClick={addReminder} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Novo lembrete</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {reminders.map((reminder) => {
          const Icon = icons[reminder.type];
          return (
            <article key={reminder.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><Icon size={19} /></span>
                  <div>
                    <input value={reminder.title} onChange={(event) => patchReminder(reminder.id, { title: event.target.value })} className="w-full bg-transparent font-bold outline-none" />
                    <p className="text-xs text-slate-500">{reminder.type}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={reminder.enabled} onChange={(event) => patchReminder(reminder.id, { enabled: event.target.checked })} className="size-5" />
                  Ativo
                </label>
              </div>
              <label className="mt-4 block text-sm font-semibold">Horario<input type="time" value={reminder.time} onChange={(event) => patchReminder(reminder.id, { time: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700" /></label>
              <div className="mt-4 flex flex-wrap gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => patchReminder(reminder.id, { days: reminder.days.includes(day) ? reminder.days.filter((item) => item !== day) : [...reminder.days, day] })}
                    className={`rounded-full px-3 py-2 text-xs font-bold uppercase ${reminder.days.includes(day) ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500 dark:bg-neutral-800"}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button onClick={() => updateReminders(reminders.filter((item) => item.id !== reminder.id))} className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Remover</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-emerald-100">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function SafetyPanel({ explanation }: { explanation: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} /> Plano bloqueado com seguranca</h2>
      <p className="leading-7">{explanation}</p>
    </section>
  );
}

function TodayPanel({ plan, profile, logs, setActiveTab }: { plan: WorkoutPlan; profile: ProfileInput; logs: Log[]; setActiveTab: (tab: "treino" | "perfil") => void }) {
  const next = plan.days[0];
  return (
    <section className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-slate-500 dark:text-neutral-400">Recomendado para hoje</p>
        <h2 className="mt-1 text-2xl font-bold">{next?.title ?? "Configure seu perfil"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">{plan.explanation}</p>
        <div className="mt-4 grid gap-2">
          {next?.prescriptions.slice(0, 5).map((item) => (
            <div key={item.exercise.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-neutral-800">
              <div>
                <p className="font-semibold">{item.exercise.name}</p>
                <p className="text-sm text-slate-500">{item.sets}x {item.reps} · {item.targetRir}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{item.exercise.primaryMuscle}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setActiveTab("treino")} className="mt-5 min-h-12 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white">Iniciar treino</button>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="font-bold">Consistencia sem julgamento</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">{logs.length} series registradas. Dias de descanso tambem fazem parte do plano.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="font-bold">Perfil usado</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">{profile.experience}, objetivo {profile.goal}, {profile.location}, {profile.daysPerWeek} dias.</p>
          <button onClick={() => setActiveTab("perfil")} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-neutral-700">Editar</button>
        </div>
      </div>
    </section>
  );
}

function WorkoutPanel({ day, addLog, profile, setActiveExercise, setActiveTab }: { day: WorkoutPlan["days"][number]; addLog: (log: Log) => void; profile: ProfileInput; setActiveExercise: (id: string) => void; setActiveTab: (tab: "catalogo") => void }) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-xl font-bold">{day.title}</h2>
        <p className="text-sm text-slate-500">Foco: {day.focus}. Use instrucoes antes da serie e mantenha controles simples durante o movimento.</p>
      </div>
      {day.prescriptions.map((item) => {
        const substitutes = findSubstitutes(item.exercise.id, profile);
        return (
          <article key={item.exercise.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{item.role}</p>
                <h3 className="text-lg font-bold">{item.exercise.name}</h3>
                <p className="text-sm text-slate-500">{item.sets} series · {item.reps} reps · descanso {item.restSeconds}s · {item.targetRir}</p>
              </div>
              <button
                onClick={() => {
                  setActiveExercise(item.exercise.id);
                  setActiveTab("catalogo");
                }}
                className="grid size-11 place-items-center rounded-lg border border-slate-200 dark:border-neutral-700"
                aria-label={`Ver demonstracao de ${item.exercise.name}`}
              >
                <Play size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-neutral-300">{item.notes}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {substitutes.slice(0, 3).map((sub) => (
                <span key={sub.id} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-neutral-800">Sub: {sub.name}</span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[1, 2, 3].map((set) => (
                <button key={set} onClick={() => addLog({ exerciseId: item.exercise.id, reps: Number(item.reps.split("-").at(-1)), load: 0, rirOk: true, pain: false, techniqueOk: true })} className="min-h-12 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white">
                  Serie {set} ok
                </button>
              ))}
              <button onClick={() => addLog({ exerciseId: item.exercise.id, reps: 0, load: 0, rirOk: false, pain: true, techniqueOk: false })} className="min-h-12 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700">
                Dor/desconforto
              </button>
              <button className="min-h-12 rounded-lg border border-slate-200 px-3 text-sm font-semibold dark:border-neutral-700"><Timer size={16} className="inline" /> descanso</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CatalogPanel({ activeExercise, setActiveExercise, profile }: { activeExercise: string; setActiveExercise: (id: string) => void; profile: ProfileInput }) {
  const selected = exercises.find((exercise) => exercise.id === activeExercise) ?? exercises[0];
  const list = exercises.filter((exercise) => profile.location === "ambos" || exercise.location === "ambos" || exercise.location === profile.location).slice(0, 36);
  return (
    <section className="grid gap-4 md:grid-cols-[.75fr_1.25fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="px-2 py-2 font-bold">Catalogo inicial</h2>
        <div className="max-h-[560px] space-y-1 overflow-auto">
          {list.map((exercise) => (
            <button key={exercise.id} onClick={() => setActiveExercise(exercise.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${selected.id === exercise.id ? "bg-emerald-700 text-white" : "hover:bg-slate-100 dark:hover:bg-neutral-800"}`}>
              {exercise.name}
              <span className="block text-xs opacity-75">{exercise.primaryMuscle} · {exercise.equipment}</span>
            </button>
          ))}
        </div>
      </div>
      <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <img src={selected.media.url} alt={selected.media.alt} className="mb-4 aspect-video w-full rounded-lg bg-slate-100 object-contain p-4 dark:bg-neutral-800" />
        <h2 className="text-2xl font-bold">{selected.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{selected.primaryMuscle} · {selected.movementPattern} · {selected.equipment}</p>
        <ol className="mt-4 space-y-2 text-sm leading-6">
          {selected.steps.map((step) => <li key={step} className="rounded-lg bg-slate-50 p-3 dark:bg-neutral-800">{step}</li>)}
        </ol>
        <p className="mt-4 text-sm"><strong>Respiracao:</strong> {selected.breathing}</p>
        <p className="mt-2 text-sm"><strong>Credito:</strong> {selected.media.source}. {selected.media.license}.</p>
      </article>
    </section>
  );
}

function ProgressPanel({ logs, volume }: { logs: Log[]; volume: number }) {
  const progression = shouldSuggestProgression(logs.slice(-3).map((log) => ({ reps: log.reps, targetMax: 12, rirOk: log.rirOk, pain: log.pain, techniqueOk: log.techniqueOk })));
  const points = logs.length * 12 + Math.floor(volume / 100);
  const level = Math.max(1, Math.floor(points / 250) + 1);
  const achievements = [
    { name: "Primeiro registro", unlocked: logs.length >= 1 },
    { name: "Consistencia inicial", unlocked: logs.length >= 6 },
    { name: "Volume consciente", unlocked: volume >= 500 },
    { name: "Tecnica antes de carga", unlocked: logs.some((log) => !log.techniqueOk || log.pain) },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-slate-500">Series</p>
        <p className="text-3xl font-bold">{logs.length}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-sm text-slate-500"><Trophy size={16} /> Pontos e nivel</p>
        <p className="text-3xl font-bold">{points} pts</p>
        <p className="text-sm text-slate-500">Nivel {level}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-slate-500">Volume registrado</p>
        <p className="text-3xl font-bold">{volume} kg</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-slate-500">Progressao</p>
        <p className="mt-2 text-sm">{progression ? "Pode sugerir pequeno aumento confirmado pelo usuario." : "Sem aumento automatico: preserve os registros e priorize tecnica."}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:col-span-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="flex items-center gap-2 font-bold"><Medal size={18} /> Conquistas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {achievements.map((item) => (
            <div key={item.name} className={`rounded-lg p-3 text-sm font-semibold ${item.unlocked ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500 dark:bg-neutral-800"}`}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:col-span-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-bold">Historico</h2>
        <div className="mt-3 space-y-2">
          {logs.length ? logs.slice(-8).reverse().map((log, index) => (
            <p key={`${log.exerciseId}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-neutral-800">
              {exercises.find((exercise) => exercise.id === log.exerciseId)?.name ?? "Exercicio"}: {log.reps} reps, {log.pain ? "com desconforto informado" : "sem dor registrada"}.
            </p>
          )) : <p className="text-sm text-slate-500">Nenhuma serie registrada ainda.</p>}
        </div>
      </div>
    </section>
  );
}

function SocialPanel({ profile, posts, addPost }: { profile: ProfileInput; posts: Post[]; addPost: (post: Post) => void }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();

  return (
    <section className="grid gap-4 md:grid-cols-[.85fr_1.15fr]">
      <form
        className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim() && !image) return;
          addPost({ id: crypto.randomUUID(), author: profile.name || "Atleta NexoFit", text: text.trim(), image, createdAt: new Date().toISOString(), likes: 0 });
          setText("");
          setImage(undefined);
        }}
      >
        <h2 className="flex items-center gap-2 text-xl font-bold"><Camera size={20} /> Feed de treinos</h2>
        <p className="mt-1 text-sm text-slate-500">Poste fotos do treino para pessoas que seguem voce. Evite expor terceiros sem permissao.</p>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Como foi o treino de hoje?" className="mt-4 min-h-28 w-full rounded-lg border border-slate-300 bg-transparent p-3 text-sm dark:border-neutral-700" />
        <input
          type="file"
          accept="image/*"
          className="mt-3 block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setImage(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
        {image ? <img src={image} alt="Previa da foto do treino" className="mt-3 aspect-video w-full rounded-lg object-cover" /> : null}
        <button className="mt-4 min-h-12 w-full rounded-lg bg-emerald-700 font-semibold text-white">Publicar</button>
      </form>
      <div className="space-y-3">
        {posts.length ? posts.map((post) => (
          <article key={post.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-bold">{post.author}</p>
            <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleString("pt-BR")}</p>
            {post.image ? <img src={post.image} alt="Foto publicada do treino" className="mt-3 aspect-video w-full rounded-lg object-cover" /> : null}
            <p className="mt-3 text-sm leading-6">{post.text}</p>
            <button className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold dark:bg-neutral-800">Curtir · {post.likes}</button>
          </article>
        )) : <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-900">Ainda nao ha posts no feed.</p>}
      </div>
    </section>
  );
}

function AiCoachPanel({ profile, messages, setMessages }: { profile: ProfileInput; messages: AiMessage[]; setMessages: Dispatch<SetStateAction<AiMessage[]>> }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function reply() {
    if (!input.trim()) return;
    const userMessage: AiMessage = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: profile.name,
            goal: profile.goal,
            experience: profile.experience,
            daysPerWeek: profile.daysPerWeek,
          },
          messages: nextMessages,
        }),
      });
      const data = await response.json();
      const content =
        response.ok && typeof data.content === "string"
          ? data.content
          : "Nao consegui acessar o agente agora. Confira a chave configurada no servidor e tente novamente.";
      setMessages((current) => [...current, { role: "assistant", content }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Nao consegui conectar ao agente agora. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-4 md:grid-cols-[.85fr_1.15fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Bot size={20} /> Agente NexoFit</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">Especialista virtual em treino de forca e aderencia, com limites claros de seguranca.</p>
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
          A chave de IA fica somente no servidor em <code>OPENROUTER_API_KEY</code>. Nada sensivel e salvo no navegador.
        </p>
        <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-neutral-800">
          <summary className="cursor-pointer font-semibold">Prompt base</summary>
          <p className="mt-2 whitespace-pre-wrap leading-6">{aiCoachSystemPrompt}</p>
        </details>
      </aside>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="max-h-[520px] space-y-3 overflow-auto">
          {messages.map((message, index) => (
            <div key={index} className={`rounded-lg p-3 text-sm leading-6 ${message.role === "assistant" ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-slate-100 dark:bg-neutral-800"}`}>
              <strong>{message.role === "assistant" ? "Treinador" : "Voce"}:</strong> {message.content}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") reply(); }} placeholder="Pergunte sobre seu treino..." className="min-h-12 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700" />
          <button onClick={reply} disabled={pending} className="min-h-12 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-60"><MessageCircle size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function ProfilePanel({ profile, updateProfile }: { profile: ProfileInput; updateProfile: (profile: ProfileInput) => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-xl font-bold">Perfil e preferencias</h2>
      <p className="mt-1 text-sm text-slate-500">Dados minimizados. Genero, peso e medidas sao opcionais e nao determinam carga ou capacidade.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Apelido<input value={profile.name} onChange={(event) => updateProfile({ ...profile, name: event.target.value })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700" /></label>
        <label className="text-sm font-semibold">Objetivo<select value={profile.goal} onChange={(event) => updateProfile({ ...profile, goal: event.target.value as ProfileInput["goal"] })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700"><option value="forca">Forca</option><option value="hipertrofia">Hipertrofia</option><option value="condicionamento">Condicionamento geral</option><option value="saude">Saude e consistencia</option><option value="retorno">Retorno gradual</option></select></label>
        <label className="text-sm font-semibold">Experiencia<select value={profile.experience} onChange={(event) => updateProfile({ ...profile, experience: event.target.value as ProfileInput["experience"] })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700"><option value="iniciante">Iniciante</option><option value="intermediario">Intermediario</option><option value="avancado">Avancado</option><option value="nao_sei">Nao sei</option></select></label>
        <label className="text-sm font-semibold">Local<select value={profile.location} onChange={(event) => updateProfile({ ...profile, location: event.target.value as ProfileInput["location"] })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700"><option value="ambos">Academia e casa</option><option value="academia">Academia</option><option value="casa">Casa</option></select></label>
        <label className="text-sm font-semibold">Dias por semana<input type="number" min={1} max={6} value={profile.daysPerWeek} onChange={(event) => updateProfile({ ...profile, daysPerWeek: Number(event.target.value) })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700" /></label>
        <label className="text-sm font-semibold">Minutos por sessao<input type="number" min={25} max={90} step={5} value={profile.sessionMinutes} onChange={(event) => updateProfile({ ...profile, sessionMinutes: Number(event.target.value) })} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-neutral-700" /></label>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold">Equipamentos</p>
        <div className="flex flex-wrap gap-2">
          {equipmentOptions.map((option) => (
            <button key={option} onClick={() => updateProfile({ ...profile, equipment: profile.equipment.includes(option) ? profile.equipment.filter((item) => item !== option) : [...profile.equipment, option] })} className={`rounded-full px-3 py-2 text-sm font-semibold ${profile.equipment.includes(option) ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-neutral-800"}`}>{option}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-neutral-800">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={profile.adult} onChange={(event) => updateProfile({ ...profile, adult: event.target.checked })} className="mt-1 size-5" /> Confirmo que sou maior de 18 anos.</label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={profile.safetyBlock} onChange={(event) => updateProfile({ ...profile, safetyBlock: event.target.checked })} className="mt-1 size-5" /> Tenho gravidez/pos-parto, lesao atual, dor, cirurgia recente, condicao clinica relevante ou restricao medica.</label>
      </div>
      <button onClick={() => updateProfile({ ...profile })} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 font-semibold text-white"><CheckCircle2 size={18} /> Regenerar plano</button>
      <button onClick={() => updateProfile(defaultProfile)} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 font-semibold dark:border-neutral-700"><RotateCcw size={18} /> Restaurar padrao</button>
    </section>
  );
}
