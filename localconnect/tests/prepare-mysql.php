<?php
// Base aislada de integración. Nunca apuntar a una base de producción.
if(PHP_SAPI!=='cli') exit;
$root=dirname(__DIR__);
$db=new PDO('mysql:host=127.0.0.1;port=13307;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$name='localconnect_test_'.time();
$db->exec('CREATE DATABASE '.$name.' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$db->exec('USE '.$name);
$db->exec(file_get_contents($root.'/database/schema.sql'));
$source=new PDO('sqlite:'.$root.'/var/localconnect.sqlite');
foreach(['users','categories','galleries','floors','nodes','edges','businesses','favorites','posts','reviews','reports','notifications'] as $table) {
    foreach($source->query('SELECT * FROM '.$table)->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $q=$db->prepare('INSERT INTO '.$table.' (`'.implode('`,`',array_keys($row)).'`) VALUES ('.implode(',',array_fill(0,count($row),'?')).')');
        $q->execute(array_values($row));
    }
}
$config=['driver'=>'mysql','host'=>'127.0.0.1;port=13307','database'=>$name,'username'=>'root','password'=>'','secure_cookie'=>false];
file_put_contents($root.'/var/mysql-test-config.php',"<?php return ".var_export($config,true).";\n");
echo 'Base de integración MySQL creada con esquema y datos: '.$name.PHP_EOL;
