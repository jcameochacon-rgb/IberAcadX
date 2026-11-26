"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  GraduationCap,
  UserRound,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesCombined,
  FileChartColumn,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { logout } from "@/app/actions";
import { roleLabels, roles, type Module } from "@iberdrola/shared";
import type { PanelModel } from "@/lib/data/model";
import {
  sections,
  titles,
  allowedActions,
  actionLabel,
  workspaceHref,
  moduleAt,
  readAction,
  type WorkspaceModule,
} from "@/lib/workspace-navigation";
const icons = {
  usuarios: Users,
  estudiantes: GraduationCap,
  docentes: UserRound,
  tutores: UserRound,
  familias: Users,
  personal: UserRound,
  cursos: BookOpen,
  asignaciones: ClipboardCheck,
  matriculas: UsersRound,
  asignaturas: BookOpen,
  horarios: CalendarDays,
  asistencia: ClipboardCheck,
  calificaciones: ChartNoAxesCombined,
  informes: FileChartColumn,
};
export function PanelShell(props: {
  model: PanelModel;
  current?: Module | "gestion" | "informes";
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    search = useSearchParams();
  return (
    <WorkspaceContent key={`${pathname}?${search.toString()}`} {...props} />
  );
}
function WorkspaceContent({
  model,
  children,
}: {
  model: PanelModel;
  current?: Module | "gestion" | "informes";
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    search = useSearchParams(),
    router = useRouter();
  const active = moduleAt(pathname, search.get("modulo")),
    action = readAction(search.get("accion"));
  const selected = sections.find(
    (s) => active && s.children.includes(active),
  )?.id;
  const [openGroup, setGroup] = useState<string | null>(selected || null),
    [openSub, setSub] = useState<string | null>(active),
    [mobile, setMobile] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null),
    aside = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    aside.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        menuButton.current?.focus();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          aside.current?.querySelectorAll<HTMLElement>(
            "a[href],button,select",
          ) || [],
        ).filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
    };
  }, [mobile]);
  const actions = (module: WorkspaceModule) => (
    <div className="nav-actions">
      {allowedActions(model.role, module).map((a) => (
        <Link
          key={a}
          href={workspaceHref(model.role, module, a, model.demo)}
          aria-current={active === module && action === a ? "page" : undefined}
          onClick={() => setMobile(false)}
        >
          {actionLabel(module, a)}
        </Link>
      ))}
    </div>
  );
  return (
    <div className="workspace-shell">
      {mobile && (
        <button
          className="workspace-overlay"
          aria-label="Cerrar navegación"
          onClick={() => {
            setMobile(false);
            menuButton.current?.focus();
          }}
        />
      )}
      <aside
        ref={aside}
        className={`workspace-sidebar ${mobile ? "is-open" : ""}`}
        aria-label="Menú lateral"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-only icon-button"
            aria-label="Cerrar menú"
            onClick={() => setMobile(false)}
          >
            <X size={21} />
          </button>
        </div>
        <div className="sidebar-caption">MI ESPACIO ACADÉMICO</div>
        <nav aria-label="Módulos académicos">
          <Link
            className={`nav-home ${!active ? "is-active" : ""}`}
            href={model.demo ? `/demo?rol=${model.role}` : "/panel"}
          >
            <LayoutDashboard size={19} />
            Resumen
          </Link>
          {sections
            .filter((s) =>
              s.children.some((m) => allowedActions(model.role, m).length),
            )
            .map((s) => {
              const Icon = icons[s.id],
                expanded = openGroup === s.id;
              return (
                <section key={s.id} className="nav-section">
                  <button
                    className={`nav-main ${selected === s.id ? "is-active" : ""}`}
                    aria-expanded={expanded}
                    aria-controls={`nav-${s.id}`}
                    onClick={() => {
                      setGroup(expanded ? null : s.id);
                      setSub(null);
                    }}
                  >
                    <Icon size={20} />
                    <span>{titles[s.id]}</span>
                    <ChevronDown
                      className={expanded ? "turned" : ""}
                      size={16}
                    />
                  </button>
                  <div id={`nav-${s.id}`} hidden={!expanded}>
                    {s.children.length === 1 ? (
                      actions(s.id)
                    ) : (
                      <div className="nav-branches">
                        {s.children
                          .filter((m) => allowedActions(model.role, m).length)
                          .map((m) => {
                            const Child = icons[m];
                            return (
                              <div key={m}>
                                <button
                                  className="nav-sub"
                                  aria-expanded={openSub === m}
                                  aria-controls={`sub-${m}`}
                                  onClick={() =>
                                    setSub(openSub === m ? null : m)
                                  }
                                >
                                  <Child size={17} />
                                  <span>
                                    {m === "usuarios"
                                      ? "Gestionar usuarios"
                                      : m === "tutores"
                                        ? "Fichas de padres y tutores"
                                        : m === "familias"
                                          ? "Cuentas familiares"
                                          : m === "asignaturas"
                                            ? "Gestionar asignaturas"
                                            : titles[m]}
                                  </span>
                                  <ChevronDown
                                    size={14}
                                    className={openSub === m ? "turned" : ""}
                                  />
                                </button>
                                <div id={`sub-${m}`} hidden={openSub !== m}>
                                  {actions(m)}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
        </nav>
        <div className="sidebar-end">
          <div className="sidebar-term">
            Primaria · Turno tarde
            <span>Gestión {model.year || "por configurar"}</span>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="workspace-account">
            <div className="workspace-profile">
              <span className="profile-avatar">
                {model.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </span>
              <div>
                <strong>{model.name}</strong>
                <small>{roleLabels[model.role]}</small>
              </div>
            </div>
            {model.demo ? (
              <Link className="workspace-logout" href="/login">
                <LogOut size={17} />
                <span>Salir de la demo</span>
              </Link>
            ) : (
              <form action={logout} className="workspace-logout-form">
                <button className="workspace-logout">
                  <LogOut size={17} />
                  <span>Cerrar sesión</span>
                </button>
              </form>
            )}
          </div>
          <div className="workspace-heading">
            <button
              ref={menuButton}
              className="mobile-only icon-button"
              aria-label="Abrir menú"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={23} />
            </button>
            <div>
              <p className="text-sm text-slate-500">
                IberAcad / {active ? "Espacio académico" : "Inicio"}
              </p>
              <p className="mt-1 font-semibold">
                {active ? titles[active] : "Resumen"}
              </p>
            </div>
          </div>
        </header>
        {model.demo && (
          <div className="demo-toolbar">
            <p>Demostración · Datos ficticios, sin acceso a cuentas reales</p>
            <label>
              Ver como
              <select
                value={model.role}
                onChange={(e) => router.push(`/demo?rol=${e.target.value}`)}
              >
                {roles
                  .filter((r) => r !== "PADRE")
                  .map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
