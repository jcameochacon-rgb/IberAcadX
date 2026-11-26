# Fase 6: registro y publicación de calificaciones

Versión 0.6, 9 de octubre de 2026. Añade actividades de evaluación y captura individual por materia y trimestre, conservando los datos y las funciones anteriores. No se aplicaron cambios en tu Supabase remoto.

## Actualizar desde v0.5 en Windows

1. Descomprime esta versión en una carpeta nueva. Conserva la anterior como respaldo y copia su `apps/web/.env.local` a la misma ubicación de la nueva carpeta. No compartas contraseñas ni claves secretas.
2. En Supabase → SQL Editor ejecuta completo `supabase/migrations/202610090001_registro_calificaciones.sql`. Desde v0.5 solo necesitas esta migración; no repitas la base inicial ni el primer director.
3. Ejecuta `supabase/09_verificar_registro_calificaciones.sql`. Deben aparecer tres funciones públicas con `security_definer=false`, `authenticated=true` y `anon=false`. También aparecen dos helpers privados de bloqueo con privilegios elevados, sin acceso anónimo; validan al actor antes de bloquear filas y no devuelven datos. Mantén `private` fuera de Exposed schemas.
4. Comprueba que el curso, gestión, docente y asignación estén activos y que el trimestre tenga fechas reales y estado ABIERTO. Si todavía falta el calendario, sigue `FASE_5_REGISTRO_ASISTENCIA.md` y adapta las variables de `supabase/08_configurar_trimestre_asistencia.sql`; el mismo calendario sirve para las notas. No sobrescribas fechas existentes ni inventes fechas para habilitar el formulario.
5. Abre PowerShell en la nueva carpeta `iberdrola-a`:

```powershell
npm ci
npm run dev
```

6. Abre http://localhost:3000/login. Inicia sesión con Dirección o un docente asignado. Entra en **Calificaciones → Registrar calificaciones**.

Si vienes de v0.4, instala primero `202610070001_registro_asistencia.sql`. Desde v0.3 instala antes `202610060002_docentes_asignaciones.sql`; desde v0.2 también `202610060001_gestion_academica.sql`. En una base nueva instala las cinco migraciones en orden de nombre y configura Auth y el primer director siguiendo `CONFIGURACION_WEB.md`.

## Configurar actividades de la materia

1. Selecciona **Curso y materia** y pulsa **Cargar materia**.
2. Selecciona el trimestre y pulsa **Cargar trimestre**. Se elige inicialmente un trimestre abierto de esa gestión, si existe.
3. Abre **Actividades de evaluación**. Añade al menos una actividad de SER, una de SABER y una de HACER.
4. Cada actividad tiene nombre y orden dentro de su dimensión. El orden no puede repetirse en la misma dimensión; el formulario propone el siguiente. Se admiten hasta 100 actividades por materia/trimestre.
5. Puedes cambiar nombre y orden, pero no la dimensión de una actividad existente. **Eliminar actividad sin notas** solo funciona si nadie tiene notas registradas en ella.

Las actividades son compartidas por los estudiantes de esa materia/trimestre. No puedes añadirlas, modificarlas o eliminarlas mientras exista alguna calificación publicada en esa combinación: primero debes despublicar las correspondientes. Agregar una actividad a borradores previamente completos los vuelve pendientes hasta registrar la nota nueva. Los errores de versión exigen recargar.

## Capturar y publicar

1. Elige **Estudiante** y pulsa **Cargar estudiante**. El selector muestra el estado y la nota final guardada. Incluye matrículas cuya vigencia coincida con el trimestre, aunque hoy estén retiradas.
2. Introduce el puntaje de cada actividad. Vacío significa pendiente; **0 es una nota registrada**. Se aceptan hasta dos decimales. Máximos por actividad: SER 10, SABER 45 y HACER 40.
3. Introduce autoevaluación entre 0 y 5. Puede quedar vacía en borrador.
4. Los puntos extra van de 0 a 100. Si son mayores que cero, escribe un motivo de hasta 500 caracteres. La nota final nunca supera 100.
5. Pulsa **Guardar borrador** para conservar un registro parcial. La familia todavía no puede verlo.
6. Con las tres dimensiones, todas sus actividades y la autoevaluación completas, pulsa **Guardar y publicar**. Guarda y publica esa calificación individual en una sola transacción. Si falla algo, no guarda una parte de las notas.
7. La familia autorizada puede consultar la nota publicada desde Calificaciones. No se envían correos ni notificaciones push.

Los recuadros superiores muestran los promedios y la nota final **guardados en la base**, no una simulación de lo que estás escribiendo. Se actualizan después de guardar. Si editas campos, aparece el aviso de cambios sin guardar.

Guarda antes de cambiar de estudiante, materia, trimestre, modificar actividades o salir. No hay guardado automático, almacenamiento sin conexión ni recuperación de lo escrito después de recargar/cerrar la página.

## Cómo calcula la nota

Se usa la vista existente `v_calificaciones`, sin duplicar resultados almacenados:

- Promedio simple de las actividades de cada dimensión, redondeado al entero: SER, SABER y HACER.
- Suma de esos tres promedios + autoevaluación + puntos extra; se redondea el total y se limita a 100.
- Falta cualquier actividad, dimensión o autoevaluación: PENDIENTE, sin nota final.
- Nota final de 51 a 100: APROBADO; de 0 a 50: REPROBADO.

Ejemplo: SER 8 y 9 → 9; SABER 42,5 → 43; HACER 38 → 38; autoevaluación 4 y extra 2 → **96**. Todas las actividades de una dimensión tienen igual peso. No hay ponderaciones personalizadas, promedio anual ni promoción automática en esta fase.

## Corregir y resolver conflictos

Para corregir una nota publicada, carga al estudiante y pulsa **Despublicar para corregir**. Esta operación no cambia los valores; oculta la nota a la familia. Corrige, guarda o publica de nuevo. Un trimestre cerrado impide guardar, publicar y despublicar incluso a Dirección; no hay formulario de cierre/reapertura en esta entrega.

El servidor comprueba una versión del registro que incluye notas, actividades, matrícula, asignación, trimestre y calificación. Si otra persona cambió alguno, rechaza el guardado antes de sobrescribir. El formulario conserva lo que escribiste tras un error; guarda una referencia de tus cambios antes de recargar y compararlos. La auditoría existente registra las escrituras y su actor.

## Permisos y límites

Dirección registra en las materias activas; cada docente solo en sus asignaciones activas. Un docente de otra materia del mismo curso no puede consultar ni cambiar esas notas. Secretaría tiene consulta, sin captura. Padre/tutor autorizado y Estudiante solo ven las notas publicadas que les corresponden. No se usa service_role en el navegador ni en las acciones de esta fase.

Los selectores de materias y trimestres admiten hasta 500 registros; avisan si es necesario un filtro adicional. La captura es individual, sin publicación masiva ni importación desde Excel. El resumen general conserva su límite de 100 registros; no limita las matrículas del selector del registro.

Se validó localmente con datos ficticios, PostgreSQL embebido y Auth simulado. Esto no verifica la emisión real de JWT ni toda la Data API remota. Antes de registrar notas reales, repite en tu Supabase con fichas ficticias: guarda borrador, revisa invisibilidad familiar, publica, comprueba consulta, despublica y verifica que se oculte. No ejecutes los bootstrap de pruebas en Supabase.

Próxima fase propuesta: registro y control de horarios. Siguen pendientes administración web de cuentas, informes/exportación, aplicación móvil y notificaciones.
