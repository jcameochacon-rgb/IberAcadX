# Actualización 0.12.0

## Aplicar sobre tu versión modificada

1. Haz una copia de tu proyecto actual y conserva `apps/web/.env.local` y `apps/mobile/.env`.
2. Extrae esta entrega en una carpeta nueva. Copia únicamente esos archivos de configuración a sus rutas correspondientes. No copies `node_modules`, `.next` ni `.expo` de versiones anteriores.
3. Desde la raíz `iberdrola-a`, ejecuta `npm ci` y después `npm run dev`.
4. Comprueba tu cuenta de administrador y una cuenta de cada rol. La demo se puede activar localmente con `ENABLE_DEMO=true`.
5. Sigue `docs/APP_MOVIL.md` para publicar la web. Todavía no hay una URL pública configurada ni un APK generado.

**No hay migraciones SQL nuevas en 0.12.** Se reutilizan las funciones de matrícula, asignación y cuentas existentes. La base revisada ya contiene esas funciones. No vuelvas a ejecutar todo el SQL ni borres tablas para instalar esta entrega.

## Cambios

- Cinco acordeones principales; se restauran Registrar, Consultar, Editar y Eliminar en Gestión de usuarios. Se mantienen los ocho nombres requeridos y las categorías adicionales de tu archivo.
- La ruta de cuentas comprueba permisos también al entrar directamente por URL.
- Matrícula editable desde Registro de estudiante → Editar → ficha del alumno. Incluye curso, gestión, fechas, estado y control de modificaciones concurrentes.
- Asignación de materia y curso desde Gestión de docente → Editar → ficha del docente.
- Invitación para elegir contraseña desde otro navegador, comprobación de CI/RUDE duplicados y reenvío de invitaciones pendientes desde la edición de cuenta. Las cuentas activadas usan Recuperar contraseña.
- Las invitaciones requieren `NEXT_PUBLIC_SITE_URL` HTTPS. Con `localhost`, se muestra una explicación y no se envía un enlace inutilizable en otro teléfono.
- Resúmenes por rol, menú público móvil plegable, mejores espacios y botones táctiles. Se conservan imágenes, logos, páginas institucionales y CAPTCHA.
- WebView móvil corregida para evitar importaciones circulares, zona segura, enlaces externos controlados, estados de carga/error y exportación nativa PDF/CSV.
- Perfil EAS `preview` para generar un APK Android; la app sigue necesitando Internet y la web publicada.

## Orden para completar registros reales

1. Mantén activa la gestión correspondiente y crea cursos, asignaturas y periodos.
2. Crea o revisa al docente; asigna sus cursos y materias.
3. Crea o revisa al estudiante; matricúlalo con una fecha dentro de la gestión.
4. Si existe una familia usuaria, vincula la ficha del tutor con el estudiante y autoriza la consulta.
5. Crea el acceso con invitación o vincula una persona existente desde Gestión de usuarios. Evita duplicar fichas que ya existen.
6. El destinatario abre su correo, define contraseña y entra en la web o app con la misma cuenta.
7. Registra y publica la información académica para que la puedan consultar estudiante y familia.

La creación de una cuenta no asigna automáticamente un curso ni inventa relaciones familiares. Las decide el personal autorizado. Un informe vacío no significa calificación cero.
