# Fase 5: registro de asistencia

Versión 0.5, 9 de octubre de 2026. Dirección y docentes asignados pueden registrar asistencia diaria por curso. Secretaría conserva consulta; Padre/tutor y Estudiante consultan únicamente sus marcas publicadas.

## Actualizar desde v0.4

1. Descomprime esta entrega en una carpeta nueva. Copia tu `apps/web/.env.local` anterior para conservar URL y clave publicable del mismo proyecto.
2. En **Supabase → SQL Editor**, ejecuta completo `supabase/migrations/202610070001_registro_asistencia.sql`. No repitas la migración inicial ni el primer director.
3. Ejecuta `supabase/07_verificar_registro_asistencia.sql`. Deben aparecer tres funciones con `security_definer=false`, ejecución para authenticated y sin ejecución para anon. La segunda consulta muestra el calendario actual de trimestres.
4. Configura el calendario real como se indica abajo si aún no tiene fechas y trimestres abiertos.
5. Desde la carpeta `iberdrola-a`, ejecuta `npm ci` y `npm run dev`. Abre `http://localhost:3000/login`.
6. Entra con Dirección o un docente asignado y abre **Asistencia → Registrar asistencia**.

Si vienes de v0.3, instala primero `202610060002_docentes_asignaciones.sql` y después esta migración. Desde v0.2 instala también `202610060001_gestion_academica.sql`. En una base nueva instala las cuatro migraciones por orden de nombre y configura el primer director según `CONFIGURACION_WEB.md`.

La migración conserva datos existentes y se puede reaplicar. Ajusta la regla de lectura de jornadas para permitir devolver una fila recién creada: mantiene los mismos permisos, usando curso y estado de la fila directamente. Las tres RPC usan la sesión del usuario y RLS; no necesitan service_role.

## Configurar las fechas reales de trimestres

La base inicial deja los tres trimestres PLANIFICADOS y sin fechas. Esta fase no inventa un calendario. Para registrar una fecha debe estar dentro de un trimestre ABIERTO.

1. Dirección confirma el inicio y fin reales de cada trimestre.
2. Abre `supabase/08_configurar_trimestre_asistencia.sql` y cambia solo sus cinco variables iniciales: año, número, inicio, fin y estado.
3. Sustituye los valores `null` de las fechas por `DATE 'AAAA-MM-DD'`, con las fechas reales, manteniendo el formato año-mes-día. El número es 1, 2 o 3; el estado puede ser ABIERTO o PLANIFICADO.
4. Ejecuta el archivo completo desde SQL Editor. Repite para los otros trimestres que quieras configurar.
5. Ejecuta de nuevo la verificación 07 para revisar el resultado.

El script rechaza fechas vacías, años distintos, superposición y cambios de fechas que afectarían registros existentes. No reabre trimestres CERRADOS. Si tu calendario ya está configurado, no lo sobrescribas: basta con comprobar que la fecha elegida está en un trimestre abierto. El cierre/reapertura de trimestres no tiene formulario web en esta fase.

## Preparar el curso

- Dirección o Secretaría registra cursos, estudiantes y matrículas desde Gestión académica.
- Para un docente, configura una asignación activa a alguna materia del curso y una ficha docente activa. Cualquier docente asignado al curso puede registrar su asistencia diaria; no se duplica por materia.
- La cuenta debe tener perfil activo y rol DOCENTE. La vinculación manual se explica en `FASE_4_DOCENTES_ASIGNACIONES.md`; registrar una ficha no crea una cuenta de inicio de sesión.
- La lista usa fechas de ingreso/salida de la matrícula. Un estudiante retirado hoy aparece al consultar una fecha en la que seguía matriculado; un estudiante con ingreso posterior no aparece.
- Desactivar una asignación o docente revoca su alcance de captura. Dirección mantiene gestión; el historial no se borra.

## Registrar y publicar

1. En Asistencia pulsa **Registrar asistencia**.
2. Elige curso y fecha y pulsa **Cargar lista**. Puedes consultar una jornada anterior seleccionando la misma combinación.
3. Marca cada estudiante: **A · Presente**, **F · Falta**, **R · Retraso** o **L · Licencia**. Todos empiezan Sin marcar si no existe un registro.
4. Puedes usar **Marcar pendientes como presentes**: solo cambia casillas Sin marcar y respeta faltas, retrasos y licencias que ya elegiste. Revisa antes de guardar.
5. Añade observaciones si hacen falta: hasta 500 caracteres por estudiante y 1000 para la jornada. Una observación del estudiante requiere una marca; si queda Sin marcar, el formulario pide elegirla antes de guardar.
6. Pulsa **Guardar borrador**. Puede quedar incompleto y no será visible para la familia. Una marca pendiente no se convierte en falta ni en presente.
7. Completa todas las marcas y guarda de nuevo. **Publicar jornada** se habilita cuando no quedan pendientes ni cambios sin guardar.
8. Publica. La jornada queda bloqueada para edición y sus marcas aparecen en Asistencia para las familias autorizadas. No se envían correos ni notificaciones automáticas.

Hay una jornada por curso/fecha, compartida por sus docentes. Guardar usa una transacción: si falla una matrícula o una marca, no guarda parcialmente el resto. Cambios de jornada, fila de asistencia y matrícula requieren recargar antes de sobrescribir. Si aparece un error, el formulario conserva las marcas escritas; guarda una referencia antes de recargar si necesitas compararlas.

Guarda antes de cambiar de curso/fecha o salir de la pantalla. No hay almacenamiento sin conexión ni recuperación automática después de cerrar o recargar la página.

## Corregir una jornada publicada

1. Carga el curso y fecha.
2. Pulsa **Despublicar para corregir**. La familia deja de ver sus marcas de esa jornada.
3. Corrige y guarda el borrador.
4. Publica otra vez cuando esté completo.

Las correcciones conservan la jornada y quedan auditadas. No hay botón para borrar una jornada. Una marca puede volver a Sin marcar mientras la jornada esté en borrador; debe completarse antes de volver a publicar.

## Permisos y reglas

| Cuenta | Registro por curso | Consulta |
|---|---|---|
| Dirección | Todos los cursos permitidos | Jornadas y marcas |
| Secretaría | Sin captura/publicación | Borradores y publicados |
| Docente | Solo cursos con asignación activa y ficha activa | Sus cursos |
| Padre/tutor | Sin captura/publicación | Marcas publicadas de sus hijos autorizados |
| Estudiante | Sin captura/publicación | Marcas publicadas propias |

Guardar, publicar o despublicar exige curso y gestión activos, fecha no futura según America/La_Paz, año de la gestión y un trimestre ABIERTO que contenga la fecha. Un curso/gestión inactivo o trimestre cerrado queda en consulta. No se deduce el calendario escolar ni se bloquean sábados/feriados: todavía no hay calendario de días lectivos.

La lista completa admite hasta 500 matrículas por jornada; si supera el límite avisa y no permite captura. El selector admite hasta 500 cursos visibles. El resumen de Asistencia conserva su límite de 100 registros cargados; esto no recorta la lista del formulario. Los porcentajes mensuales siguen las reglas ya documentadas en README.

## Validación y siguiente fase

La fase se probó localmente con PostgreSQL embebido, RLS real y Auth simulado, incluyendo borradores, publicación, corrección, privacidad familiar, matrículas históricas, rollback, versiones y revocación de permisos. La compilación y pruebas se detallan en `VALIDACION_WEB.md`.

No se conectó a tu Supabase remoto ni se aplicó allí la migración. Antes de datos del colegio repite este flujo en tu instancia con un curso y fichas ficticias: guarda borrador, revisa que la familia no lo vea, publica, comprueba la consulta y despublica para corregir.

La siguiente fase será captura y publicación de calificaciones por materia. Administración web de cuentas, horarios, informes/exportación, móvil, notificaciones y funcionamiento sin conexión siguen pendientes.
