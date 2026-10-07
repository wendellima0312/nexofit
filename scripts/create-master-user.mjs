import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.MASTER_EMAIL ?? "wendellima0312@gmail.com";
const password = process.env.MASTER_PASSWORD;
const name = process.env.MASTER_NAME ?? "Wendel Carlos";

if (!url || !secret || !password) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e MASTER_PASSWORD no ambiente.");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: name },
  app_metadata: { role: "master" },
});

let user = created.user;

if (createError && createError.message.toLowerCase().includes("already")) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  user = list.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw createError;
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
    app_metadata: { ...user.app_metadata, role: "master" },
  });
  if (updateError) throw updateError;
  user = { ...user, app_metadata: { ...user.app_metadata, role: "master" } };
} else if (createError) {
  throw createError;
}

if (!user) throw new Error("Usuario MASTER nao foi criado ou encontrado.");

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  display_name: name,
  email,
  consent_version: "2026.10.07",
  health_consent_at: new Date().toISOString(),
});
if (profileError) throw new Error(`Auth criado, mas o perfil MASTER nao foi gravado: ${profileError.message}`);

const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: user.id, role: "master" });
if (roleError) throw new Error(`Perfil criado, mas o papel MASTER nao foi gravado: ${roleError.message}`);
const { error: pointsError } = await supabase.from("user_points").upsert({ user_id: user.id, points: 0, level: 1 });
if (pointsError) throw new Error(`Papel MASTER criado, mas a pontuacao inicial nao foi gravada: ${pointsError.message}`);

console.log(`MASTER pronto: ${name} <${email}> (${user.id})`);
