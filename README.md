# LocalConnect Demo

Proyecto académico para descubrir comercios de Tucumán y explorar recorridos interiores en galerías.

**Sitio publicado:** https://lavender-ferret-315265.hostingersite.com/

## Proyecto

El código está en [`localconnect/`](localconnect/): React + TypeScript para la interfaz, PHP para la API y MySQL/MariaDB en producción. El desarrollo local también admite SQLite.

Incluye registro y sesiones, perfiles de comercios, favoritos, reseñas, publicaciones, moderación, panel de administración y navegación interior con recorridos accesibles y códigos QR. Los comercios y planos iniciales son simulados para la demostración académica.

## Instalación

Requisitos: Node.js 22 y PHP 8.2+ con PDO y `pdo_sqlite`.

Desde PowerShell:

```powershell
cd localconnect
npm ci
$env:LC_ADMIN_PASSWORD = Read-Host 'Contraseña del administrador local (mínimo 12 caracteres)'
php scripts/install.php --local
Remove-Item Env:LC_ADMIN_PASSWORD
npm run build
$env:LC_CONFIG = (Resolve-Path config.local.php).Path
php -S 127.0.0.1:8080 -t dist
```

Abrí http://127.0.0.1:8080. La cuenta administradora local es `admin@localconnect.test`, con la contraseña elegida durante la instalación.

## Documentación

- [Funciones, desarrollo y pruebas](localconnect/README.md)
- [Instalación en Hostinger](localconnect/HOSTINGER.md)
- [Guion de demostración](localconnect/DEMO.md)
- [Validaciones realizadas](localconnect/VALIDACION.md)
- [Esquema SQL](localconnect/database/schema.sql)

Las configuraciones privadas, bases locales, dependencias y paquetes generados están excluidos del repositorio. `config.example.php` es una plantilla: las credenciales reales de producción se guardan fuera de `public_html`. Las cuentas de demostración documentadas son exclusivamente locales.
