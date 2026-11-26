# IberAcad 0.12.1 — Registro sin invitación

Esta actualización corrige el bloqueo de registro cuando NEXT_PUBLIC_SITE_URL apunta a localhost. La ficha académica y la cuenta de acceso son pasos independientes.

## Instalar

1. Conserva una copia de tu carpeta actual y de `apps/web/.env.local`.
2. Descomprime esta versión en una carpeta nueva y copia allí tu `apps/web/.env.local`. Conserva también tu configuración local móvil si la modificaste.
3. Desde la raíz ejecuta `npm ci` y luego `npm run dev`.
4. No necesitas ejecutar SQL ni volver a cargar los datos DEMO. Se conserva la base de Supabase indicada por tu configuración.

## Registrar un estudiante ahora

1. Inicia sesión como Administrador o Personal Administrativo.
2. Abre **Gestión de usuarios → Registro de estudiante → Registrar**.
3. Deja marcada **Registrar solo la ficha, sin cuenta de acceso** (por defecto si no hay URL HTTPS o servicio de cuentas configurado).
4. Completa los datos y pulsa **Registrar ficha**. No necesita correo.
5. Abre **Registro de estudiante → Editar**, selecciona al estudiante y matricúlalo en un curso y gestión para trabajar con asistencia, horarios y calificaciones.

La ficha por sí sola no permite iniciar sesión al estudiante. No se crea un usuario en Authentication ni se envía un correo. También se aplica a las fichas de docentes y tutores.

## Crear el acceso después

Cuando publiques IberAcad, configura la URL HTTPS en `NEXT_PUBLIC_SITE_URL`, las URL de redirección de Supabase y el correo según `docs/APP_MOVIL.md`. Reinicia o vuelve a desplegar la web después de cambiar variables.

En **Gestión de usuarios → Gestionar usuarios → Registrar**, abre **Vincular una cuenta a una ficha existente**. Selecciona la persona, el rol compatible e introduce el correo. Pulsa **Invitar y vincular ficha**. No vuelvas a registrar la misma persona.

Las invitaciones siguen requiriendo HTTPS. No uses una dirección inventada para evitar el aviso.

## Validación

64 pruebas web aprobadas, incluyendo registro sin correo, permisos, duplicados y fallos de guardado. Comprobación de tipos web y móvil y lint aprobados. Compilación de producción aprobada. No se modificó el esquema ni se alteraron los datos de Supabase en esta actualización.
