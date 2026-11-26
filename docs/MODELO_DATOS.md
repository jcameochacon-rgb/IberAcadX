# Modelo implementado

Los UUID identifican registros; CI y RUDE se guardan como texto para conservar ceros y complementos. La edad se deriva de la fecha de nacimiento y no se guarda.

| Tabla | Uso y relaciones principales |
|---|---|
| personas | Nombres, apellidos, CI, contacto y dirección; identidad sin cuenta obligatoria |
| perfiles | UUID de auth.users, persona única, rol y habilitación |
| estudiantes | Persona, RUDE, género, nacimiento y habilitación |
| docentes | Persona, especialidad y habilitación |
| tutores | Persona y habilitación |
| estudiante_tutor | Relación muchos a muchos, parentesco, consulta autorizada y contacto principal |
| configuracion | Institución, zona horaria y alcance fijo Primaria/tarde |
| gestiones | Año académico |
| grados | Primero a Sexto |
| cursos | Gestión, grado y paralelo |
| matriculas | Estudiante, curso/gestión, vigencia inclusiva y estado; conserva traslados |
| asignaturas | Nueve áreas iniciales, catálogo ampliable |
| asignaciones_docente | Docente responsable de una materia en un curso/gestión |
| periodos | Gestión, número 1 a 6 y horas configurables de 40 minutos |
| horarios | Curso, asignación/docente, día 1 a 5 y periodo |
| trimestres | Gestión, número 1 a 3, fechas y estado |
| criterios_evaluacion | Actividad, dimensión, máximo fijo y orden; asignación/trimestre |
| notas_criterios | Puntaje de matrícula en una actividad |
| calificaciones_trimestrales | Matrícula/asignación/trimestre, autoevaluación, extras, motivo y publicación |
| jornadas_asistencia | Una jornada por curso/fecha, estado de publicación |
| asistencias | Una marca A/F/R/L por jornada/matrícula |
| avances_curriculares | Tema, fecha, avance y asignación/trimestre |
| observaciones_estudiantes | Matrícula/asignación/trimestre, tipo, comentario y visibilidad familiar |
| comunicados | Autor, título, contenido, institucional/publicación |
| destinatarios_comunicado | Cada fila apunta a un curso o una cuenta, nunca ambos |
| lecturas_comunicado | Cuenta que leyó un comunicado y fecha |
| dispositivos | Token Expo y plataforma; propietario de la cuenta |
| auditoria | Actor, tabla, operación, valores anterior/nuevo y fecha |

## Claves compuestas que protegen las relaciones

Las tablas de evaluación y asistencia transportan `curso_id` y `gestion_id`, aunque puedan deducirse de otras relaciones. Se verifica su concordancia con claves foráneas compuestas; se incluyen para garantizar integridad dentro de PostgreSQL, no para mantener valores independientes.

Ejemplo: una nota referencia simultáneamente `(criterio_id, curso_id, gestion_id)` y `(matricula_id, curso_id, gestion_id)`. No puede asociar la actividad de 1ro A con un alumno de 2do A, aunque ambos UUID existan.

La evaluación se vincula a `matricula_id` y no solo a `estudiante_id`; así permanece ligada al curso y gestión donde se obtuvo. Una asignación conserva su ID al reemplazar al docente responsable; los horarios actualizan su referencia docente mediante FK y la auditoría conserva el cambio de responsable. Cambiar curso/gestión/asignatura de esa asignación exige otra asignación.

Las vigencias de matrícula son inclusivas. Para trasladar a un alumno que sale el 15 de marzo, la nueva matrícula empieza el 16 de marzo como mínimo. El registro anterior se finaliza o retira, nunca se cambia de curso. No se automatiza una equivalencia de notas entre cursos ni un promedio anual de traslado.

## Vistas

| Vista | Uso |
|---|---|
| v_calificaciones | SER, SABER, HACER, nota final, completitud y situación, respetando RLS |
| v_resumen_asistencia | Conteos mensuales A/F/R/L y porcentaje definido en README, jornadas publicadas |

Los informes se construirán sobre estas relaciones. Un informe debe contar `PENDIENTE` por separado y evitar clasificarlo como reprobado. El avance curricular solo da porcentaje si primero se registran todos los temas planificados; la base no inventa el denominador.
