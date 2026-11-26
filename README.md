# IberAcad 0.12.1 · Web y móvil

Sistema de gestión académica de la U.E. Iberdrola A. Esta revisión parte del archivo modificado `v0.11.rar`: conserva el login compacto, las fichas y las categorías añadidas, y corrige navegación, asignaciones y acceso móvil.

Corrección 0.12.1: permite registrar fichas de estudiantes, docentes y tutores en localhost sin enviar invitaciones. Consulta [ACTUALIZACION_0121.md](ACTUALIZACION_0121.md).

## Empieza aquí

1. **[Actualizar sin perder tu configuración](ACTUALIZACION_012.md).**
2. **[Publicar la web y usar la app desde el celular](docs/APP_MOVIL.md).** Incluye URL HTTPS, Supabase, correos y APK.
3. **[Revisión técnica, resultados y pendientes](docs/REVISION_TECNICA_012.md).**

```bash
npm ci
npm run dev
```

Requiere Node.js 22.12 o superior compatible con las dependencias. Configura `apps/web/.env.local` a partir de `.env.example`. Conserva tus valores existentes; las credenciales privadas no forman parte de esta entrega.

## Organización

| Carpeta | Contenido |
| --- | --- |
| `apps/web` | Next.js: portada, acceso, gestión académica y acciones de servidor |
| `apps/mobile` | Expo / React Native: app que abre la web publicada y permite compartir PDF/CSV |
| `packages/shared` | Roles y tipos de la base de datos |
| `supabase/migrations` | SQL histórico ordenado; no volver a ejecutar sobre una base ya instalada |
| `supabase/tests/phase10.mjs` | Pruebas vigentes de permisos e integridad, incluidas las ampliaciones 0.12 |
| `tests/browser` | Pruebas Playwright con datos ficticios y Supabase simulado |
| `docs` | Configuración y documentación de versiones |

## Comprobaciones

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:export
```

Para las pruebas de interfaz, instala el navegador de Playwright (`npx playwright install chromium`) y ejecuta `npm run test:e2e`. La ejecución automatizada de interfaz quedó bloqueada en el entorno de entrega; consulta el informe. `supabase/tests/regression.mjs` es una suite histórica anterior a la retirada de comunicados y ya no forma parte de los comandos vigentes.

## Acceso

Los nombres visibles de los ocho módulos se conservan. Los cinco acordeones principales agrupan las operaciones CRUD y las opciones adicionales de cursos, matrículas y familias. El menú utiliza el rol de la sesión; el selector de roles solo existe en la demo.

`DIRECTOR` representa Administrador; `SECRETARIA`, Personal Administrativo; `DOCENTE`, Docente; `ESTUDIANTE`, Estudiante. Se conserva `PADRE` para las familias vinculadas. Los permisos reales se comprueban en servidor y mediante RLS.

## Documentación histórica

Los documentos `FASE_*`, `ACTUALIZACION_011.md` y otras notas anteriores describen sus respectivas entregas. En caso de discrepancia, prevalecen `ACTUALIZACION_012.md` y `docs/APP_MOVIL.md`. El módulo de comunicados está retirado; no se debe volver a activar siguiendo una guía antigua.
