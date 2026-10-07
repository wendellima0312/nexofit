"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dumbbell, History, LogOut, Settings, UserRound } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { href: "/dashboard", label: "Painel", icon: BarChart3 },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/historico", label: "Historico", icon: History },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export function AppShell({ children, userName = "atleta" }: { children: React.ReactNode; userName?: string }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f7f2] text-slate-950 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#f5f7f2]/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/nexofit-favicon.png" alt="" className="size-10 rounded-lg bg-neutral-950 object-contain p-1" />
            <span>
              <strong className="block leading-tight">NexoFit</strong>
              <small className="block text-xs text-slate-500 dark:text-neutral-400">Olá, {userName}</small>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/perfil" className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" aria-label="Perfil">
              <Settings size={18} />
            </Link>
            <form action={signOut}>
              <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-red-600 dark:border-neutral-700 dark:bg-neutral-900" aria-label="Sair">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 dark:border-neutral-800 dark:bg-neutral-900">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold ${active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-neutral-400"}`}>
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
