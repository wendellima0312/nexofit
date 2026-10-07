import assert from "node:assert/strict";
import test from "node:test";

const patterns = ["agachar", "empurrar", "puxar", "dobrar-quadril", "core", "unilateral", "acessorio"];
const equipment = ["halteres", "peso corporal", "maquina", "elastico", "barra", "cabo"];
const muscles = ["Peitoral", "Costas", "Quadriceps", "Posterior", "Ombros", "Biceps", "Triceps", "Core", "Gluteos", "Panturrilhas"];

function catalog() {
  return muscles.flatMap((muscle, groupIndex) =>
    Array.from({ length: 4 }, (_, baseIndex) =>
      equipment.map((item) => ({
        id: `${muscle}-${baseIndex}-${item}`.toLowerCase(),
        muscle,
        pattern: patterns[(groupIndex + baseIndex) % patterns.length],
        equipment: item,
        location: item === "peso corporal" ? "casa" : item === "halteres" || item === "elastico" ? "ambos" : "academia",
      })),
    ).flat(),
  );
}

function generate(profile) {
  if (!profile.adult || profile.safetyBlock) return { blocked: true, days: [] };
  const pool = catalog().filter((exercise) => profile.equipment.includes(exercise.equipment) && !profile.avoid.includes(exercise.id));
  return {
    blocked: false,
    days: Array.from({ length: profile.days }, (_, day) => ({
      exercises: patterns.slice(day, day + 5).map((pattern) => pool.find((exercise) => exercise.pattern === pattern)).filter(Boolean),
    })),
  };
}

test("catalogo inicial tem pelo menos 100 exercicios e equipamentos variados", () => {
  const items = catalog();
  assert.ok(items.length >= 100);
  assert.ok(new Set(items.map((item) => item.equipment)).size >= 6);
});

test("adulto conclui perfil e recebe plano respeitando dias/equipamentos", () => {
  const plan = generate({ adult: true, safetyBlock: false, days: 3, equipment: ["halteres", "peso corporal", "elastico"], avoid: [] });
  assert.equal(plan.blocked, false);
  assert.equal(plan.days.length, 3);
  assert.ok(plan.days.every((day) => day.exercises.every((exercise) => ["halteres", "peso corporal", "elastico"].includes(exercise.equipment))));
});

test("fluxo de seguranca bloqueia plano padrao", () => {
  const plan = generate({ adult: false, safetyBlock: false, days: 3, equipment, avoid: [] });
  assert.equal(plan.blocked, true);
  assert.equal(plan.days.length, 0);
});

test("exclusoes sao respeitadas na montagem", () => {
  const first = catalog()[0];
  const plan = generate({ adult: true, safetyBlock: false, days: 2, equipment, avoid: [first.id] });
  assert.ok(plan.days.every((day) => day.exercises.every((exercise) => exercise.id !== first.id)));
});
