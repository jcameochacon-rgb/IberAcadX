# IberAcad 0.10.0 — Actualización integral

## Instalar sobre tu versión 0.9.3
1. Conserva tu archivo `apps/web/.env.local` y reemplaza el código por esta carpeta. No subas ese archivo a repositorios públicos.
2. En Supabase > SQL Editor, ejecuta **una sola vez** `supabase/ACTUALIZAR_093_A_010.sql`. Este archivo reúne las tres migraciones nuevas. No vuelvas a ejecutar las migraciones anteriores ni las tres nuevas individualmente después de ejecutarlo.
3. Conserva las variables públicas existentes. Para invitar usuarios desde el sistema agrega `SUPABASE_SECRET_KEY` a las variables **del servidor**. Obtén la clave secreta del proyecto de Supabase; nunca uses `NEXT_PUBLIC_` para ella.
4. Conserva `NEXT_PUBLIC_SITE_URL` con la URL de tu aplicación y autoriza `/auth/callback` en la configuración de URLs de Authentication. Las invitaciones requieren el correo transaccional de Supabase configurado y están sujetas a sus límites.
5. Ejecuta `npm ci`, `npm run build` y `npm run start`. Para desarrollar: `npm run dev`. En tu alojamiento vuelve a desplegar y configura las mismas variables.
6. Comprueba con tus cuentas reales: administrador, Secretaría, docente, estudiante y padre. No se incluyeron cuentas, claves ni datos privados en el paquete.

## Qué cambia
- Portada azul y blanca con libro 3D CSS que gira al desplazarse, sin cargar una librería 3D pesada. Respeta movimiento reducido.
- Páginas independientes: Institución, Vida escolar, Trayectoria y Contacto y ubicación. Mapa exacto suministrado por el propietario.
- Navbar también en el login, logos más grandes y bienvenida inclusiva. Footer compartido, excluido de acceso, registro y recuperación; no aparece al imprimir informes.
- Resumen por rol: familia y estudiante priorizan resultados, asistencia y horario; docente y administración priorizan seguimiento operativo.
- Sidebar agrupado por funciones. Formularios de asistencia, calificaciones y horarios accesibles directamente desde su módulo.
- Gestión de cuentas por invitación, consulta, modificación del rol, activación y eliminación del acceso institucional. Secretaría no puede administrar cuentas DIRECTOR ni SECRETARIA. Cada usuario tiene protegida su propia cuenta frente a eliminación accidental.
- CRUD de asignaturas y eliminación de fichas sin dependencias. Las referencias académicas existentes impiden borrar datos relacionados; se conserva la alternativa de desactivar fichas.
- Secretaría puede registrar asistencia y calificaciones. El docente conserva el alcance de sus asignaciones. Familias y estudiantes conservan consultas autorizadas.
- Eliminación de asistencia y calificaciones en borrador con confirmación. Para borrar datos publicados primero hay que retirar su publicación. Las reglas de integridad y cierre de trimestre siguen vigentes.
- Informes: generación/consulta e impresión existentes, más guardado, cambio de nombre y eliminación de filtros personales para administración. Eliminar un informe guardado no modifica las notas ni asistencias originales.
- Comunicados eliminado de navegación, formularios, consultas de portada y panel. Las tablas antiguas se trasladan al esquema privado `archivo`, sin acceso para usuarios de la aplicación. No se destruye el historial. Las migraciones antiguas permanecen como historial técnico de instalación.

## Cuentas y roles existentes
No cambies los roles manualmente: `DIRECTOR` se presenta como Administrador; `SECRETARIA` como Personal administrativo. Se mantienen los UUID y roles existentes para conservar compatibilidad. Antes de invitar a un estudiante, docente o padre, registra su ficha correspondiente. La eliminación desde Gestión de usuarios elimina su perfil/acceso institucional; la identidad en Authentication y los datos académicos se conservan. Si existen dependencias se rechazará la eliminación y puedes desactivar la cuenta.

## Verificación
- Compilación de producción y comprobación de TypeScript realizadas.
- 32 pruebas de validación web y 10 pruebas de base de datos/permisos de la actualización.
- Las pruebas históricas de 0.9.3 describen permisos antiguos y el módulo de comunicados retirado; se conservan como referencia, no son la suite actual de aceptación.
- No se aplicaron cambios a tu Supabase remoto ni se desplegó en un alojamiento. No se pudo hacer la revisión visual en el navegador remoto por falta de acceso al servidor local. Debes comprobar el correo de invitación, CAPTCHA y tus datos reales en tu entorno configurado.

## Instalación nueva
Ejecuta todas las migraciones de `supabase/migrations` en orden. No ejecutes además el SQL consolidado de actualización.
