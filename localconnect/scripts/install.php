<?php
// Solo CLI: nunca publicar este archivo dentro de public_html.
if(PHP_SAPI!=='cli') { http_response_code(404); exit; }
$root=dirname(__DIR__); $local=in_array('--local',$argv,true);
if($local) {
    if(!is_dir($root.'/var')) mkdir($root.'/var',0700,true);
    $config=['driver'=>'sqlite','path'=>$root.'/var/localconnect.sqlite','secure_cookie'=>false];
    file_put_contents($root.'/config.local.php',"<?php\nreturn ".var_export($config,true).";\n");
    $db=new PDO('sqlite:'.$config['path']); $db->exec('PRAGMA foreign_keys=ON');
} else {
    $path=getenv('LC_CONFIG') ?: dirname($root).'/localconnect-config.php';
    if(!is_file($path)) die("Falta el archivo de configuración. Ver README.md.\n");
    $config=require $path; $db=new PDO('mysql:host='.$config['host'].';dbname='.$config['database'].';charset=utf8mb4',$config['username'],$config['password']);
}
$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$schema=file_get_contents($root.'/database/schema.sql');
if($local) $schema=str_replace('INTEGER PRIMARY KEY AUTO_INCREMENT','INTEGER PRIMARY KEY AUTOINCREMENT',$schema);
$db->exec($schema);
if($db->query('SELECT COUNT(*) FROM users')->fetchColumn()>0) die("Base existente: no se modificaron cuentas ni datos.\n");
$adminPassword=getenv('LC_ADMIN_PASSWORD');
if(!$adminPassword || strlen($adminPassword)<12) die("Definí LC_ADMIN_PASSWORD con al menos 12 caracteres y ejecutá de nuevo.\n");
$adminEmail=getenv('LC_ADMIN_EMAIL') ?: 'admin@localconnect.test';
$insert=function(string $table,array $data) use($db) { $q=$db->prepare('INSERT INTO '.$table.'(`'.implode('`,`',array_keys($data)).'`) VALUES('.implode(',',array_fill(0,count($data),'?')).')'); $q->execute(array_values($data)); return (int)$db->lastInsertId(); };
$db->beginTransaction();
$insert('users',['name'=>'Administración','email'=>$adminEmail,'password'=>password_hash($adminPassword,PASSWORD_DEFAULT),'role'=>'admin']);
// Las cuentas demo solo se crean en modo local; nunca se publican contraseñas conocidas.
if($local) {
    $insert('users',['name'=>'Lucía · Comercio demo','email'=>'comercio@localconnect.test','password'=>password_hash('ComercioDemo2026!',PASSWORD_DEFAULT),'role'=>'merchant']);
    $insert('users',['name'=>'Tomás · Visitante demo','email'=>'visitante@localconnect.test','password'=>password_hash('VisitanteDemo2026!',PASSWORD_DEFAULT),'role'=>'visitor']);
}
foreach([['Alimentación','coffee'],['Moda','shirt'],['Salud y belleza','heart'],['Hogar y deco','house'],['Tecnología','smartphone'],['Librería','book']] as [$name,$icon]) $insert('categories',compact('name','icon'));
$insert('galleries',['name'=>'Galería del Centro · Demo','address'=>'San Miguel de Tucumán · escenario simulado','description'=>'Galería ficticia de dos pisos para demostrar orientación interior. Las distancias, comercios y conexiones son de prueba.','simulated'=>1]);
$insert('floors',['gallery_id'=>1,'name'=>'Planta baja','level'=>0]); $insert('floors',['gallery_id'=>1,'name'=>'Primer piso','level'=>1]);
$nodes=[
 [1,'Entrada principal','entry',450,510],[1,'Hall de bienvenida','hall',450,370],[1,'Pasillo oeste','hall',230,280],[1,'Pasillo este','hall',670,280],
 [1,'Local 01 · Café del Centro','shop',170,150],[1,'Local 02 · Estilo Urbano','shop',450,150],[1,'Local 03 · Verde Natural','shop',730,150],
 [1,'Ascensor PB','elevator',800,400],[1,'Escalera PB','stairs',100,400],[1,'Acceso lateral','entry',60,280],
 [2,'Ascensor P1','elevator',800,400],[2,'Escalera P1','stairs',100,400],[2,'Hall primer piso','hall',450,370],
 [2,'Pasillo oeste P1','hall',230,280],[2,'Pasillo este P1','hall',670,280],[2,'Local 04 · TecnoStore','shop',730,150],
 [2,'Local 05 · Casa Nativa','shop',450,150],[2,'Local 06 · Librería Norte','shop',170,150],
 ];
foreach($nodes as [$floor_id,$label,$kind,$x,$y]) $insert('nodes',compact('floor_id','label','kind','x','y'));
$edges=[[1,2,14,1],[2,3,24,1],[2,4,24,1],[3,5,15,1],[2,6,22,1],[4,7,15,1],[4,8,18,1],[3,9,18,0],[3,10,17,1],[8,11,8,1],[9,12,6,0],[11,15,18,1],[12,14,18,0],[13,14,24,1],[13,15,24,1],[15,16,15,1],[13,17,22,1],[14,18,15,1]];
foreach($edges as [$from_id,$to_id,$distance,$accessible]) $insert('edges',compact('from_id','to_id','distance','accessible'));
$shops=[
 ['Café del Centro',1,5,'Un café, una pausa y algo rico. Café de especialidad, pastelería artesanal y un rincón para encontrarte.','photo-1501339847302-ac426a4a7cbb','Lunes a sábados de 8:00 a 21:00'],
 ['Estilo Urbano',2,6,'Indumentaria con identidad. Descubrí nuestra selección de básicos, prendas y accesorios para todos los días.','photo-1441986300917-64674bd600d8','Lunes a sábados de 9:00 a 21:00'],
 ['Verde Natural',1,7,'Alimentos frescos, productos regionales y opciones naturales para acompañar tu día.','photo-1542838132-92c53300491e','Lunes a sábados de 8:30 a 20:30'],
 ['TecnoStore',5,16,'Tecnología cerca tuyo. Accesorios, audio y equipos con asesoramiento personalizado.','photo-1498049794561-7780e7231661','Lunes a sábados de 9:00 a 21:00'],
 ['Casa Nativa',4,17,'Objetos simples para habitar mejor. Diseño local, cerámica y decoración hecha con dedicación.','photo-1600210492486-724fe5c67fb0','Lunes a sábados de 10:00 a 20:00'],
 ['Librería Norte',6,18,'Tu próxima historia empieza acá. Libros, papelería y recomendaciones para todas las edades.','photo-1507842217343-583bb7270b66','Lunes a sábados de 9:00 a 20:30']
];
foreach($shops as [$name,$category_id,$node_id,$description,$photo,$hours]) $insert('businesses',['owner_id'=>$local?2:1,'category_id'=>$category_id,'node_id'=>$node_id,'name'=>$name,'description'=>$description,'address'=>'Galería del Centro · Tucumán (demo)','phone'=>'','hours'=>$hours,'image'=>'https://images.unsplash.com/'.$photo.'?auto=format&fit=crop&w=1000&q=85','price_level'=>'$$','status'=>'approved']);
$insert('posts',['business_id'=>1,'title'=>'Tu pausa favorita, por dos','content'=>'Promo de demostración: dos cafés de especialidad y dos medialunas. Consultá disponibilidad en el comercio.','type'=>'promotion','price'=>6500,'image'=>'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80']);
$insert('posts',['business_id'=>2,'title'=>'Nueva temporada, tu estilo','content'=>'Conocé la nueva colección de nuestro comercio de demostración.','type'=>'news']);
$insert('posts',['business_id'=>4,'title'=>'Auriculares inalámbricos','content'=>'Producto de ejemplo para la presentación académica.','type'=>'product','price'=>45900]);
if($local) { foreach([1,2,3,4] as $id) $insert('reviews',['user_id'=>3,'business_id'=>$id,'rating'=>5,'comment'=>'Reseña de demostración: muy buena atención y fácil de encontrar.']); }
$db->commit();
echo "Instalación completa. Cuenta administradora: $adminEmail\n";
