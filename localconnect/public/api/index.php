<?php
require __DIR__.'/bootstrap.php';
require __DIR__.'/routes.php';
$action=$_GET['action']??'catalog'; $method=$_SERVER['REQUEST_METHOD'];
if(!in_array($method,['GET','POST'])) fail('Método no permitido.',405);
if($method==='POST' && !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) fail('La sesión venció. Recargá la página.',419);
try {
if($method==='GET') {
    if($action==='session') out(['user'=>user(false),'csrf'=>$_SESSION['csrf']]);
    if($action==='catalog') {
        $u=user(false);
        $businesses=query("SELECT b.*,c.name category,n.label location,f.name floor,g.name gallery, (SELECT AVG(rating) FROM reviews r WHERE r.business_id=b.id AND r.status='published') rating,(SELECT COUNT(*) FROM reviews r WHERE r.business_id=b.id AND r.status='published') review_count FROM businesses b JOIN categories c ON c.id=b.category_id LEFT JOIN nodes n ON n.id=b.node_id LEFT JOIN floors f ON f.id=n.floor_id LEFT JOIN galleries g ON g.id=f.gallery_id WHERE b.status='approved' ORDER BY b.id")->fetchAll();
        out(['businesses'=>$businesses,'categories'=>query('SELECT * FROM categories ORDER BY id')->fetchAll(),'favorites'=>$u?array_column(query('SELECT business_id FROM favorites WHERE user_id=?',[$u['id']])->fetchAll(),'business_id'):[],'posts'=>query("SELECT p.*,b.name business_name FROM posts p JOIN businesses b ON b.id=p.business_id WHERE p.status='published' AND b.status='approved' AND (p.expires_at IS NULL OR p.expires_at>=?) ORDER BY p.id DESC",[date('Y-m-d')])->fetchAll()]);
    }
    if($action==='business') {
        $id=(int)($_GET['id']??0); $b=query("SELECT id FROM businesses WHERE id=? AND status='approved'",[$id])->fetch(); if(!$b) fail('Comercio no encontrado.',404);
        out(['reviews'=>query("SELECT r.*,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.business_id=? AND r.status='published' ORDER BY r.id DESC",[$id])->fetchAll()]);
    }
    if($action==='map') out(['galleries'=>query('SELECT * FROM galleries')->fetchAll(),'floors'=>query('SELECT * FROM floors ORDER BY level')->fetchAll(),'nodes'=>query('SELECT * FROM nodes')->fetchAll(),'edges'=>query('SELECT * FROM edges')->fetchAll()]);
    if($action==='route') {
        try { out(shortestRoute(query('SELECT * FROM nodes')->fetchAll(),query('SELECT * FROM edges')->fetchAll(),(int)($_GET['from']??0),(int)($_GET['to']??0),($_GET['accessible']??'0')==='1')); }
        catch(InvalidArgumentException $e) { fail($e->getMessage()); } catch(RuntimeException $e) { fail($e->getMessage(),422); }
    }
    if($action==='notifications') { $u=user(); out(query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',[$u['id']])->fetchAll()); }
    if($action==='manage') {
        $u=user(); if(!in_array($u['role'],['admin','merchant'])) fail('Se requiere una cuenta de comercio.',403);
        $where=$u['role']==='admin'?'':' WHERE b.owner_id=?'; $args=$u['role']==='admin'?[]:[$u['id']];
        out(['businesses'=>query('SELECT b.*,c.name category FROM businesses b JOIN categories c ON c.id=b.category_id'.$where.' ORDER BY b.id DESC',$args)->fetchAll(),'posts'=>query('SELECT p.*,b.name business_name FROM posts p JOIN businesses b ON b.id=p.business_id'.$where.' ORDER BY p.id DESC',$args)->fetchAll()]);
    }
    if($action==='admin') {
        admin(); out(['users'=>query('SELECT id,name,email,role,active,created_at FROM users ORDER BY id DESC')->fetchAll(),'reports'=>query('SELECT r.*,b.name business_name,u.name user_name FROM reports r JOIN businesses b ON b.id=r.business_id JOIN users u ON u.id=r.user_id ORDER BY r.id DESC')->fetchAll(),'reviews'=>query('SELECT r.*,u.name,b.name business_name FROM reviews r JOIN users u ON u.id=r.user_id JOIN businesses b ON b.id=r.business_id ORDER BY r.id DESC')->fetchAll(),'stats'=>['businesses'=>(int)query('SELECT COUNT(*) FROM businesses')->fetchColumn(),'users'=>(int)query('SELECT COUNT(*) FROM users')->fetchColumn(),'posts'=>(int)query('SELECT COUNT(*) FROM posts')->fetchColumn(),'reports'=>(int)query("SELECT COUNT(*) FROM reports WHERE status='pending'")->fetchColumn()]]);
    }
    fail('Recurso no encontrado.',404);
}
$b=body();
switch($action) {
case 'register':
    $name=textField($b,'name',100); $email=strtolower(textField($b,'email',190)); $password=textField($b,'password',200);
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)) fail('Ingresá un email válido.'); if(strlen($password)<10) fail('Usá una contraseña de al menos 10 caracteres.');
    if(query('SELECT id FROM users WHERE email=?',[$email])->fetch()) fail('Ya existe una cuenta con ese email.',409);
    $role=($b['role']??'visitor')==='merchant'?'merchant':'visitor';
    query('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',[$name,$email,password_hash($password,PASSWORD_DEFAULT),$role]);
    session_regenerate_id(true); $_SESSION['uid']=(int)$db->lastInsertId(); out(['user'=>user()],201);
case 'login':
    $email=strtolower(textField($b,'email',190)); $password=textField($b,'password',200); $key=hash('sha256',($_SERVER['REMOTE_ADDR']??'').':'.$email);
    $attempt=query('SELECT * FROM login_attempts WHERE key_hash=?',[$key])->fetch();
    if($attempt && (int)$attempt['attempts']>=8 && time()-(int)$attempt['last_attempt']<900) fail('Demasiados intentos. Volvé a intentar en 15 minutos.',429);
    $u=query('SELECT * FROM users WHERE email=?',[$email])->fetch();
    if(!$u || !$u['active'] || !password_verify($password,$u['password'])) {
        if($attempt) query('UPDATE login_attempts SET attempts=?,last_attempt=? WHERE key_hash=?',[time()-(int)$attempt['last_attempt']>900?1:(int)$attempt['attempts']+1,time(),$key]);
        else query('INSERT INTO login_attempts(key_hash,attempts,last_attempt) VALUES(?,1,?)',[$key,time()]);
        fail('Email o contraseña incorrectos.',401);
    }
    query('DELETE FROM login_attempts WHERE key_hash=?',[$key]); session_regenerate_id(true); $_SESSION['uid']=$u['id']; out(['user'=>user()]);
case 'logout': $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
case 'profile':
    $u=user(); $name=textField($b,'name',100);
    if(!empty($b['password'])) { $current=query('SELECT password FROM users WHERE id=?',[$u['id']])->fetchColumn(); if(!password_verify($b['current_password']??'',$current)) fail('La contraseña actual es incorrecta.'); $password=textField($b,'password',200); if(strlen($password)<10) fail('La nueva contraseña debe tener al menos 10 caracteres.'); query('UPDATE users SET password=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$u['id']]); }
    query('UPDATE users SET name=? WHERE id=?',[$name,$u['id']]); out(['user'=>user()]);
case 'favorite':
    $u=user(); $id=(int)($b['business_id']??0); if(!query("SELECT id FROM businesses WHERE id=? AND status='approved'",[$id])->fetch()) fail('Comercio no encontrado.',404);
    if(query('SELECT user_id FROM favorites WHERE user_id=? AND business_id=?',[$u['id'],$id])->fetch()) query('DELETE FROM favorites WHERE user_id=? AND business_id=?',[$u['id'],$id]);
    else query('INSERT INTO favorites(user_id,business_id) VALUES(?,?)',[$u['id'],$id]); out(['ok'=>true]);
case 'review':
    $u=user(); $id=(int)($b['business_id']??0); $rating=(int)($b['rating']??0); $comment=textField($b,'comment',2000); if($rating<1||$rating>5) fail('La valoración debe estar entre 1 y 5.');
    if(!query("SELECT id FROM businesses WHERE id=? AND status='approved'",[$id])->fetch()) fail('Comercio no encontrado.',404);
    if(query('SELECT id FROM reviews WHERE user_id=? AND business_id=?',[$u['id'],$id])->fetch()) query("UPDATE reviews SET rating=?,comment=?,status='published' WHERE user_id=? AND business_id=?",[$rating,$comment,$u['id'],$id]);
    else query('INSERT INTO reviews(user_id,business_id,rating,comment) VALUES(?,?,?,?)',[$u['id'],$id,$rating,$comment]); out(['ok'=>true]);
case 'report':
    $u=user(); $id=(int)($b['business_id']??0); $reviewId=empty($b['review_id'])?null:(int)$b['review_id'];
    if(!query("SELECT id FROM businesses WHERE id=? AND status='approved'",[$id])->fetch()) fail('Comercio no encontrado.',404);
    if($reviewId && !query('SELECT id FROM reviews WHERE id=? AND business_id=?',[$reviewId,$id])->fetch()) fail('Reseña inválida.');
    query('INSERT INTO reports(user_id,business_id,review_id,reason) VALUES(?,?,?,?)',[$u['id'],$id,$reviewId,textField($b,'reason',2000)]); out(['ok'=>true],201);
case 'business.save':
    $u=user(); if(!in_array($u['role'],['admin','merchant'])) fail('Se requiere una cuenta de comercio.',403);
    $id=(int)($b['id']??0); if($id) ownBusiness($id);
    $category=(int)($b['category_id']??0); if(!query('SELECT id FROM categories WHERE id=?',[$category])->fetch()) fail('Elegí una categoría.');
    $node=empty($b['node_id'])?null:(int)$b['node_id']; if($node && !query("SELECT id FROM nodes WHERE id=? AND kind='shop'",[$node])->fetch()) fail('Elegí un local del plano.');
    $status=$u['role']==='admin'?($b['status']??'approved'):'pending'; if(!in_array($status,['pending','approved','rejected'])) fail('Estado inválido.');
    $values=[$category,$node,textField($b,'name',120),textField($b,'description',5000),textField($b,'address',255),textField($b,'phone',40,false),textField($b,'instagram',100,false),safeUrl(textField($b,'website',255,false)),textField($b,'hours',255),safeUrl(textField($b,'image',500,false)),textField($b,'price_level',5),$status];
    if($id) query('UPDATE businesses SET category_id=?,node_id=?,name=?,description=?,address=?,phone=?,instagram=?,website=?,hours=?,image=?,price_level=?,status=? WHERE id=?',[...$values,$id]);
    else { query('INSERT INTO businesses(category_id,node_id,name,description,address,phone,instagram,website,hours,image,price_level,status,owner_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[...$values,$u['id']]); $id=(int)$db->lastInsertId(); }
    out(['id'=>$id,'status'=>$status]);
case 'business.status':
    admin(); $status=$b['status']??''; if(!in_array($status,['pending','approved','rejected'])) fail('Estado inválido.'); $business=ownBusiness((int)$b['id']);
    query('UPDATE businesses SET status=? WHERE id=?',[$status,$b['id']]); if($business['owner_id']) query('INSERT INTO notifications(user_id,message) VALUES(?,?)',[$business['owner_id'],'El estado de '.$business['name'].' cambió a '.$status.'.']); out(['ok'=>true]);
case 'post.save':
    $businessId=(int)($b['business_id']??0); ownBusiness($businessId); $id=(int)($b['id']??0);
    if($id) { $existing=query('SELECT business_id FROM posts WHERE id=?',[$id])->fetch(); if(!$existing) fail('Publicación no encontrada.',404); ownBusiness((int)$existing['business_id']); }
    $type=$b['type']??'news'; if(!in_array($type,['news','promotion','product'])) fail('Tipo inválido.'); $status=$b['status']??'published'; if(!in_array($status,['published','hidden'])) fail('Estado inválido.');
    $expires=empty($b['expires_at'])?null:$b['expires_at']; if($expires && (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$expires) || date('Y-m-d',strtotime($expires))!==$expires)) fail('Fecha inválida.');
    $price=($b['price']??'')===''?null:filter_var($b['price'],FILTER_VALIDATE_FLOAT); if($price!==null && ($price===false||$price<0||$price>9999999999)) fail('Precio inválido.');
    $v=[$businessId,textField($b,'title',160),textField($b,'content',5000),$type,$price,safeUrl(textField($b,'image',500,false)),$expires,$status];
    if($id) query('UPDATE posts SET business_id=?,title=?,content=?,type=?,price=?,image=?,expires_at=?,status=? WHERE id=?',[...$v,$id]); else query('INSERT INTO posts(business_id,title,content,type,price,image,expires_at,status) VALUES(?,?,?,?,?,?,?,?)',$v);
    out(['ok'=>true]);
case 'post.delete': $p=query('SELECT * FROM posts WHERE id=?',[(int)$b['id']])->fetch(); if(!$p) fail('Publicación no encontrada.',404); ownBusiness((int)$p['business_id']); query('DELETE FROM posts WHERE id=?',[$p['id']]); out(['ok'=>true]);
case 'category.save': admin(); $name=textField($b,'name',80); if(!empty($b['id'])) query('UPDATE categories SET name=? WHERE id=?',[$name,$b['id']]); else query('INSERT INTO categories(name,icon) VALUES(?,?)',[$name,'store']); out(['ok'=>true]);
case 'category.delete': admin(); $id=(int)$b['id']; if(query('SELECT id FROM businesses WHERE category_id=?',[$id])->fetch()) fail('La categoría tiene comercios asociados.'); query('DELETE FROM categories WHERE id=?',[$id]); out(['ok'=>true]);
case 'user.update':
    $u=admin(); $id=(int)$b['id']; if($id===(int)$u['id']) fail('No podés cambiar tu propio rol o desactivar tu cuenta.');
    $role=$b['role']??''; if(!in_array($role,['visitor','merchant','admin'])) fail('Rol inválido.'); query('UPDATE users SET role=?,active=? WHERE id=?',[$role,!empty($b['active'])?1:0,$id]); out(['ok'=>true]);
case 'report.resolve': admin(); query("UPDATE reports SET status='resolved' WHERE id=?",[(int)$b['id']]); out(['ok'=>true]);
case 'review.moderate': admin(); $status=$b['status']??''; if(!in_array($status,['published','hidden'])) fail('Estado inválido.'); query('UPDATE reviews SET status=? WHERE id=?',[$status,(int)$b['id']]); out(['ok'=>true]);
case 'notifications.read': $u=user(); query('UPDATE notifications SET is_read=1 WHERE user_id=?',[$u['id']]); out(['ok'=>true]);
case 'notifications.send':
    admin(); $message=textField($b,'message',500); if(!empty($b['user_id'])) query('INSERT INTO notifications(user_id,message) VALUES(?,?)',[(int)$b['user_id'],$message]); else query('INSERT INTO notifications(user_id,message) SELECT id,? FROM users WHERE active=1',[$message]); out(['ok'=>true]);
case 'gallery.save':
    admin(); $v=[textField($b,'name',120),textField($b,'address',255),textField($b,'description',3000),!empty($b['simulated'])?1:0];
    if(!empty($b['id'])) query('UPDATE galleries SET name=?,address=?,description=?,simulated=? WHERE id=?',[...$v,(int)$b['id']]); else query('INSERT INTO galleries(name,address,description,simulated) VALUES(?,?,?,?)',$v); out(['ok'=>true]);
case 'floor.save':
    admin(); if(!query('SELECT id FROM galleries WHERE id=?',[(int)$b['gallery_id']])->fetch()) fail('Galería inválida.'); $v=[(int)$b['gallery_id'],textField($b,'name',80),(int)$b['level']];
    if(!empty($b['id'])) query('UPDATE floors SET gallery_id=?,name=?,level=? WHERE id=?',[...$v,(int)$b['id']]); else query('INSERT INTO floors(gallery_id,name,level) VALUES(?,?,?)',$v); out(['ok'=>true]);
case 'node.save':
    admin(); $kind=$b['kind']??''; if(!in_array($kind,['entry','shop','hall','stairs','elevator','reference'])) fail('Tipo de punto inválido.');
    if(!query('SELECT id FROM floors WHERE id=?',[(int)$b['floor_id']])->fetch()) fail('Piso inválido.'); $x=(int)$b['x']; $y=(int)$b['y']; if($x<30||$x>870||$y<30||$y>530) fail('El punto debe quedar dentro del plano (x:30–870, y:30–530).');
    $v=[(int)$b['floor_id'],textField($b,'label',120),$kind,$x,$y]; if(!empty($b['id'])) query('UPDATE nodes SET floor_id=?,label=?,kind=?,x=?,y=? WHERE id=?',[...$v,(int)$b['id']]); else query('INSERT INTO nodes(floor_id,label,kind,x,y) VALUES(?,?,?,?,?)',$v); out(['ok'=>true]);
case 'node.delete': admin(); $id=(int)$b['id']; if(query('SELECT id FROM businesses WHERE node_id=?',[$id])->fetch()) fail('El punto tiene un comercio asociado.'); $db->beginTransaction(); query('DELETE FROM edges WHERE from_id=? OR to_id=?',[$id,$id]); query('DELETE FROM nodes WHERE id=?',[$id]); $db->commit(); out(['ok'=>true]);
case 'edge.save':
    admin(); $from=(int)$b['from_id']; $to=(int)$b['to_id']; $distance=(int)$b['distance']; if($from===$to||$distance<1||$distance>10000) fail('Conexión o distancia inválida.');
    $nodes=query('SELECT n.*,f.gallery_id FROM nodes n JOIN floors f ON f.id=n.floor_id WHERE n.id IN (?,?)',[$from,$to])->fetchAll(); if(count($nodes)!==2 || $nodes[0]['gallery_id']!=$nodes[1]['gallery_id']) fail('Los puntos deben pertenecer a la misma galería.');
    $accessible=!empty($b['accessible'])?1:0; if($nodes[0]['kind']==='stairs'||$nodes[1]['kind']==='stairs') $accessible=0;
    if($nodes[0]['floor_id']!=$nodes[1]['floor_id'] && !($nodes[0]['kind']===$nodes[1]['kind'] && in_array($nodes[0]['kind'],['stairs','elevator']))) fail('Los pisos se conectan mediante escaleras o ascensores.');
    $v=[$from,$to,$distance,$accessible,!empty($b['active'])?1:0]; if(!empty($b['id'])) query('UPDATE edges SET from_id=?,to_id=?,distance=?,`accessible`=?,active=? WHERE id=?',[...$v,(int)$b['id']]); else query('INSERT INTO edges(from_id,to_id,distance,`accessible`,active) VALUES(?,?,?,?,?)',$v); out(['ok'=>true]);
case 'edge.delete': admin(); query('DELETE FROM edges WHERE id=?',[(int)$b['id']]); out(['ok'=>true]);
default: fail('Acción no encontrada.',404);
}
} catch(PDOException $e) { if($db->inTransaction()) $db->rollBack(); error_log($e->getMessage()); fail('No se pudo guardar. Revisá que los datos no estén duplicados o asociados a otros registros.',409); }
catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); error_log($e->getMessage()); fail('Ocurrió un error inesperado. Intentá nuevamente.',500); }

