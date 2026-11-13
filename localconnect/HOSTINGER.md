# Publicar LocalConnectTucuman en Hostinger Premium

Esta versión usa React compilado + PHP + MySQL. Hostinger no necesita ejecutar Node.js: Node solo se usa para compilar en tu computadora.

## 1. Elegir el sitio

Entrar a hPanel y elegir un dominio/subdominio propio o un dominio temporal que el panel ofrezca. `LocalConnectTucuman` es el nombre del proyecto, no confirma la existencia de un dominio como `.com` o `.com.ar`. Usar un sitio nuevo o una carpeta de dominio vacía. No reemplazar un sitio existente sin respaldo.

Configurar PHP 8.2 o superior, habilitar `pdo_mysql` y HTTPS. En esta versión la aplicación se instala en la raíz del dominio/subdominio, no en una subcarpeta.

## 2. Crear la base de datos

En el apartado MySQL de hPanel crear una base y un usuario asociado con permisos sobre esa base. Anotar los nombres completos con su prefijo `u...` y el host que indique Hostinger. La contraseña se guarda únicamente en el archivo privado del servidor, no en el chat ni en Git.

## 3. Subir el paquete

El ZIP de `release/LocalConnectTucuman-Hostinger.zip` contiene:

```text
carpeta-del-dominio/
  public_html/
    index.html
    .htaccess
    assets/
    api/
  localconnect-private/
    scripts/install.php
    database/schema.sql
  localconnect-config.example.php
  LEER-ANTES-DE-INSTALAR.md
```

Subir/extractar el contenido respetando esta estructura. En particular, `.htaccess` debe incluirse. El archivo real de configuración y el instalador quedan FUERA de `public_html`.

Copiar `localconnect-config.example.php` como `localconnect-config.php` en la carpeta del dominio (al lado de `public_html`), completar host, base, usuario y contraseña y conservar `secure_cookie => true`. No poner ese archivo en `public_html/api`.

## 4. Crear tablas y cuenta administradora

Usar la conexión SSH que hPanel permita para el hosting. Desde la carpeta del dominio:

```bash
export LC_CONFIG="$PWD/localconnect-config.php"
read -rp 'Email de administrador: ' LC_ADMIN_EMAIL
export LC_ADMIN_EMAIL
read -rsp 'Contraseña nueva (mínimo 12 caracteres): ' LC_ADMIN_PASSWORD
echo
export LC_ADMIN_PASSWORD
php localconnect-private/scripts/install.php
unset LC_ADMIN_PASSWORD
```

La contraseña se escribe en una entrada oculta y no queda incrustada en el comando. El instalador crea tablas, una cuenta administradora, la galería simulada, seis comercios y publicaciones de ejemplo. No crea las cuentas demo locales. Si ya hay usuarios, no sobrescribe datos existentes.

Si no hay SSH disponible, importar `database/schema.sql` con phpMyAdmin y completar la instalación por una conexión administrativa segura; el paquete no expone un instalador web público. No subir un archivo con contraseñas de administración dentro de `public_html`.

## 5. Verificación en producción

1. Abrir el dominio con `https://` y comprobar que aparecen los seis comercios.
2. Iniciar sesión como administrador. Abrir Perfil → Panel de administración.
3. Crear una cuenta de comercio y un negocio. Comprobar que queda pendiente; aprobarlo desde administración.
4. Crear una cuenta de visitante, guardar un favorito y recargar. Debe persistir.
5. Buscar Librería Norte y calcular ruta desde Acceso lateral: la ruta común usa escaleras; la accesible usa el ascensor.
6. Generar el QR de la entrada desde el dominio publicado y abrirlo con otro dispositivo.
7. Publicar y editar una promoción, escribir una reseña, reportarla y resolver el reporte.
8. Confirmar que las URLs públicas no permiten leer `localconnect-config.php` ni ejecutar el instalador.

## Actualizaciones

Compilar nuevamente y subir el nuevo contenido de `dist` a `public_html`, conservando el archivo de configuración privado y la base. Hacer respaldo de la base desde hPanel antes de cambios de esquema. El instalador inicial no es un sistema de migraciones.

## Diagnóstico

- **“Falta configurar la conexión…”**: revisar el nombre y ubicación del archivo privado o `LC_CONFIG`.
- **“No se pudo conectar…”**: revisar nombres completos, host, contraseña y asociación del usuario con la base.
- **No se mantiene la sesión**: usar HTTPS y verificar cookies habilitadas; no desactivar `secure_cookie` en producción.
- **Pantalla HTML en vez de JSON**: comprobar PHP y que el archivo `/api/index.php` exista en la raíz pública.
- **Error 500 por `.htaccess`**: revisar el registro de errores del hosting; confirmar que Apache/LiteSpeed permita las directivas del archivo.
- **Fotos no disponibles**: las URL externas pueden caducar. Editarlas desde el panel.

La carga del paquete y las pruebas en Hostinger requieren una sesión del titular de la cuenta. No se ha comprado ni registrado ningún dominio con este proyecto.
