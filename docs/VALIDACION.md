# Validación de la base v0.1

Fecha: 5 de octubre de 2026. Resultado: **46 pruebas correctas** con `npm test`.

## Entorno y alcance

- Ejecución completa de la migración en PostgreSQL embebido mediante PGlite 0.5.8.
- Datos y cuentas ficticias en memoria.
- Simulación de `auth.uid()` y los roles PostgreSQL `anon`, `authenticated` y `service_role`.
- Ejecución del alta inicial de Dirección contra una cuenta ficticia existente y del SQL de comprobación.
- 28 tablas con RLS, 93 políticas por operación, 2 vistas con `security_invoker=true`.
- Datos iniciales: 6 grados, 9 áreas, gestión 2026, 3 trimestres planificados y 6 periodos sin horas inventadas.

## Cobertura de las pruebas

| Grupo | Casos comprobados |
|---|---|
| Instalación | SQL completo, catálogos, RLS, creación de primer director y consultas de comprobación |
| Notas | Actividades faltantes, bloqueo de publicación incompleta, redondeo de dimensión, máximo 100, motivo de extras, límite de puntaje, nota 50/51 |
| Integridad | Curso/gestión coincidentes por FK compuesta, duplicados, claves que no pueden moverse, matrículas sin solapamiento |
| Roles | Dirección, Secretaría de solo lectura en notas, docente responsable, otra materia del mismo curso, padre/tutor, estudiante |
| Aislamiento | Dos hijos asociados al mismo padre, compañeros ajenos, borradores, vistas calculadas y vínculo familiar revocado |
| Acceso público | SELECT negado para anónimo en las 28 tablas y vista de notas; sin perfil e inactivo sin registros ni catálogos |
| Publicación | Corrección mediante despublicar/corregir/publicar; bloqueo de notas/criterios/extras publicados |
| Asistencia | Lista incompleta, privacidad por hijo, presencia con retraso, bloqueo de jornadas publicadas y cierre trimestral |
| Horarios | Periodo sin hora, choque de docente, horas de periodos superpuestas y retiro de horas en periodo usado |
| Historial | Cambio de vigencia que invalidaría asistencia, fechas trimestrales con registros e imposibilidad de mover una matrícula |
| Comunicación | Docente sin avisos institucionales o a cursos ajenos, publicación por curso, lectura, destinatarios congelados y autor inmutable |
| Dispositivos | Token propio visible únicamente al propietario y alta rechazada para cuenta ajena |
| Información interna | Observaciones internas ocultas, auditoría con actor y sin permiso de escritura directa |
| Funciones | Resumen con privilegios elevados sin EXECUTE para clientes |

## Límites de esta validación

La prueba local no instala ni conecta a un proyecto Supabase. El esquema Auth se simula; no verifica contraseñas, invitaciones, verificación de correo, recuperación, JWT reales ni el ciclo de sesiones. No se han probado la Data API/PostgREST, SDK web/móvil, notificaciones, Realtime, Storage o interfaces.

Las pruebas son secuenciales, en una sola conexión. Se incorporaron bloqueos de filas para publicar/cerrar/editar y para la vigencia de matrículas, pero no se realizaron ensayos de concurrencia con múltiples conexiones ni mediciones de carga/latencia.

La matriz RLS no es una auditoría externa de seguridad. Se deben repetir los flujos con usuarios ficticios reales en el proyecto Supabase antes de cargar información de alumnos. El usuario propietario/SQL Editor y `service_role` tienen privilegios elevados; consultar como propietario no demuestra que la sesión de un padre esté aislada.

No se importaron apellidos, identificadores ni datos de menores de las planillas. La base de instalación solo lleva catálogos académicos.
