"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
export const publicLinks = [
  ["/institucion", "Institución"],
  ["/vida-escolar", "Vida escolar"],
  ["/trayectoria", "Trayectoria"],
  ["/contacto", "Contacto y ubicación"],
];
export function PublicNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="institution-nav">
      <Link
        href="/"
        className="institution-brand flex items-center gap-3 font-semibold"
        onClick={() => setOpen(false)}
      >
        <Image
          src="/colegio/iberdrola_escudo.jpg"
          width={72}
          height={72}
          alt="Escudo Iberdrola A"
          className="h-[72px] w-[72px] object-contain"
        />
        <span>
          Iberdrola A
          <small className="block font-normal">Unidad Educativa</small>
        </span>
      </Link>
      <button
        type="button"
        className="institution-menu-toggle"
        aria-label={
          open ? "Cerrar menú institucional" : "Abrir menú institucional"
        }
        aria-expanded={open}
        aria-controls="institution-links"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav
        id="institution-links"
        aria-label="Navegación institucional"
        className={`institution-links ${open ? "is-open" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            document
              .querySelector<HTMLButtonElement>(".institution-menu-toggle")
              ?.focus();
          }
        }}
      >
        {publicLinks.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
        <Link
          className="portal-button"
          href="/login"
          onClick={() => setOpen(false)}
        >
          Iniciar sesión
        </Link>
      </nav>
    </header>
  );
}
