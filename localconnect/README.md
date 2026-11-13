# LocalConnect Tucumán

Proyecto académico: descubrimiento de comercios y orientación interior en galerías.

## Tecnología

- Interfaz: React 19 + TypeScript, Vite, Lucide y QRCode.
- Backend: PHP 8.2 o superior, PDO, sesiones de servidor y API JSON.
- Producción: MySQL/MariaDB, preparado para Hostinger Premium.
- Desarrollo sin servidor MySQL: SQLite con el mismo modelo relacional. Los datos se guardan en `var/localconnect.sqlite`, fuera del directorio público.
- Rutas: Dijkstra sobre un grafo bidireccional ponderado; la alternativa accesible excluye escaleras y conexiones no accesibles.

## Funcionalidades

Visitantes: registro, inicio/cierre de sesión, búsqueda por nombre/categoría, filtros, fichas de comercios, contacto externo, favoritos persistentes, reseñas, reportes, promociones y productos, perfil y notificaciones internas.

Comercios: alta y edición de su negocio, publicaciones/promociones/productos, horarios, información de contacto, imagen mediante URL, asociación a un punto interior. Un alta o edición del comercio requiere revisión administrativa antes de publicarse.

Administración: métricas calculadas desde la base, aprobación y rechazo de comercios, gestión de usuarios y roles, categorías, publicaciones, moderación de reseñas y reportes, notificaciones, galerías, pisos, puntos y conexiones.

Navegación interior: selección de galería/piso/origen/destino, plano SVG interactivo, cálculo y visualización del recorrido, distancias, opción accesible, tramos deshabilitados, códigos QR descargables que abren el punto de origen.

## Ejecutar en esta computadora

Las dependencias y una base de demostración ya están preparadas. Desde PowerShell, dentro de esta carpeta:

También podés abrir **INICIAR-LOCALCONNECT.cmd** con doble clic.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Abrir `http://127.0.0.1:8080/`. Mantener esa terminal abierta. El servidor escucha solamente en esta computadora. No es el despliegue público.

### Cuentas de demostración LOCAL

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | admin@localconnect.test | AdminLocal2026! |
| Comercio | comercio@localconnect.test | ComercioDemo2026! |
| Visitante | visitante@localconnect.test | VisitanteDemo2026! |

Son cuentas de prueba. El instalador de producción NO crea las cuentas de comercio y visitante ni usa estas contraseñas. La contraseña administradora de producción se define durante la instalación.

## Instalación en otra computadora

Requisitos: Node.js 22, PHP 8.2+ con PDO y `pdo_sqlite` (desarrollo) o `pdo_mysql` (producción).

```powershell
npm ci
$env:LC_ADMIN_PASSWORD = 'elegi-una-clave-local-de-12-caracteres'
php scripts/install.php --local
npm run build
$env:LC_CONFIG = (Resolve-Path config.local.php).Path
php -S 127.0.0.1:8080 -t dist
```

Para desarrollo con recarga en caliente, iniciar el backend en `8080` con raíz `public`, y `npm run dev` en otra terminal. Vite publica `http://127.0.0.1:5173/` y reenvía `/api` al backend.

## Validación

```powershell
npm run build
npm test
```

Las pruebas HTTP usan una COPIA de la base local en `var/integration.sqlite`, levantan PHP en el puerto 18081 y cierran ese servidor al terminar. Verifican roles, CSRF, registro, limitación de intentos, favoritos entre sesiones, aprobación, propiedad de comercios, publicaciones vencidas, reseñas/moderación, rutas entre pisos, accesibilidad, cierres de tramos y revocación de acceso. Requieren las cuentas demo locales originales. La ruta de PHP se puede cambiar con `PHP_BIN`.

## Publicación

Seguir `HOSTINGER.md`. Ejecutar `npm run build` y luego `python scripts/package-release.py`. El paquete resultante se guarda en `release/LocalConnectTucuman-Hostinger.zip`.

## Estructura

```text
src/App.tsx                Sitio público, navegación y sesión
src/Admin.tsx              Panel de administración y comercio
src/MapView.tsx            Plano interactivo, recorridos y códigos QR
src/api.ts                 Cliente HTTP con token CSRF
src/ui.tsx                 Componentes y formularios reutilizables
src/styles.css             Estilos adaptables
public/api/index.php       Endpoints y reglas de autorización
public/api/bootstrap.php   Conexión PDO, sesión y validaciones
public/api/routes.php      Algoritmo de camino más corto
database/schema.sql        Modelo MySQL con claves foráneas
scripts/install.php        Instalación CLI y datos demo
tests/api.test.mjs         Pruebas HTTP de integración
```

## Alcance y límites explícitos

- La galería inicial, sus distancias, comercios y reseñas son simulados. No hay seguimiento GPS interior ni posicionamiento continuo.
- Los planos se editan como puntos y conexiones. No incluye importación automática de PDF/CAD ni reconstrucción de planos reales.
- Los enlaces QR deben regenerarse desde el dominio publicado; un QR generado en localhost solo sirve en esa computadora.
- Contacto se realiza con enlaces a WhatsApp/teléfono/web; no hay chat interno ni procesamiento de pagos.
- Las notificaciones son internas. No hay email transaccional, recuperación por email ni push móvil configurado.
- Las imágenes comerciales se cargan mediante URL. Las fotografías demo se sirven desde Unsplash y las fuentes desde Google Fonts; hay alternativas visuales si no cargan.
- Las cuentas desactivadas pierden el acceso en su siguiente petición. No se permite que el administrador desactive su propia cuenta desde el panel.
- Las contraseñas se almacenan con `password_hash`; la sesión usa cookie HttpOnly, SameSite y Secure en producción; los cambios requieren token CSRF y consultas preparadas.
- Este repositorio incluye un prototipo académico funcional. La disponibilidad pública, TLS, dominio y conexión a la base del hosting deben comprobarse al publicar.
