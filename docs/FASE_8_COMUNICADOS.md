# Fase 8 · Tablón de comunicados

Versión 0.8 · 12 de octubre de 2026. Conserva portada, gestión académica, asistencia, calificaciones y horarios. No se aplicaron migraciones en tu Supabase remoto ni se desplegó el sitio.

## Actualizar desde v0.7 en Windows

1. Descomprime el ZIP en una carpeta nueva. Copia tu `apps/web/.env.local` a la misma ubicación de esta versión.
2. En Supabase → SQL Editor, ejecuta completo `supabase/migrations/202610120001_comunicados.sql`.
3. Ejecuta `supabase/11_verificar_comunicados.sql`: deben aparecer cuatro funciones con `security_definer=false`, `authenticated=true` y `anon=false`.
4. Abre PowerShell en la carpeta `iberdrola-a` y ejecuta `npm ci` y luego `npm run dev`.
5. Entra a http://localhost:3000, inicia sesión y abre **Comunicados → Abrir tablón de comunicados**.

Desde versiones anteriores, instala primero las migraciones que falten por orden de nombre. Una instalación nueva necesita las siete migraciones y el procedimiento de Auth de `CONFIGURACION_WEB.md`. No repitas la base inicial ni la creación del primer director en una base ya instalada.

La nueva migración añade cuatro funciones sobre las tablas existentes; no borra datos ni publica avisos. Es reaplicable. Las funciones usan la sesión del usuario, RLS y `security invoker`.

## Redactar y publicar

Dirección y Secretaría pueden gestionar avisos y publicar institucionalmente. Cada docente gestiona los avisos de su autoría y selecciona únicamente cursos donde tiene asignación activa. El selector muestra los cursos visibles; los inactivos están identificados y la base rechaza su selección para guardar/publicar.

1. Pulsa **Nuevo comunicado**. Escribe título (hasta 160 caracteres) y contenido (hasta 10000).
2. Selecciona entre 1 y 100 cursos, o marca **Institucional** con una cuenta administrativa.
3. Pulsa **Guardar borrador**. No se envía ni se publica todavía.
4. Revisa el texto y los destinatarios en la vista previa. Si necesitas corregir, pulsa **Editar borrador**.
5. Marca la confirmación y pulsa **Publicar comunicado**. El aviso queda disponible dentro del sistema.

Institucional significa todas las cuentas activas del sistema, no visitantes de la portada. Por curso significa quienes tienen acceso a ese curso: docentes, estudiantes matriculados y tutores vinculados, además de administración. La visibilidad se calcula con los vínculos actuales, no con una lista congelada de personas.

Para corregir un aviso publicado, confirma **Retirar publicación**, edita el borrador y vuelve a publicar. Retirar lo oculta a sus destinatarios; no puede eliminar copias que ya hayan leído o descargado. El autor y administración conservan acceso. No existe borrado permanente desde esta pantalla. Las modificaciones quedan auditadas.

## Lectura y límites

- El tablón pagina de 20 en 20 y consulta todos los registros autorizados. El resumen anterior conserva su límite de carga.
- Estudiantes y tutores solo consultan avisos publicados que les corresponden; no aparecen formularios administrativos.
- Los borradores quedan visibles al autor y administración. No se incluyen en la portada pública.
- Texto plano: se conserva el salto de línea y se escapa HTML. No hay adjuntos, imágenes, editor enriquecido, programación futura ni búsqueda en todo el tablón.
- Esta fase no envía correo, WhatsApp ni push. No registra automáticamente lecturas ni muestra confirmaciones: las lecturas históricas del modelo base no se presentan como confirmación de una nueva edición.
- Los avisos preexistentes dirigidos a perfiles individuales se pueden consultar y retirar, pero no editar ni publicar desde este formulario. No se eliminan sus destinatarios.
- Los cambios simultáneos se rechazan por versión. Un error conserva lo escrito mientras la página siga abierta; guarda una copia antes de recargar o salir. No hay guardado automático ni modo sin conexión.
- Cursos disponibles: máximo 500 en el selector. Las fechas se muestran en hora de Bolivia.

## Comprobación con datos reales

Las pruebas locales usan PostgreSQL embebido con SQL/RLS reales y Auth simulado. No sustituyen una prueba de JWT y Data API en tu Supabase. Antes de uso institucional, usa cuentas y textos ficticios para verificar: borrador oculto a familia, publicación por curso, docente ajeno sin acceso, retiro, aviso institucional y conflicto entre dos pestañas. No ejecutes los scripts de pruebas/bootstrap en tu base real.

Consulta `VALIDACION_WEB.md` y las capturas `docs/preview/comunicados-*.png`.

Siguiente fase propuesta: informes académicos y exportación. Siguen pendientes administración web de cuentas, aplicación móvil y notificaciones push.
