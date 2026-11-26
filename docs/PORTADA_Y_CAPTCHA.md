# Actualización visual y CAPTCHA — v0.9.1

Esta actualización conserva la fase académica actual. No implementa una fase nueva. Incluye la portada con las ocho imágenes facilitadas, el logo IberAcad en el login y el sistema, y Cloudflare Turnstile para iniciar sesión y recuperar contraseña.

## Actualizar el proyecto en Windows

1. Conserva una copia de tu proyecto actual y de `apps/web/.env.local`.
2. Extrae este ZIP en una carpeta nueva. Copia tu `.env.local` a `apps/web/.env.local` dentro de esa carpeta. No copies `node_modules` ni `.next`.
3. En una terminal situada en la raíz del proyecto, ejecuta `npm ci`.
4. Configura el CAPTCHA con los pasos siguientes y ejecuta `npm run dev`. Abre `http://localhost:3000`.

La portada y el CAPTCHA no necesitan migraciones SQL. Si vienes de v0.8 y todavía no instalaste los informes de v0.9, sigue `docs/FASE_9_INFORMES.md` para aplicar su migración. No vuelvas a ejecutar el esquema inicial sobre una base existente.

## Activar el CAPTCHA real

1. Abre el panel de Cloudflare, entra en **Turnstile** y añade un widget. Elige el modo **Managed** (administrado).
2. Autoriza el dominio donde estará tu web. Para desarrollo, añade también `localhost` y `127.0.0.1` si usas esas direcciones. Los hostnames se indican sin protocolo ni ruta.
3. Copia la **Site key**, que es pública. Añade en `apps/web/.env.local`:

   ```dotenv
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=TU_SITE_KEY_PUBLICA
   ```

4. En tu proyecto Supabase abre **Authentication / Settings / Bot and Abuse Protection**, activa **Enable CAPTCHA protection**, selecciona **Turnstile**, pega la **Secret key** de ese mismo widget y guarda. Los nombres de los menús pueden variar según el idioma del panel.
5. Reinicia `npm run dev`. Para producción, configura la variable en tu alojamiento y vuelve a compilar y desplegar (`npm run build`); las variables `NEXT_PUBLIC_` quedan incorporadas al build.
6. Prueba el login y la recuperación de contraseña. El botón se habilita cuando termina la verificación. Confirma en Supabase que una solicitud de autenticación sin token o con token inválido se rechaza.

**Se necesitan ambos pasos: clave pública en la web y protección activada con la clave secreta en Supabase.** Sin la clave pública, se conserva el acceso existente y aparece «CAPTCHA pendiente de activación por el administrador». Tener el widget visible no demuestra que Supabase esté protegido: confirma el ajuste del punto 4 antes de publicar.

Nunca pongas la Secret key en una variable `NEXT_PUBLIC_`, en el navegador ni en el repositorio. No hacen falta claves `service_role`, una Edge Function ni tablas adicionales para este CAPTCHA. Supabase valida el token del proveedor. Las credenciales de Cloudflare y Supabase no están incluidas ni se han configurado en tu cuenta.

## Comportamiento

- Token obligatorio en la acción del servidor cuando hay Site key configurada.
- Supabase recibe `captchaToken` tanto para login como para recuperación.
- Se elimina el token y se crea una verificación nueva después de cada envío, incluso si la contraseña es incorrecta.
- La expiración, los errores del proveedor y la carga fallida bloquean el botón y ofrecen reintento.
- El formulario para cambiar una contraseña con sesión de recuperación no solicita un CAPTCHA adicional.
- El script de Turnstile solo se carga en formularios que lo requieren; la portada no carga el proveedor.
- Si hay una política CSP personalizada en tu alojamiento, permite `https://challenges.cloudflare.com` en `script-src` y `frame-src` según la documentación de Cloudflare.

## Imágenes y diseño

Los originales están en `apps/web/public/colegio/`. `logo_sistema.png` identifica IberAcad; `iberdrola_escudo.jpg` identifica al colegio. Las seis fotografías se distribuyen entre portada, galería e historia. Las tres tarjetas de galería abren la imagen completa. Next.js sirve tamaños optimizados, con texto alternativo y espacio reservado para evitar saltos de diseño.

La información pública conserva sus fuentes y la distinción entre la historia general de Iberdrola y la sección A. Las fotografías se presentan sin nombres personales. No se modificaron los permisos de los registros académicos.

## Validación local

Las pruebas de CAPTCHA usan un proveedor simulado y un simulador de Supabase que comprueba el token recibido. Cubren expiración, error, rechazo del token, ausencia del token en el servidor, renovación, acceso y recuperación. No sustituyen la comprobación final con tus claves reales.

```bash
npm run test:web
npm run lint
npm run build
npx playwright test tests/browser/home.spec.ts tests/browser/web.spec.ts tests/browser/reports.spec.ts
npx playwright test --config playwright.captcha.config.ts
```

Referencias oficiales:
- https://supabase.com/docs/guides/auth/auth-captcha
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
