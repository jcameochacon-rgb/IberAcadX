# Fase 3: fichas, tutores, cursos y matrículas

Esta versión permite guardar registros desde la web usando la sesión de Supabase de Dirección o Secretaría. No crea cuentas de Authentication ni cambia roles.

## Actualizar una instalación v0.2

1. Conserva tu configuración `apps/web/.env.local` de forma privada. Copia sus valores a la nueva carpeta si descomprimes esta entrega en otro lugar. El ZIP no contiene credenciales.
2. En el mismo proyecto Supabase donde instalaste la base inicial, abre SQL Editor y ejecuta **completo** `supabase/migrations/202610060001_gestion_academica.sql`. No ejecutes otra vez `202610050001_base.sql` ni `02_primer_director.sql` si ya están instalados.
3. Ejecuta `supabase/04_verificar_gestion_academica.sql`. Debe mostrar cuatro funciones con `security_definer = false`, ejecución habilitada para `authenticated` y deshabilitada para `anon`.
4. Desde la nueva carpeta `iberdrola-a`, ejecuta `npm ci` y `npm run dev`. Reinicia el servidor si estaba abierto.
5. Abre `http://localhost:3000/login`. Entra con una cuenta que tenga un perfil activo `DIRECTOR` o `SECRETARIA`.
6. Abre **Gestión académica** en el menú o `http://localhost:3000/panel/gestion/estudiantes`.

Para un proyecto Supabase nuevo: instala primero la migración inicial, después la de esta fase, crea la primera cuenta de Dirección siguiendo `docs/CONFIGURACION_WEB.md` y configura `.env.local`.

## Primer registro de extremo a extremo

1. **Cursos → Nuevo curso:** selecciona gestión y grado, escribe el paralelo (A, B o hasta dos letras) y registra. El paralelo se convierte a mayúsculas. Una vez creado, estas claves no se modifican; solo se cambia su estado activo.
2. **Tutores → Nuevo tutor:** registra sus nombres y datos de contacto. CI, apellidos, dirección y teléfono pueden quedar vacíos cuando aún no se conocen.
3. **Estudiantes → Nuevo estudiante:** registra nombres y los datos disponibles, incluido RUDE y nacimiento si se conocen. CI y RUDE son únicos cuando se rellenan; la fecha de nacimiento no puede ser futura.
4. En la ficha del estudiante, usa **Tutores vinculados**. Busca al tutor, selecciónalo, completa parentesco y marca el permiso de consulta y/o contacto principal. Al cambiar el principal, el anterior deja de serlo en la misma transacción.
5. Pulsa **Matricular**. Busca el paralelo, elige curso y fecha de ingreso dentro del año de su gestión. Se registra una matrícula activa. No se permiten matrículas superpuestas para el mismo estudiante y gestión.
6. Recarga la ficha y comprueba el tutor y la matrícula. Los módulos de consulta y el resumen se actualizan con los datos autorizados por Supabase.

Las búsquedas de fichas y matrículas consultan la base completa por nombre o apellido y muestran páginas de 25 registros, incluidos inactivos. Cursos se buscan por paralelo. Los selectores devuelven hasta 50 coincidencias: precisa la búsqueda si no encuentras una persona. El selector de cursos usa paralelo y muestra el año junto al curso.

## Editar y conservar el historial

- La lista de Gestión académica permite abrir cada ficha mediante **Editar**.
- Desactivar un estudiante o tutor conserva sus relaciones. Un tutor inactivo no obtiene permisos familiares aunque el vínculo siga autorizado. Los formularios no borran fichas.
- Para cambiar un vínculo, abre **Editar vínculo** dentro de la ficha del estudiante. Se pueden cambiar parentesco, autorización y contacto principal. Estudiante y tutor deben estar activos para actualizarlo; desactivar el tutor revoca sus consultas en la base.
- Para retirar/finalizar una matrícula, edítala, cambia estado e indica fecha de salida. La base impide dejar asistencias o calificaciones fuera de su vigencia.
- Para trasladar, cierra primero la matrícula anterior y registra otra sin superponer fechas. El día de salida forma parte de la matrícula anterior, por lo que el siguiente ingreso debe ser posterior.
- Un aviso de edición simultánea obliga a recargar y revisar antes de guardar. Protege tanto la ficha como los datos personales, cursos y matrículas.
- Cada RPC usa una transacción, permisos de la sesión y RLS. Un error no deja una persona huérfana ni cambia parcialmente el contacto principal. La auditoría existente registra el actor.

## Qué hacer ante un error

| Mensaje | Acción |
|---|---|
| Falta instalar la migración | Ejecuta el SQL de esta fase en el mismo proyecto de tu `.env.local`. |
| Ya existe ese CI, RUDE, curso o matrícula | Busca el registro existente antes de crear otro. |
| Otra persona modificó la ficha | Recarga la página, revisa los cambios y vuelve a editar. |
| Matrícula fuera de su gestión | Corrige las fechas para que pertenezcan al año del curso. |
| Matrículas superpuestas | Revisa el intervalo de la matrícula anterior. |
| Acceso restringido | Entra con un perfil activo de Dirección o Secretaría. |

## Alcance y verificación

Están implementados registro/edición de estudiantes y tutores, creación/estado de cursos, vínculos familiares y matrícula/edición/cierre. Crear la ficha de un tutor o estudiante **no le crea acceso al login**. La administración web de cuentas, docentes/asignaciones, captura de notas y asistencia, horarios editables, informes y app móvil siguen pendientes.

Se verifican permisos/integridad con PostgreSQL embebido y flujos web con Auth local simulado. No se conectó a tu Supabase remoto ni se aplicó allí la migración. Comprueba el primer flujo con personas ficticias antes de cargar datos reales.
