# Conectar Auth y ejecutar la web

## Cuenta de Dirección

1. Instala la migración inicial si todavía no lo hiciste. No volver a ejecutarla en una base ya instalada.
   Para los formularios, instala después `supabase/migrations/202610060001_gestion_academica.sql`. Desde v0.2, comienza por esta migración y continúa con las siguientes.
   Para docentes/asignaciones instala luego `supabase/migrations/202610060002_docentes_asignaciones.sql`. Desde v0.3, comienza por esta migración y continúa con asistencia; consulta `FASE_4_DOCENTES_ASIGNACIONES.md` para vincular cuentas docentes.
   Para asistencia instala `supabase/migrations/202610070001_registro_asistencia.sql`. Desde v0.4, comienza por esa migración; consulta `FASE_5_REGISTRO_ASISTENCIA.md` para configurar trimestres y publicar jornadas.
   Para calificaciones instala `supabase/migrations/202610090001_registro_calificaciones.sql`. Desde v0.5, comienza por esta migración y verifica con `supabase/09_verificar_registro_calificaciones.sql`; consulta `FASE_6_REGISTRO_CALIFICACIONES.md`.
   Para horarios instala `supabase/migrations/202610090002_registro_horarios.sql`. Verifica con `supabase/10_verificar_registro_horarios.sql` y consulta `FASE_7_PORTADA_HORARIOS.md`. Luego instala `supabase/migrations/202610120001_comunicados.sql` y verifica con `supabase/11_verificar_comunicados.sql`. Finalmente instala `supabase/migrations/202610130001_informes.sql` y verifica con `supabase/12_verificar_informes.sql`. Desde v0.8 solo necesitas la migración de informes; consulta `FASE_9_INFORMES.md`.
2. Crea/invita al usuario desde **Authentication > Users**.
3. Edita y ejecuta `supabase/02_primer_director.sql` para vincularlo con la ficha y rol DIRECTOR.
4. Configura `.env.local` en **apps/web** con URL y clave publicable del mismo proyecto.
5. Inicia la web y accede con la cuenta institucional. Si ves acceso pendiente, confirma el UUID de Auth, `perfiles.id`, `persona_id`, rol y `activo=true`.

La página pública no tiene alta libre. Desactiva los registros públicos y anónimos en Auth para este flujo institucional. Dirección y Secretaría crean cuentas desde Gestión de usuarios; el formulario solicita correo, rol y datos personales, y crea la ficha compatible para ese rol. También se puede vincular una ficha existente sin cuenta. Al aceptar la invitación, la persona llega a **Tu nueva contraseña** para configurar su contraseña antes de iniciar sesión. Para enviar invitaciones configura `SUPABASE_SECRET_KEY` solo en el entorno servidor, como indica `apps/web/.env.example`; nunca la publiques con prefijo `NEXT_PUBLIC_`. No hay cuentas de prueba en la base real.

## Portada pública

La ruta `/` presenta el colegio antes de iniciar sesión. No consulta Supabase ni expone registros académicos. `/login` mantiene el acceso institucional y tiene un enlace de vuelta a la portada. Las rutas `/panel` siguen protegidas. Consulta `FASE_7_PORTADA_HORARIOS.md` para las fuentes y los límites de la información pública.

## URLs de Auth

En Supabase, configura la **Site URL** y las **Redirect URLs** para el origen donde ejecutas la web. En desarrollo:

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/actualizar-clave
http://localhost:3000/auth/confirm
```

Usa un único origen coherente: no mezcles localhost y 127.0.0.1 al iniciar sesión o abrir el enlace. En producción sustituye los valores por el dominio HTTPS real. `NEXT_PUBLIC_SITE_URL` debe coincidir con ese origen, sin ruta ni query. La invitación creada desde la web usa `/auth/callback?next=/actualizar-clave`, así que esa URL debe estar permitida en Redirect URLs.

La recuperación con la plantilla estándar PKCE debe abrirse en el mismo navegador que pidió el enlace para conservar el verifier. Para invitaciones o recuperación desde otro navegador, usa la confirmación por token_hash que implementa `/auth/confirm` y configura las plantillas correspondientes.

Ejemplo de enlace para la plantilla **Reset Password**:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/actualizar-clave"
  >Cambiar mi contraseña</a
>
```

Ejemplo para la plantilla **Invite user**:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/actualizar-clave"
  >Activar mi cuenta</a
>
```

El destinatario confirma el enlace y elige una contraseña de 12 a 128 caracteres. Después de actualizarla, la sesión local se cierra y se solicita volver a iniciar sesión. El correo real depende de la configuración de envío de Supabase; no se ha realizado una prueba contra tu cuenta.

Los callbacks admiten solo dos destinos: `/panel` y `/actualizar-clave`; no redirigen a dominios suministrados por parámetros. Las respuestas con sesión usan `private, no-store`. Las consultas y cambios de perfil usan la sesión autenticada y RLS; la clave de servidor se usa únicamente para enviar invitaciones mediante Auth Admin.

## Comandos desde la raíz

| Comando                | Uso                                          |
| ---------------------- | -------------------------------------------- |
| npm ci                 | Instalar las versiones del lockfile          |
| npm run dev            | Servidor de desarrollo web                   |
| npm run build          | Compilación de producción                    |
| npm start              | Servir la compilación de producción          |
| npm run typecheck      | Verificar TypeScript                         |
| npm run lint           | Verificar reglas de código                   |
| npm test               | Pruebas de base y validaciones web           |
| npm run types:generate | Regenerar tipos desde el SQL local           |
| npm run test:e2e       | Navegador contra servicios locales ficticios |

Para las pruebas de navegador, instala Chromium una vez con `npx playwright install chromium`. Se usan los puertos locales 3010 y 54329; deben estar libres. El simulador no conecta al proyecto del colegio, no envía correos y no prueba la entrega real de notificaciones.

Los tipos compartidos se generaron de la migración local, no de una conexión remota. Cuando la base instalada tenga cambios, sincroniza migraciones y regenera los tipos con la CLI Supabase del proyecto antes de ampliar los módulos.

## Estado y límites

Los permisos se verifican en servidor y se aplican con RLS en Supabase. El navegador recibe únicamente los registros que la sesión pudo consultar. Dirección y Secretaría disponen de formularios en Gestión académica y Horarios; consulta `FASE_3_GESTION_ACADEMICA.md` y `FASE_7_PORTADA_HORARIOS.md`. Dirección y docentes asignados disponen además de registro y publicación de asistencia y calificaciones; consulta `FASE_5_REGISTRO_ASISTENCIA.md` y `FASE_6_REGISTRO_CALIFICACIONES.md`. Comunicados conserva su consulta.

La web se compiló y probó localmente. No se crearon proyectos Supabase, cuentas reales, un repositorio GitHub ni despliegues Vercel. Hace falta conectar las dos variables públicas del proyecto y verificar los flujos con usuarios ficticios de tu propia instancia antes de usar datos reales.

## Referencias oficiales

- https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- https://supabase.com/docs/guides/auth/passwords
- https://nextjs.org/docs/app/guides/authentication
