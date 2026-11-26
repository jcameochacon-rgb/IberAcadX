# Validación del rediseño v0.9.2

Fecha: 14 de octubre de 2026. Se verificaron 17 flujos de navegador: 12 existentes de portada, autenticación e informes, 2 de diseño adaptable y movimiento, y 3 de CAPTCHA simulado. Una animación continua sobre una tarjeta interactiva se sustituyó por una entrada finita; las dos pruebas de portada se repitieron correctamente después de ese ajuste. ESLint y compilación de producción con TypeScript correctos.

Se revisaron escritorio (1440 px) y móviles (390 y 320 px). Sin cambios de SQL, autenticación ni permisos; no se repitió la batería SQL porque no se modificó esa capa. La sección siguiente conserva el registro de validación de la versión anterior.

# Validación web y gestión académica v0.9.1

Fecha: 14 de octubre de 2026.

| Comprobación | Resultado |
|---|---|
| Next.js: npm run build | Compilación de producción correcta |
| TypeScript | Correcto, incluido en la compilación |
| ESLint: npm run lint | Correcto |
| SQL/RLS de la base inicial | 46 pruebas correctas |
| SQL/RPC de Gestión académica | 16 pruebas correctas |
| SQL/RPC de docentes y asignaciones | 17 pruebas correctas |
| SQL/RPC de registro de asistencia | 18 pruebas correctas |
| SQL/RPC de registro de calificaciones | 17 pruebas correctas |
| SQL/RPC de registro de horarios | 12 pruebas correctas |
| SQL/RPC de comunicados | 13 pruebas correctas |
| SQL/RPC de informes | 9 pruebas correctas |
| Vitest: autenticación, demo, formularios y exportación | 32 pruebas correctas |
| Playwright: navegación, autenticación y guardados | 36 correctas (regresión de v0.9; 12 flujos afectados repetidos en v0.9.1) |
| Playwright: CAPTCHA con proveedores simulados | 3 correctas |
| Total de pruebas automáticas verificadas entre v0.9 y v0.9.1 | 219 correctas |

## Escrituras y permisos

Las pruebas de gestión académica ejecutan las funciones en PostgreSQL embebido, con rol authenticated y el identificador de la sesión. Cubren instalación incremental y reaplicación, creación atómica de personas/fichas, rollback por duplicados, versiones de ficha/persona, reemplazo atómico del contacto principal, claves inmutables de cursos, estados, fechas y superposición de matrículas, desactivación sin pérdida de relaciones, rechazo de escrituras no autorizadas (incluidos Estudiante y perfil inactivo) y auditoría.

Las veintiuna RPC públicas de gestión, asistencia, calificaciones, horarios, comunicados e informes son security invoker, no son ejecutables por anon y conservan RLS. Los dos helpers privados de calificaciones verifican autorización antes de bloquear trimestre/asignación/matrícula y no devuelven datos. El esquema private debe mantenerse fuera de Exposed schemas. La protección del historial docente es un trigger privado sin ejecución directa desde clientes. El script de vinculación docente requiere una cuenta Auth existente y rechaza sobrescribir perfiles.

Se prueban docentes nuevos y reutilización de personas, versiones de ficha/persona/asignación, duplicados, claves conservadas, referencias activas, acceso por curso y su revocación, bloqueo del cambio docente cuando hay actividad y protección de datos de cuentas administrativas.

La fase de asistencia comprueba lista histórica por vigencia, borradores parciales, publicación completa, corrección, matrícula ajena, estados inválidos, rollback, versiones de jornada/fila/matrícula, revocación docente y privacidad familiar. La regla de lectura de jornadas evalúa curso y publicación directamente para permitir INSERT RETURNING, conservando el mismo alcance. El formulario no descarta observaciones sin marca: exige elegirla antes de guardar.

## Pruebas en navegador

La fase 9 añade nueve pruebas SQL de informes: privilegios, exclusión de borradores, cálculo con tope 100, privacidad familiar/estudiante, rechazo de docente ajeno/inactivo, filtros inválidos, resumen de asistencia y denominador, rango inclusivo y resultado vacío. Tres pruebas unitarias cubren CSV, neutralización de fórmulas, valores cero/nulos y fechas. El navegador comprueba una nota publicada, contenido CSV y no-store, impresión/PDF, consulta familiar, móvil sin desbordamiento y descarga sin sesión/filtros inválidos. Los archivos de ejemplo contienen datos ficticios.

La fase 8 añade trece pruebas SQL de privilegios/reaplicación, autoría docente, privacidad de borradores, cursos ajenos, límites de texto, confirmación, versiones, publicación familiar, escritura familiar rechazada, retiro, edición obsoleta, avisos institucionales, cursos inactivos, paginación y auditoría. En navegador se comprueban borrador/publicación/retiro con una familia, vista móvil sin desbordamiento y conflicto entre dos pestañas conservando el texto. Las capturas están en `docs/preview/comunicados-escritorio.png` y `comunicados-movil.png`.

La fase 7 añade doce comprobaciones SQL: migración reaplicable y privilegios, horas inicialmente vacías, configuración por Secretaría, confirmación/duración/turno/superposición, versiones de periodos y bloques, duplicados de curso y docente, acceso por curso, edición, asignación ajena o inactiva, retiro confirmado, actualización global de horas y auditoría. La base conserva las claves únicas que protegen reservas concurrentes; las pruebas locales no son una prueba de carga multisesión.

La fase 6 comprueba actividades, cero frente a pendiente, rollback de publicación incompleta, límites/decimales, motivo de extras, listas ajenas/truncadas/duplicadas, promedio de varias actividades, redondeo, tope de 100, aprobación, privacidad familiar, bloqueo de notas publicadas, despublicación, versiones de notas/criterios/matrícula, materia ajena dentro del mismo curso, cierre, inactividad, revocación y auditoría.

Se mantienen las ocho comprobaciones de autenticación/demo de v0.2 y se añaden seis flujos:

1. Secretaría registra y edita un estudiante; la búsqueda devuelve el registro persistido.
2. RUDE duplicado muestra error, conserva los datos escritos y no crea otra ficha.
3. Alta de curso/tutor/estudiante, vínculo principal, matrícula y retiro conservados al recargar.
4. Dos páginas abiertas: la segunda no sobrescribe la edición posterior de la primera.
5. Docente/Padre no ven el acceso de gestión ni pueden abrir formularios por URL.
6. Formulario a 390 px sin desbordar; desactivar mantiene la ficha en gestión.

Se añaden cuatro flujos de docentes/asignaciones: alta y edición con reutilización personal, asignación y duplicados/reactivación, acceso/revocación del docente a su curso, y error por CI duplicado a 390 px. El menú admite desplazamiento para cerrar sesión en ventanas de poca altura.

Se añaden cinco flujos de asistencia: guardar/completar/publicar/despublicar, docente y consulta familiar, conflicto simultáneo que conserva marcas y observaciones, móvil a 390 px sin desbordamiento y consulta de Secretaría sin captura. El formulario evita el reinicio automático de controles después de un error de guardado.

scripts/e2e-server.mjs simula Auth localmente. scripts/e2e-database.mjs ejecuta las migraciones y RPC reales en PGlite con RLS, y adapta un subconjunto de lecturas REST. El adaptador HTTP no reproduce toda la Data API de Supabase. Las pruebas de permisos e integridad independientes no usan ese adaptador.

Se añaden cuatro flujos de calificaciones: configuración y captura por docente con publicación/privacidad familiar/despublicación; conflicto entre dos pestañas que conserva los datos escritos; móvil de 390 px, actividad nueva pendiente y trimestre planificado bloqueado; Secretaría sin captura. Las pruebas esperan la actualización del listado de actividades después de guardar y acotan los avisos al contenido principal para excluir el anunciador de rutas de Next.js.

Se revisaron capturas internas de los formularios en escritorio y móvil. Las pruebas pueden regenerarlas en docs/preview; no se distribuyen capturas en el ZIP.

Se añaden cinco flujos de navegador: portada pública con fuentes y acceso/retorno al login; navegación pública móvil sin desbordamiento; configuración/duplicados/cruce entre cursos/edición/retiro por Secretaría; conflicto entre pestañas y horario móvil; consulta docente sin administración. Las capturas esperan la carga completa del contenido, no la pantalla provisional de carga. Se revisa que la portada no solicite datos REST privados.

## Límites

No se conectó al Supabase del usuario ni se instalaron allí las funciones. La Data API remota, JWT/renovación real, correos, invitaciones y despliegue Vercel siguen requiriendo comprobación en el proyecto configurado. Antes de datos reales se debe repetir el flujo con fichas ficticias en esa instancia.

Administración web de cuentas, aplicación móvil y notificaciones push están pendientes. Informes exporta CSV y usa la impresión del navegador para PDF; no emite certificados ni libretas oficiales y limita a 5000 filas sin truncar. Comunicados no incorpora adjuntos, destinatarios individuales nuevos ni confirmación de lectura por edición. No hay publicación masiva, importación de notas, promedio anual ni promoción automática. Horarios representa la semana tipo de la gestión, sin vigencia por fechas ni sustituciones diarias. Un relevo de docente tras registrar actividad requiere modelar responsabilidades por periodos y no se implementa aquí. El modelo actual tiene un solo rol institucional por persona. La web conserva la clave publicable y la sesión del usuario; ninguna escritura de esta fase usa service_role.

La información de la portada está atribuida a las fuentes facilitadas, pero no confirmada con la institución. El contacto se presenta como publicado en un directorio, la reseña distingue A/B y las ocho imágenes fueron facilitadas por el usuario. No se publicaron registros de alumnos ni se desplegó el sitio.

## Reproducir

```bash
npm ci
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Puertos del navegador de pruebas: 3010 y 54329. Todos los registros son ficticios y la base está en memoria. No ejecutar el bootstrap de pruebas en Supabase.

## Actualización visual y CAPTCHA v0.9.1

32 pruebas unitarias y 12 flujos de navegador repetidos, además de 3 nuevos flujos de CAPTCHA. Se verificaron las ocho imágenes, navegación, ausencia de peticiones académicas desde la portada y diseño móvil. La activación real depende de claves de Cloudflare y del ajuste CAPTCHA de Supabase; no se probó contra las cuentas del usuario. Consulta PORTADA_Y_CAPTCHA.md.
