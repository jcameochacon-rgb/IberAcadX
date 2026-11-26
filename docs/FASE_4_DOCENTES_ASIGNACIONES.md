# Fase 4: docentes y asignación de materias

Versión 0.4, 6 de octubre de 2026. La web incorpora Docentes y Asignaciones dentro de Gestión académica. Dirección y Secretaría gestionan los registros; los docentes conservan únicamente su alcance autorizado por Supabase. En v0.11, abre **Gestión de Cursos → Asignación de materias** para administrar esas relaciones.

## Actualizar desde v0.3

1. Descomprime esta entrega en una nueva carpeta y conserva tu configuración privada copiando `apps/web/.env.local` de la versión anterior.
2. En SQL Editor del **mismo proyecto Supabase**, ejecuta completo `supabase/migrations/202610060002_docentes_asignaciones.sql`. No vuelvas a ejecutar la migración inicial ni el primer director.
3. Ejecuta `supabase/05_verificar_docentes_asignaciones.sql`: deben aparecer dos RPC con `security_definer=false`, permiso de ejecución para authenticated y sin permiso para anon; también el trigger `aa_docente_historial`.
4. Desde la carpeta `iberdrola-a`, ejecuta `npm ci` y `npm run dev`. Reinicia el servidor anterior si seguía abierto.
5. Abre `http://localhost:3000/login`, entra con Dirección o Secretaría y accede a **Gestión académica → Docentes**.

Si vienes de v0.2, instala primero `202610060001_gestion_academica.sql` y luego esta migración. Para un proyecto nuevo, instala las tres migraciones en orden de nombre y configura la cuenta inicial según `CONFIGURACION_WEB.md`.

## Registrar un docente

1. Pulsa **Nuevo docente**.
2. En Datos personales elige **Crear una ficha personal** si no existe. Completa nombres y los datos disponibles; apellidos, CI, teléfono, dirección y especialidad son opcionales.
3. Si la persona ya existe, por ejemplo como tutor, elige **Usar una ficha personal existente**. Busca por nombre, apellido o CI, selecciona la persona y completa especialidad/estado. Este alta reutiliza la persona y conserva sus datos existentes.
4. Pulsa Registrar. Al guardar se abre la ficha y permite editar sus datos.

Una persona solo tiene una ficha de docente; CI no se puede duplicar cuando se rellena. Si una persona tiene varias fichas, editar sus nombres/contacto modifica la persona compartida. Las versiones de persona y docente se comprueban para evitar sobrescribir una edición reciente. Secretaría no puede editar datos personales de cuentas con rol Director o Secretaría.

## Asignar materias

1. Crea el curso si aún no existe.
2. Abre **Gestión de Cursos → Asignación de materias → Registrar**.
3. Busca y selecciona docente, curso y materia. El curso muestra su grado, paralelo y gestión. El catálogo incluye las nueve materias de la base inicial; esta fase no añade edición del catálogo.
4. Conserva Asignación activa marcada y pulsa Registrar.
5. Abre **Ver asignaciones** desde el docente o curso para consultar su lista. La búsqueda usa nombres/apellidos del docente; los filtros por docente/curso se conservan al buscar y paginar.

Cada curso tiene una sola asignación por materia, incluso si está inactiva. Ante un duplicado, abre la asignación existente y edítala o reactívala. La gestión se obtiene del curso, evitando mezclar años.

Para crear o reactivar deben estar activos el docente, curso, gestión y materia. Desactivar una asignación existente está permitido aunque alguna referencia ya esté inactiva; conserva la fila y sus registros. Desactivar al docente también conserva las asignaciones y revoca su acceso operativo.

## Edición e historial

- Curso, gestión y materia son claves conservadas en una asignación existente.
- Se puede corregir el docente mientras la asignación no tenga horarios, criterios de evaluación, notas trimestrales, avances ni observaciones.
- Una vez que tiene actividad, el campo Docente queda fijo. La base también rechaza ese cambio por escritura directa, no solo desde el formulario. Se puede activar/desactivar sin borrar el historial.
- Un relevo docente a mitad de gestión después de registrar actividad requiere un modelo de responsabilidad por periodos, todavía pendiente; esta fase no transfiere esos registros a otra persona.
- Las fichas y asignaciones no se borran desde esta web. Un aviso de edición simultánea exige recargar y revisar antes de guardar.

## Dar acceso al docente para iniciar sesión

Registrar la ficha no crea una cuenta Auth. Para la primera conexión de cada docente, el administrador configura el vínculo:

1. Crea la cuenta con su correo y contraseña en **Supabase → Authentication → Users**.
2. Abre la ficha del docente en la web. Copia el UUID que aparece tras `?id=` en su dirección.
3. Abre `supabase/06_vincular_cuenta_docente.sql` y cambia **solo las dos asignaciones al principio**: correo y UUID del docente. No reemplaces los textos de las comprobaciones posteriores.
4. Ejecuta completo ese archivo desde SQL Editor. Vincula la cuenta existente con esa persona y el rol DOCENTE; rechaza sobrescribir perfiles previos.
5. Inicia sesión en otra ventana privada con la cuenta docente. Debe ver sus cursos; estudiantes aparecen cuando tienen matrícula en esos cursos. Un docente ajeno no obtiene acceso.

El modelo actual admite una cuenta y un rol institucional por persona. Si ya tiene un perfil PADRE u otro rol, el script exige revisar ese caso; no lo convierte automáticamente en DOCENTE. En v0.11, las cuentas se administran desde **Gestión de usuarios**; los accesos familiares requieren una ficha activa de tutor y el personal administrativo usa el rol existente SECRETARIA.

## Verificación y límites

Las pruebas se ejecutaron con PostgreSQL embebido y Auth local simulado. Se comprobaron RPC/RLS, alta atómica, reutilización, duplicados, versiones, referencias activas, revocación de alcance, bloqueo del historial y vinculación de cuenta sin sobrescritura.

No se conectó a tu Supabase remoto ni se aplicó allí esta migración. Repite el flujo con fichas ficticias antes de datos del colegio. Captura de asistencia y calificaciones, edición de horarios, cuentas desde web, informes, aplicación móvil y notificaciones siguen pendientes.
