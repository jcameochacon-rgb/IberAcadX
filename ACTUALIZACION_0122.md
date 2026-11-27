# IberAcad 0.12.2 — Consultas y filtros

## Actualizar el proyecto que ya publicaste

Haz una copia de tu proyecto. Esta entrega parte de 0.12.1 y no incorpora modificaciones que hayas realizado después en tu computadora.

Para conservar tu vinculación Expo y el APK, copia solamente estos archivos de esta entrega a las mismas rutas de tu proyecto:

- apps/web/src/lib/data/management.ts
- apps/web/src/lib/data/management.test.ts
- apps/web/src/app/panel/gestion/[seccion]/page.tsx
- apps/web/src/components/crud-table.tsx
- apps/web/src/app/panel/usuarios/page.tsx

No reemplaces apps/mobile/app.json, tus variables de entorno ni la configuración de Expo/Vercel. No hay dependencias nuevas ni migraciones SQL. Si modificaste alguno de esos cinco archivos, combina los cambios en vez de sobrescribirlos.

Sube los cambios al repositorio conectado a Vercel y despliega. La aplicación móvil que abre esa misma URL mostrará la nueva web al recargar, sin recompilar el APK.

## Cambios

- Estudiantes: CI, teléfono, dirección, RUDE, nacimiento, género y matrícula activa con curso y gestión. Indica cuando no hay matrícula activa.
- Docentes: CI, contacto, dirección y especialidad. Tutores: datos de contacto y estado.
- Fichas: búsqueda de varias palabras en nombres/apellidos, CI y teléfono. Selector para buscar por RUDE en estudiantes y especialidad en docentes.
- Estado en estudiantes, docentes, tutores, cursos, asignaciones y matrículas. Género en estudiantes; grado y gestión en cursos. Los filtros se conservan al cambiar página y se aplican antes de paginar.
- Matrículas: fechas de ingreso y salida.
- Tablas compartidas: búsqueda sin distinguir tildes ni mayúsculas y con varias palabras; orden A–Z/Z–A y limpiar filtros.
- Cuentas: CI, teléfono, dirección y filtro por rol cuando hay varios roles visibles.

## Foto de perfil

La versión revisada muestra iniciales calculadas a partir del nombre en panel-shell.tsx. No existe un formulario de subida de imagen ni almacenamiento de fotos de perfil en esta versión. Esta actualización no añade fotos.

Para implementar fotos compartidas entre web y móvil se necesita un bucket de Supabase Storage, permisos por usuario, validación de tamaño/tipo, carga y eliminación de archivos y guardar la referencia de la foto. No debe guardarse únicamente en el dispositivo.

## Verificación

68 pruebas web aprobadas, tipos web/móvil y lint aprobados. La comprobación de filtros se realizó con pruebas de consultas simuladas; requiere revisión final con tus datos en la web publicada.
