# Fase 9 · Informes académicos y exportación

Versión 0.9 · 13 de octubre de 2026. No se modificó tu Supabase remoto ni se desplegó el proyecto.

## Actualizar desde v0.8

1. Extrae el ZIP en una carpeta nueva y conserva la entrega anterior. Copia tu `apps/web/.env.local` a la misma ubicación de la nueva versión.
2. En Supabase → SQL Editor ejecuta `supabase/migrations/202610130001_informes.sql`.
3. Ejecuta `supabase/12_verificar_informes.sql`. Se espera una fila con `security_definer=false`, `authenticated=true` y `anon=false`.
4. Desde la carpeta `iberdrola-a`, ejecuta `npm ci` y `npm run dev`.
5. Inicia sesión y abre **Informes** en el menú lateral.

Desde versiones anteriores instala las migraciones faltantes por orden de nombre. Una instalación nueva necesita las ocho migraciones y la configuración Auth de `CONFIGURACION_WEB.md`. No repitas la base ni el primer director en una instalación existente. La nueva migración es reaplicable, añade una función de consulta y no modifica los datos académicos.

## Calificaciones

Selecciona **Calificaciones publicadas**, el curso y un trimestre de la misma gestión. Pulsa **Generar informe**. Se muestra una fila por calificación publicada y matrícula, con estudiante, RUDE, materia, SER, SABER, HACER, autoevaluación, puntos extra, nota final y situación.

El cálculo procede de la vista existente: conserva redondeo y tope de 100. No calcula promedio anual, promoción ni una nueva ponderación. Borradores y materias sin calificación publicada no aparecen; su ausencia no equivale a cero. Las matrículas retiradas con información autorizada se conservan en el informe histórico.

## Asistencia

Selecciona **Resumen de asistencia**, el curso y un rango de fechas del año de la gestión. Los extremos se incluyen. El trimestre se ignora en este tipo de informe.

Se agrupan presentes (A), faltas (F), retrasos (R), licencias (L) y días con marca publicada por matrícula. El porcentaje de presencia es `(A + R) / (A + F + R + L) × 100`, igual que en la vista de resumen existente. Las licencias están en el denominador. Un día sin registro no es falta; no se inventa calendario lectivo ni se incluyen jornadas en borrador. Un alumno sin marcas publicadas en ese rango no genera fila.

## Descargar e imprimir

- **Descargar CSV** genera UTF-8 con BOM, separador punto y coma, comillas escapadas y saltos de línea preservados. Incluye colegio, curso, gestión, periodo y fecha de generación UTC. Los textos con posible fórmula se prefijan con apóstrofo. En Excel, si no detecta las columnas, usa Datos → Desde texto/CSV y elige UTF-8 y punto y coma; importa RUDE como texto para conservar ceros iniciales. No es un archivo XLSX.
- **Preparar impresión / PDF** abre una vista sin menú. Pulsa **Imprimir / Guardar PDF** y elige Guardar como PDF en el diálogo del navegador. Se propone A4 horizontal con encabezado de tabla repetido. Desactiva encabezados y pies automáticos del navegador si no quieres la URL. El PDF se genera mediante impresión; no hay un motor PDF en Supabase ni subida del documento.
- Cada descarga o apertura para imprimir consulta nuevamente los datos. Una publicación o retiro posterior a la vista puede cambiar el resultado. La fecha de generación permite distinguir consultas.
- Se devuelven todas las filas autorizadas hasta 5000. Si se supera el límite, se muestra un error; no se entrega un archivo truncado. Los selectores admiten hasta 500 cursos y 500 trimestres. No hay búsqueda ni exportación masiva de toda la institución.

Los informes son documentos de consulta, no libretas oficiales ni certificados firmados. El ejemplo PDF en `docs/preview/informe-ejemplo-ficticio.pdf` contiene únicamente datos de prueba.

## Permisos

Se utiliza `security invoker`, la sesión del usuario y las RLS existentes. Dirección/Secretaría ven lo permitido por su rol; docentes ven sus calificaciones y asistencia autorizada; tutores/estudiantes solo registros familiares o propios publicados. No se usa `service_role`. La ruta CSV comprueba sesión y perfil y responde con `private, no-store`. La vista de impresión también exige sesión. Las descargas no se registran como lecturas de comunicados ni se envían a terceros.

Comprueba primero en tu Supabase con datos ficticios: publica una nota y una jornada, contrasta los valores con el formulario original, consulta con una familia, intenta acceder a un curso ajeno y revisa el CSV. Las pruebas locales usan SQL/RLS reales y Auth simulado; no prueban tu JWT remoto ni tu despliegue. No ejecutes los scripts de pruebas en la base real.

La administración de cuentas continúa con el procedimiento existente. Recuerda: el UUID de Authentication identifica la cuenta; el UUID de `public.docentes` identifica la ficha docente que se vincula.

Siguiente fase propuesta: administración de cuentas y vinculación de perfiles desde la web. Continúan pendientes aplicación móvil y notificaciones push.
