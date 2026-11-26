# IberAcad 0.11.0 — Navegación y vistas por operación

## Instalar hoy

1. Haz una copia de tu proyecto y conserva `apps/web/.env.local`.
2. Reemplaza el código con esta versión y restaura ese archivo de configuración. Usa Node.js 22.12 o posterior.
3. Si ya instalaste la base de datos de **0.10**, no ejecutes SQL adicional. Si vienes de **0.9.3**, sigue `ACTUALIZACION_010.md` y aplica una sola vez `supabase/ACTUALIZAR_093_A_010.sql`. No repitas la instalación inicial ni crees de nuevo tus cuentas existentes.
4. Desde la carpeta del proyecto ejecuta `npm ci`, `npm run build` y `npm run start`. Para desarrollo usa `npm run dev`. Si usas alojamiento, vuelve a desplegar esta carpeta conservando las variables de entorno.
5. Inicia sesión con tus cuentas reales y realiza la comprobación final indicada abajo.

## Qué cambia

- Diseño blanco y azul, espaciado uniforme, botones separados, formularios con ancho limitado y tablas con desplazamiento horizontal.
- Seis grupos desplegables; al abrir uno se cierran los demás. Submenús con iconos lineales, flechas y líneas guía.
- **Gestión de Cursos** incluye las fichas de cursos, la **Asignación de materias** y **Matrículas**, donde Dirección y Secretaría pueden asignar estudiantes a cursos. **Gestión de usuarios** abre una búsqueda de cuentas y un botón separado para crear usuarios por correo con sus datos personales: Administrador, Estudiante, Personal administrativo, Docente o Padre/tutor. Se crea la ficha correspondiente y la invitación lleva a configurar una contraseña. También expone las fichas de padres/tutores, las cuentas familiares vinculadas a tutores activos y las fichas/cuentas del personal administrativo (rol `SECRETARIA`, administradas por Dirección).
- Las operaciones Registrar, Consultar, Editar y Eliminar tienen rutas de estado propias dentro del mismo módulo. Las vistas de consulta no acumulan formularios de creación y eliminación.
- En cuentas, asignaturas y fichas, Editar/Eliminar primero permiten seleccionar un registro. En asistencia y calificaciones se mantiene la captura por planilla, curso y periodo; la eliminación usa una selección separada y confirmación. Horarios permite seleccionar el bloque correspondiente.
- Informes distingue generación, consulta, modificación de parámetros guardados y eliminación de informes guardados. Eliminar un informe no elimina los datos académicos de origen.
- Menú móvil lateral con fondo superpuesto, cierre mediante Escape y control de foco. Respeta movimiento reducido.
- El selector de rol existe exclusivamente en `/demo` cuando está habilitada. Sus datos y cambios son ficticios y temporales. En producción, el rol proviene de la sesión autenticada.

## Permisos

| Cuenta                                 | Acceso                                                                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador (`DIRECTOR`)             | Todas las operaciones de gestión, incluidas las cuentas de Secretaría.                                                                                                                       |
| Personal administrativo (`SECRETARIA`) | CRUD académico, fichas de tutores y accesos DOCENTE/PADRE/ESTUDIANTE. El servidor impide administrar cuentas DIRECTOR o SECRETARIA y elevar usuarios a esos roles.                           |
| Docente                                | Consulta de estudiantes, asignaturas y horarios; registro, consulta, edición y eliminación de asistencia/calificaciones de sus asignaciones; generación y consulta de informes de su ámbito. |
| Estudiante                             | Consulta de sus asignaturas, horario, asistencia, calificaciones e informes.                                                                                                                 |
| Padre, si ya existe                    | Conserva consultas autorizadas de sus hijos; no se elimina este rol existente.                                                                                                               |

Las restricciones de integridad continúan vigentes: un registro relacionado no se elimina indiscriminadamente; las notas/asistencias publicadas requieren retirar la publicación antes de borrar y los periodos cerrados conservan sus restricciones. Las cuentas reales no pueden cambiar su rol mediante el selector de demostración.

## Verificación realizada

- Compilación de producción y comprobación TypeScript correctas.
- 38 pruebas de lógica web y navegación aprobadas.
- 10 pruebas locales de actualización y permisos SQL aprobadas, incluyendo protección de administradores frente a Secretaría, aislamiento docente y reportes por propietario.
- Los tests de navegador en `tests/browser/management.spec.ts` verifican el acceso a la asignación de materias, las cuentas familiares y el personal administrativo. Se ejecutaron con Chromium y datos ficticios locales; no se conectaron a Supabase real.

Para repetirlas en tu equipo, instala el navegador de Playwright (`npx playwright install chromium`) y ejecuta `npx playwright test tests/browser/management.spec.ts`. Se utilizan datos ficticios locales, sin conectarse a tu proyecto de Supabase.

## Última fase pendiente: instalación y aceptación

1. **Escritorio y móvil:** abre cada acordeón, confirma que el anterior se cierre y prueba el botón hamburguesa a 390 px de ancho. Revisa que los botones y formularios no se superpongan.
2. **Administrador y Secretaría:** crea un registro de prueba, consúltalo, edítalo y elimínalo dentro de su mismo módulo. Comprueba que Secretaría no pueda modificar una cuenta de administrador, tampoco mediante una petición directa.
3. **Docente:** verifica que solo aparezcan sus cursos y que asistencia/calificaciones de otros docentes no sean accesibles. Prueba un borrador y su eliminación.
4. **Estudiante:** comprueba que solo pueda consultar sus datos y no aparezcan acciones de escritura.
5. **Publicación:** verifica el dominio, HTTPS, CAPTCHA y URLs de retorno de Supabase. Esta entrega es código actualizado; no modifica ni despliega tu instalación remota automáticamente.

La app Expo muestra la web adaptable dentro de una WebView, por lo que comparte sus módulos, autenticación y permisos; no son pantallas nativas independientes.
