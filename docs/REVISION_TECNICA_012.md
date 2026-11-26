# Revisión técnica de IberAcad 0.12.0

**Base:** archivo modificado `v0.11.rar`. Revisión realizada el 24–25 de noviembre de 2026.

## Dictamen y alcance

Se corrigieron fallos concretos de navegación, vinculación académica e invitaciones y se preparó la app móvil para consumir la web publicada. La compilación y las pruebas de lógica son satisfactorias. **La publicación, la entrega real de correos y la validación en un teléfono físico siguen pendientes.** No se presenta esta revisión como certificación de ausencia total de errores ni como un sistema ya desplegado.

La revisión incluye código Next.js, cliente Expo, formularios de cuentas, relaciones académicas, reglas por rol, consultas RLS y documentación. No se modificaron registros reales de estudiantes, perfiles, calificaciones o matrículas durante la comprobación de Supabase.

## Hallazgos y correcciones

| Prioridad | Hallazgo | Corrección |
| --- | --- | --- |
| Alta | URL móvil vacía y enlaces de correo apuntando a localhost | Guía de publicación, variable pública móvil, bloqueo de invitaciones sin origen HTTPS |
| Alta | Invitaciones abiertas en otro navegador no tenían un recorrido explícito hasta crear contraseña | Ruta `/auth/invitacion`, sesión verificada y eliminación del fragmento de URL; soporte de plantilla `TokenHash` en `/auth/confirm` |
| Alta | La consulta directa de cuentas no exigía un rol administrativo en todas las variantes de módulo | Verificación de autorización antes de consultar personas y perfiles |
| Alta | Importaciones específicas de Android/iOS podían resolver el componente sobre sí mismo | Uso de la API pública de WebView, sin importación circular; compilación Android comprobada |
| Media | La ficha mostraba “Editar matrícula” sin una acción real | Formularios de matrícula en la ficha, con RPC de integridad y versión del registro |
| Media | Faltaba un recorrido directo para asignar materia y curso desde el docente | Panel de asignaciones dentro de la propia ficha docente |
| Media | Gestión de usuarios había quedado limitada a Consultar en el menú | Restauradas las cuatro acciones y sus vistas, con restricción de roles en servidor |
| Media | Seis grupos principales y navegación extensa | Cinco acordeones; cursos, matrículas y asignaciones dentro de Administración de asignaturas |
| Media | Crear cuenta no explicaba los vínculos necesarios para ver datos | Mensajes y orientación específica para estudiante, docente y familia |
| Media | `window.print()` no proporciona por sí solo un archivo nativo compartible | Exportación móvil PDF/CSV mediante Expo; validación del mensaje, origen, tamaño y escape HTML/CSV |
| Media | Espacios y controles inconsistentes en móvil | Botones de altura mínima 44 px, formularios ajustables, tablas con desplazamiento interno, navegación pública plegable y resúmenes renovados |
| Baja | Pruebas de portada y comunicados correspondían a una versión anterior | Pruebas de navegación actualizadas y retirada de la prueba del módulo eliminado |

## Revisión de Supabase existente (solo lectura)

Se constató que el proyecto estaba activo y que existían las funciones académicas utilizadas. En el momento de la consulta había **3 estudiantes, 2 docentes, 0 matrículas y 1 asignación docente**, con una gestión activa. Estos conteos son una observación temporal, no una carga de datos realizada por esta entrega.

La ausencia de matrículas explica que un estudiante registrado pueda no ver cursos, horarios o planillas. Secretaría debe matricularlo en el curso correcto. No se eligieron cursos ni relaciones familiares arbitrariamente.

Se inspeccionaron políticas relevantes de personas, perfiles, matrículas y asignaciones. Las vistas de calificaciones y resumen de asistencia usan `security_invoker`. La administración de cuentas comprueba el rol y protege cuentas administrativas y la cuenta propia.

El asesor de seguridad señaló una función `SECURITY DEFINER` accesible a usuarios autenticados. Se revisó `administrar_cuenta`: esa exposición es intencional para la operación controlada, con comprobación del actor, protección de roles y `search_path` fijo. La alerta no se silenció ni se retiró la comprobación. También estaba desactivada la protección de contraseñas filtradas; debe revisarse en la configuración de Authentication, según disponibilidad del proyecto.

El historial de migraciones estaba vacío, aunque el esquema sí estaba instalado. Esto puede ocurrir cuando el SQL se ejecutó manualmente. No es una razón para volver a instalar todas las migraciones sobre los datos existentes.

## Pruebas realizadas

| Verificación | Resultado |
| --- | --- |
| `npm run test:web` | **54 pruebas correctas**, incluidos navegación, validaciones, invitaciones simuladas, relaciones académicas y exportación móvil |
| `npm run test:db` | **16 pruebas correctas** en PostgreSQL embebido PGlite, sin tocar la base remota |
| TypeScript web y móvil | Correcto |
| ESLint web | Correcto |
| Compilación de producción Next.js | Correcta |
| Empaquetado JavaScript Android con Expo | Correcto; no equivale a compilar o instalar un APK |
| Playwright / Chromium | Bloqueado por el entorno: Chromium no pudo crear su socket (`Operation not permitted`); no se cuentan pruebas visuales como aprobadas |
| Correo real / SMTP | No enviado como prueba; lógica verificada con dobles de prueba |
| Android/iOS físico y CAPTCHA dentro de WebView | Pendientes de publicación y prueba en dispositivo |

Se intentó también la suite histórica `regression.mjs`: espera 28 tablas anteriores y encuentra 26 después de retirar comunicados. No es una prueba vigente de 0.12; se retiró su comando del README y de los scripts principales, conservando el archivo como referencia histórica. La suite vigente comprueba la retirada de comunicados y añade aislamiento por rol, matrículas y asignaciones.

## Condiciones para dar por terminada la puesta en marcha

1. Publicar la web en una URL HTTPS estable y configurar las variables de producción.
2. Configurar las URL de Auth, el dominio Turnstile y SMTP; verificar una invitación real abierta desde otro navegador.
3. Matricular a los estudiantes reales y completar asignaciones y vínculos familiares.
4. Generar un APK con la URL real. Probar en un Android físico todas las acciones permitidas de los roles, PDF/CSV y recuperación de contraseña. Validar iOS por separado si se requiere.
5. Revisar visualmente las páginas en 320, 390, 768 y 1440 px. Las reglas responsivas se implementaron, pero la ejecución del navegador quedó bloqueada en este entorno.

**Guía operativa:** `docs/APP_MOVIL.md`. No se requiere SQL nuevo para esta actualización.
