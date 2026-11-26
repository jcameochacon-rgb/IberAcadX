"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { publicLinks } from "./public-nav";
export function SiteFooter() {
  const path = usePathname();
  if (
    [
      "/auth/invitacion",
      "/login",
      "/registro",
      "/registrar",
      "/register",
      "/recuperar-clave",
      "/actualizar-clave",
    ].some((p) => path.startsWith(p))
  )
    return null;
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Brand dark />
          <p>
            Una comunidad conectada.
            <br />
            Un futuro compartido.
          </p>
          <p>
            Unidad Educativa Iberdrola A<br />
            El Alto · La Paz · Bolivia
          </p>
        </div>
        <div>
          <h2>Institución</h2>
          {publicLinks.map(([url, label]) => (
            <Link href={url} key={url}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Comunidad educativa</h2>
          <Link href="/login">Acceso a IberAcad</Link>
          <Link href="/recuperar-clave">Recuperar acceso</Link>
          <p>
            Estudiantes, familias, docentes
            <br />y personal administrativo.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} U.E. Iberdrola A</span>
        <span>IberAcad · Gestión académica institucional</span>
      </div>
    </footer>
  );
}
