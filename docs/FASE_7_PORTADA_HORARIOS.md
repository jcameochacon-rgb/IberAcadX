# Fase 7: página principal pública y horarios

Versión 0.7 · 9 de octubre de 2026. Conserva gestión académica, asistencia y calificaciones. No se conectó al Supabase remoto ni se aplicaron allí las migraciones.

## Actualizar desde v0.6 en Windows

1. Descomprime el ZIP en una carpeta nueva. Conserva la entrega anterior y copia su `apps/web/.env.local` a la misma ubicación en la nueva carpeta.
2. En Supabase → SQL Editor ejecuta completo `supabase/migrations/202610090002_registro_horarios.sql`. No repitas la migración inicial ni el primer director.
3. Ejecuta `supabase/10_verificar_registro_horarios.sql`. Deben aparecer cuatro RPC con `security_definer=false`, `authenticated=true` y `anon=false`. La segunda consulta muestra los periodos actuales.
4. Abre PowerShell en la nueva carpeta `iberdrola-a` y ejecuta:

```powershell
npm ci
npm run dev
```

5. Abre http://localhost:3000 para ver la portada. **Iniciar sesión** abre `/login`; desde allí puedes volver a la página principal.
6. Dentro de la cuenta, abre **Horarios → Ver horario semanal**.

Desde v0.5, instala antes `202610090001_registro_calificaciones.sql`. Desde versiones anteriores instala las migraciones que falten por orden de nombre, siguiendo las guías de cada fase. Una base nueva necesita las seis migraciones y la configuración de Auth descrita en `CONFIGURACION_WEB.md`.

Esta migración añade cuatro funciones, sin borrar bloques ni inventar horas. La portada funciona sin Supabase; los módulos privados siguen requiriendo configuración y sesión.

## Información de la portada

Incluye navegación a El colegio, Historia y Contacto, identificación RUE, niveles indicados por el directorio, dirección, teléfono publicado, búsqueda de la dirección en Maps y acceso al sistema. Los enlaces externos usan `noopener noreferrer`.

Fuentes proporcionadas por el usuario, consultadas el 9 de octubre de 2026:

- [Reseña histórica](https://historiadelaunidadedicayivaiberdrola.blogspot.com/2023/09/historia-de-la-unidad-educativa.html): se conserva la atribución al blog, sin trasladar a A reconocimientos específicos de B.
- [Ficha de Iberdrola A](https://unidadeducativa.net/cerca-de-mi-ubicacion/unidades-educativas/el-alto/fiscales/iberdrola-a/RUE/40730423/): los datos de contacto son del directorio y no se confirmaron directamente con la institución.

Se omitieron cantidades de estudiantes/docentes, programas internacionales/inglés, infraestructura no descrita, leyendas y cualquier supuesta misión, visión, autoridad o calendario de inscripción sin respaldo. Las fuentes originales aparecen en el pie de página.

Los niveles mencionados en el directorio no amplían el sistema: los módulos continúan siendo de Primaria y turno tarde conforme a lo acordado. La ilustración vectorial es simbólica, no una fotografía; el icono no se presenta como escudo oficial. No se copiaron fotografías de menores ni se incorporaron mapas embebidos, rastreadores o formularios externos.

Los datos públicos están en `apps/web/src/lib/school.ts` y la portada en `apps/web/src/app/page.tsx`. No hay editor administrativo del contenido. Se mantiene la configuración de no indexación del proyecto; publicar e indexar requiere una decisión de despliegue posterior.

## Configurar periodos

Dirección o Secretaría debe preparar cursos, docentes y asignaciones de materias activas. Registrar una ficha docente no crea su cuenta Auth; se conserva el procedimiento de fase 4.

1. Selecciona un curso y pulsa **Cargar horario**.
2. Abre **Configurar horas de los periodos**.
3. Introduce las horas reales: cada periodo dura 40 minutos, dentro de 14:00–18:05 y sin superposición.
4. Marca la confirmación y guarda cada periodo. Sus horas son compartidas por **todos los cursos de la misma gestión**, no solo el seleccionado.
5. Configura los seis periodos en el orden real. No se inventa un recreo ni la ubicación de los cinco minutos libres del turno. Si la institución requiere otra duración o un recreo mayor, debe revisarse la regla acordada antes de cambiarla.

Cada guardado de periodo es independiente; no hay guardado masivo de los seis. Para desplazar horas existentes hacia más tarde puede ser necesario comenzar por el último periodo para evitar una superposición temporal; si se adelantan, revisar desde el primero. Un error no cambia el periodo enviado ni los demás.

La base inicial trae seis periodos sin horas para 2026. Si Dirección crea otra gestión por SQL, debe crear también sus seis periodos. La pantalla avisa si faltan. Esta fase no añade administración web de gestiones.

## Registrar, editar y retirar clases

1. En **Nuevo bloque**, selecciona una materia/docente de las asignaciones activas del curso.
2. Elige un día de lunes a viernes y un periodo configurado; pulsa **Añadir bloque**.
3. No se permite repetir curso/día/periodo ni ocupar al mismo docente en dos cursos en ese bloque. Las restricciones existen en la base, también frente a guardados simultáneos.
4. Pulsa **Editar bloque** para cambiar materia, día o periodo. Se conserva el curso. Para otro curso, retira el bloque y créalo allí.
5. Para quitar una clase, abre la edición, marca la confirmación y pulsa **Retirar bloque**. Se elimina del horario actual y conserva constancia y valores anteriores en auditoría. No hay papelera ni botón de deshacer; puede registrarse manualmente otra vez si sigue siendo válido.

Los cambios guardados son visibles inmediatamente para las cuentas autorizadas: no hay borradores ni publicación adicional. Sin asignar no significa recreo ni suspensión. La vista es una semana tipo de la gestión, no un calendario con fechas, feriados o reemplazos diarios.

Cursos/gestiones inactivos permiten consulta y retiro de bloques para liberar cruces, pero no altas o edición. La asignación, docente y materia deben estar activos para guardar. Desactivar una asignación no borra automáticamente su horario: la administración verá el aviso y deberá revisarlo.

## Permisos y control de cambios

- Dirección y Secretaría: configurar periodos y crear/editar/retirar bloques.
- Docente: consulta de sus cursos, sin captura. Se conservan las RLS existentes: una materia ajena puede mostrarse como no visible para su rol.
- Padre/tutor y Estudiante: consulta de los cursos vinculados, sin administración.
- Anónimo o sin perfil activo: ningún dato académico; solo portada pública.

Se comprueban versiones de bloque, periodo y asignación. Un cambio de otra persona provoca rechazo antes de sobrescribir; el formulario conserva lo escrito tras el error. Guarda una referencia de tus cambios antes de recargar. Retirar requiere además confirmación y versión vigente.

El selector admite hasta 500 cursos visibles. La semana carga todos los bloques del curso, sin el límite de 100 registros del resumen. Guarda antes de cambiar de curso, editar otro bloque, configurar periodos o salir. No hay funcionamiento sin conexión ni recuperación tras cerrar o recargar.

## Validación antes de datos reales

Las pruebas usan PostgreSQL embebido con SQL/RLS reales y Auth simulado. No prueban JWT reales, la Data API remota completa ni tu despliegue. Repite en tu Supabase con fichas ficticias: configura un periodo, añade una clase, intenta un cruce del docente en otro curso, comprueba la consulta docente/familiar y retira el bloque de prueba con una cuenta administrativa.

Consulta `VALIDACION_WEB.md` para resultados y `docs/preview` para capturas. Nunca ejecutes el bootstrap de pruebas en Supabase.

Siguiente fase propuesta: gestión y publicación de comunicados. Siguen pendientes administración web de cuentas, editor institucional, informes/exportación, aplicación móvil y notificaciones push.
