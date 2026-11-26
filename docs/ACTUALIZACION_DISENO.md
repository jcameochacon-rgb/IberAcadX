# IberAcad v0.9.2 — rediseño visual

Actualización exclusivamente visual sobre v0.9.1. Se revisaron la imagen de portada, el video de aproximadamente 10 segundos y la captura del panel facilitados por el usuario. Se adaptan sus recursos visuales a la identidad educativa de Iberdrola A.

## Cambios

- Portada azul profundo con degradados, luz ambiental, fotografía con perspectiva, tarjetas translúcidas y botones blancos.
- Conservación de las ocho imágenes originales: escudo del colegio, logo IberAcad y seis fotografías.
- Galería con acercamiento suave y elevación de tarjetas; aparición de las secciones al desplazarse.
- Login, recuperación y actualización de contraseña con fondo azul claro y formulario blanco redondeado.
- Panel con barra lateral clara, área blanca de trabajo, tarjetas de indicadores en azul, celeste y lavanda, y estilos comunes para formularios, tablas y botones.
- Estados académicos y avisos conservan sus colores semánticos: errores en rojo, advertencias en ámbar y estados favorables en verde.
- Interacciones de botones, navegación y tarjetas; movimiento ambiental en elementos decorativos. Los controles permanecen estables para pulsarlos con facilidad.
- Respeto de la preferencia del sistema «reducir movimiento». Sin JavaScript, la información pública permanece visible.
- Diseños verificados a 1440, 390 y 320 píxeles. Las tablas anchas mantienen desplazamiento horizontal interno.

No se añadieron módulos ni se modificaron autenticación, CAPTCHA, roles, permisos, consultas, cálculos académicos o migraciones SQL. No se incorporaron los contenidos financieros ni los datos de ejemplo de las referencias al sistema.

## Instalar sobre v0.9.1

1. Conserva tu carpeta actual y tu archivo `apps/web/.env.local`.
2. Extrae el ZIP nuevo en otra carpeta.
3. Copia tu `.env.local` a `apps/web/.env.local` en la carpeta nueva. Conserva las claves de Supabase y la clave pública de Turnstile que ya configuraste.
4. Abre una terminal en la raíz del proyecto nuevo, donde está el `package.json` principal.
5. Ejecuta `npm ci` y después `npm run dev`.
6. Abre `http://localhost:3000`. Si otro servidor usa ese puerto, detenlo antes de iniciar esta versión.

No copies `node_modules` ni `.next` de la versión anterior. Esta actualización no requiere ejecutar SQL ni crear otra vez las cuentas. Las cuentas y datos permanecen en el mismo proyecto Supabase indicado en tu `.env.local`.

Para producción ejecuta `npm run build` y despliega el proyecto con las mismas variables de entorno. No se ha desplegado esta versión ni modificado tu instancia remota desde aquí.

## Verificación

Se revisaron capturas internas de portada, login y panel en escritorio y móvil. Las capturas de prueba no se incluyen en el ZIP. `tests/browser/design.spec.ts` comprueba adaptación, movimiento reducido, revelado de contenido y navegación. Los flujos existentes verifican portada, autenticación, módulos de demostración e informes; el CAPTCHA se comprueba con proveedores simulados. Consulta `VALIDACION_WEB.md` para los resultados.
