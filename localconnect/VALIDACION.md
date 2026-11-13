# Registro de validación

Fecha: 9 de noviembre de 2026.

- Compilación TypeScript estricta y build Vite de producción: correcta.
- Sintaxis de los archivos PHP: correcta con PHP 8.4.
- Instalador de producción probado sobre una base MariaDB vacía: crea el esquema, una única cuenta administradora y seis comercios demo.
- Pruebas de integración HTTP: 18/18 sobre SQLite y 18/18 sobre MariaDB 11.4 mediante PDO MySQL.
- Verificación visual: inicio, búsqueda/directorio, ingreso efectivo de administrador, perfil, dashboard y rutas interiores en navegador.
- Ruta demo desde Acceso lateral a Librería Norte: 74 m con escaleras y 172 m por ascensor con accesibilidad activada.
- Versión compilada servida directamente por PHP: inicio, navegación al plano y generación del QR correctos.
- Vista móvil de 390 px: sin desbordamiento horizontal; menú inferior y controles visibles.

Las pruebas cubren autorización, protección CSRF, restricción de escalamiento de roles, limitación de intentos de ingreso, favoritos entre sesiones, aprobación de comercios, propiedad de registros, publicaciones vencidas, edición y eliminación de publicaciones, reseñas únicas, moderación, reportes, recorridos entre pisos, conexiones cerradas, origen inválido, conexiones entre pisos inválidas, notificaciones privadas y revocación de sesión/cuenta.

Las pruebas no constituyen verificación del entorno de Hostinger: faltan allí el dominio definitivo, la base, la configuración, TLS y la comprobación de extremo a extremo. El QR físico debe probarse en un teléfono después de publicar.

