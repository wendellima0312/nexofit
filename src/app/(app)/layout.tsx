import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let userName = "atleta";
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userName = data.user?.user_metadata?.display_name ?? data.user?.email?.split("@")[0] ?? userName;
  } catch {
    userName = "atleta";
  }

  return <AppShell userName={userName}>{children}</AppShell>;
}
