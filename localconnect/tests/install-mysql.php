<?php
if(PHP_SAPI!=='cli') exit;
$root=dirname(__DIR__);
$db=new PDO('mysql:host=127.0.0.1;port=13307;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$name='localconnect_install_'.time();
$db->exec('CREATE DATABASE '.$name.' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$config=['driver'=>'mysql','host'=>'127.0.0.1;port=13307','database'=>$name,'username'=>'root','password'=>'','secure_cookie'=>false];
$path=$root.'/var/install-mysql-config.php';
file_put_contents($path,"<?php return ".var_export($config,true).";\n");
putenv('LC_CONFIG='.$path); putenv('LC_ADMIN_PASSWORD='.bin2hex(random_bytes(20)));
require $root.'/scripts/install.php';
if((int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()!==1) throw new RuntimeException('Producción debe crear únicamente un administrador.');
if((int)$db->query('SELECT COUNT(*) FROM businesses')->fetchColumn()!==6) throw new RuntimeException('Faltan comercios demo.');
echo "Instalador MySQL de producción verificado.\n";
