# IberAcad en el celular · guía 0.12

## Qué está preparado

`apps/mobile` contiene una app Expo/React Native con WebView. Abre la misma plataforma, por lo que conserva los formularios y los permisos de todos los roles. También prepara informes PDF y CSV para guardar o compartir usando las opciones del teléfono. No es una app independiente sin Internet.

La base de datos sigue siendo tu Supabase. El teléfono se conecta a la web HTTPS; la web usa la sesión y las políticas RLS. **La clave secreta de Supabase solo va en el servidor web.** La app solo necesita la URL pública de IberAcad.

Todavía debes publicar la web y después generar el APK. Un paquete JavaScript de Expo no es un APK instalable.

## 1. Publicar la web

Una ruta práctica es Vercel con un repositorio privado:

1. Crea un repositorio privado con el contenido de `iberdrola-a`. No subas `.env.local`, `.env`, claves, `node_modules` ni `.next`; el proyecto incluye `.gitignore`.
2. En Vercel, crea un proyecto e importa ese repositorio.
3. Framework: **Next.js**. Root Directory: **`apps/web`**. Activa **Include source files outside of the Root Directory in the Build Step**, porque se usa `packages/shared` y el lockfile de la raíz.
4. Mantén la configuración automática de npm/workspaces y `next build`. Si personalizas la instalación, debe usar el lockfile de la raíz; no crees un lockfile independiente dentro de `apps/web`. Usa Node 22.12 o superior compatible.
5. Añade las variables de `apps/web/.env.example` en los ajustes de entorno del proyecto:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | La URL de tu proyecto Supabase existente |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Su clave pública/publishable |
| `SUPABASE_SECRET_KEY` | Clave secreta, exclusivamente en servidor |
| `NEXT_PUBLIC_SITE_URL` | La dirección HTTPS de producción asignada por Vercel |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de tu CAPTCHA |
| `ENABLE_DEMO` | `false` en producción |

6. Vercel asignará una dirección `https://…vercel.app`. Copia **la dirección de producción estable**, no una dirección efímera de preview. Corrige `NEXT_PUBLIC_SITE_URL` con esa dirección y vuelve a desplegar; las variables públicas se incorporan al compilar.
7. Abre la dirección desde el navegador del celular usando datos móviles. Comprueba inicio de sesión, navegación y cierre de sesión. Esto ya permite usar IberAcad sin instalar una app.

No se ha creado una cuenta Vercel, repositorio ni publicación en tu nombre en esta entrega. También puedes utilizar otro alojamiento compatible con Next.js y sus acciones de servidor; una exportación HTML estática no sirve para esta aplicación.

## 2. Configurar Supabase y el CAPTCHA

En Supabase → Authentication → URL Configuration:

- **Site URL:** tu dirección HTTPS pública.
- **Redirect URLs:** agrega las URL exactas `https://TU-DOMINIO/auth/invitacion`, `https://TU-DOMINIO/auth/callback` y `https://TU-DOMINIO/auth/callback?next=/actualizar-clave`.
- Conserva localhost solo para tus pruebas locales. No lo utilices como URL de invitación de usuarios reales.

En Cloudflare Turnstile, autoriza el hostname público de producción, sin `https://` ni rutas. En Supabase activa el proveedor Turnstile y guarda allí su clave secreta. Su clave pública va en la web. La app utiliza ese mismo hostname dentro de la WebView; no necesita una clave secreta propia.

## 3. Correo para elegir contraseña

1. Configura un proveedor SMTP en Supabase → Authentication → Email/SMTP. Verifica remitente y dominio siguiendo las instrucciones de tu proveedor. El servicio de correo de prueba de Supabase tiene restricciones y no sustituye una configuración SMTP para los usuarios del colegio.
2. En Email Templates → **Invite user**, usa un enlace con `TokenHash`, para que también funcione en un navegador distinto del que creó la cuenta:

```html
<h2>Bienvenido a IberAcad</h2>
<p>Configura tu contraseña para acceder al sistema académico.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/actualizar-clave">Crear mi contraseña</a></p>
```

3. Para **Reset password**, usa la misma ruta con `type=recovery`:

```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/actualizar-clave">Restablecer mi contraseña</a></p>
```

4. Desde una cuenta autorizada, abre Gestión de usuarios → Registrar. Elige crear ficha nueva o utilizar una persona existente, según corresponda. En Registro de estudiante o Gestión de docente → Registrar también se crea ficha y acceso.
5. El destinatario abre el enlace, elige una contraseña de al menos 12 caracteres y vuelve a iniciar sesión. Puede completar el correo en el navegador del teléfono y luego iniciar sesión en la app.
6. Si no llega el correo, comprueba spam, los registros de Authentication y SMTP. Para una cuenta pendiente, usa Gestión de usuarios → Editar → Reenviar invitación pendiente. Para una cuenta activada, usa Recuperar contraseña.

La confirmación de la API indica que el envío fue solicitado, no que el correo llegó a la bandeja. No se enviaron correos reales como parte de la revisión. Si falla la creación de la ficha después de solicitar la invitación, el sistema intenta revertir la cuenta y muestra si quedó algo parcial; revisa Auth antes de repetir. Supabase Auth y las tablas académicas no forman una única transacción.

## 4. Probar la app

Desde la raíz del proyecto:

```bash
npm ci
```

Copia `apps/mobile/.env.example` como `apps/mobile/.env` y escribe:

```dotenv
EXPO_PUBLIC_WEB_URL=https://TU-DOMINIO-PUBLICO
```

No añadas `/login`, rutas ni parámetros. Después:

```bash
npm run mobile
```

Abre el QR con una versión de Expo Go compatible con SDK 58. Para Android también puedes usar un emulador. El equipo debe servir Metro mientras se usa Expo Go. `npm run mobile:tunnel` puede ayudar con la conexión a Metro, pero **no publica Next.js**. `localhost` en un teléfono se refiere al propio teléfono.

Si tu Expo Go no es compatible, utiliza una compilación de desarrollo o el APK del siguiente apartado. No cambies versiones de React Native de forma aislada.

## 5. Generar el APK Android

Necesitas tu propia cuenta Expo/EAS. Desde `apps/mobile`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_WEB_URL --value https://TU-DOMINIO-PUBLICO --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

`init` vincula el proyecto y guarda su identificador real; no hay uno inventado en esta entrega. Comprueba en EAS que la variable quede asociada al entorno preview. El perfil `preview` de `eas.json` solicita un **APK** para distribución interna. Descarga el APK desde el resultado de EAS e instálalo en Android. Los tiempos y límites de compilación dependen de tu cuenta Expo.

La dirección web se incorpora al compilar: si cambia, actualiza la variable y recompila el APK. El APK no necesita la computadora encendida; sí necesita Internet, Supabase y la web disponibles.

iPhone requiere su propio proceso de compilación, firma y distribución de Apple. No se incluye un IPA ni se afirma que esté validado en iOS físico.

## 6. Comprobación final en un teléfono real

- Administrador y Secretaría: alta de cuenta, edición de ficha, matrícula, asignación de docente y rechazo de acciones sobre cuentas protegidas.
- Docente: sus cursos, alumnos, asistencia, notas y reportes; sin cursos ajenos.
- Estudiante: sus materias, horarios y resultados publicados; sin escrituras ni datos de otros alumnos.
- Padre: solo los estudiantes vinculados y autorizados.
- CAPTCHA, contraseña desde correo abierto en otro navegador, recuperación y cierre de sesión.
- Menú móvil, teclado, desplazamiento de tablas, error sin Internet y reintento.
- PDF/CSV: guardar/compartir y abrir el archivo con una aplicación compatible. Los archivos temporales se eliminan de la caché al finalizar el diálogo.

## Fuentes técnicas

Consultadas el 24 y 25 de noviembre de 2026:

- Vercel, monorepos: https://vercel.com/docs/monorepos/monorepo-faq
- Expo, APK interno: https://docs.expo.dev/build-reference/apk/
- Expo, variables: https://docs.expo.dev/eas/environment-variables/
- Expo Print: https://docs.expo.dev/versions/latest/sdk/print/
- Expo Sharing: https://docs.expo.dev/versions/latest/sdk/sharing/
- Supabase, invitaciones: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
- Supabase, plantillas: https://supabase.com/docs/guides/auth/auth-email-templates
