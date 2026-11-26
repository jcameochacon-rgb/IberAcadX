import { PublicNav } from "./public-nav";
import type { ReactNode } from "react";
import { BookOpen, ShieldCheck, Users, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
export function AuthShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <>
      <PublicNav />
      <main
        className={`auth-layout min-h-screen bg-background lg:grid lg:grid-cols-[1fr_1fr]${compact ? " auth-layout-compact" : ""}`}
      >
        <aside className="auth-art relative hidden overflow-hidden bg-[#122c36] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 top-28 size-[520px] rounded-full border border-white/5" />
          <div className="absolute -right-10 top-52 size-[330px] rounded-full border border-white/5" />
          <Brand dark />
          <div className="relative max-w-md">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-sky-200">
              Primaria comunitaria vocacional
            </p>
            <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight">
              Cada estudiante.
              <br />
              Cada avance.
              <br />
              <span className="text-sky-200">Un mismo lugar.</span>
            </h1>
            <p
              className={`mt-6 max-w-sm text-base leading-7 text-slate-300${compact ? " auth-art-copy" : ""}`}
            >
              Información académica organizada para acompañar el aprendizaje y
              acercar a la escuela con las familias.
            </p>
            <div
              className={`mt-10 space-y-5${compact ? " auth-art-features" : ""}`}
            >
              {[
                [BookOpen, "Calificaciones y asistencia"],
                [Users, "Escuela y familias conectadas"],
                [ShieldCheck, "Acceso según tu rol"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof BookOpen;
                return (
                  <div
                    className="flex items-center gap-3 text-sm text-slate-200"
                    key={String(label)}
                  >
                    <I className="text-sky-200" size={19} />
                    <span>{String(label)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="relative flex items-center gap-2 text-xs text-slate-400">
            U.E. Iberdrola A · Turno tarde <ArrowUpRight size={14} />
          </p>
        </aside>
        <section className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-14">
          <div
            className={`auth-card mx-auto w-full max-w-md${compact ? " auth-card-compact" : ""}`}
          >
            <div
              className={
                compact ? "auth-mobile-brand lg:hidden" : "mb-12 lg:hidden"
              }
            >
              <Brand />
            </div>
            {children}
            <p className="mt-12 text-center text-xs text-muted-foreground">
              Primaria · 14:00 a 18:05 · La Paz, Bolivia
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
