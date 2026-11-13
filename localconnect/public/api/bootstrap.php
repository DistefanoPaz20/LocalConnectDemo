<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$configPath = getenv('LC_CONFIG') ?: dirname(__DIR__, 2) . '/localconnect-config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    echo json_encode(['error'=>'Falta configurar la conexión a la base de datos. Consultá la guía de instalación.']); exit;
}
$config = require $configPath;
ini_set('session.use_strict_mode', '1');
session_name('localconnect_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$config['secure_cookie'] ?? true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
if (isset($_SESSION['last_seen']) && time() - $_SESSION['last_seen'] > 7200) { $_SESSION = []; session_regenerate_id(true); }
$_SESSION['last_seen'] = time();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
try {
    if (($config['driver'] ?? 'mysql') === 'sqlite') {
        $db = new PDO('sqlite:'.$config['path']);
        $db->exec('PRAGMA foreign_keys = ON');
    } else {
        $db = new PDO('mysql:host='.$config['host'].';dbname='.$config['database'].';charset=utf8mb4', $config['username'], $config['password']);
    }
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (Throwable $e) { error_log($e->getMessage()); http_response_code(503); echo json_encode(['error'=>'No se pudo conectar a la base de datos.']); exit; }
function query(string $sql, array $args=[]): PDOStatement { global $db; $s=$db->prepare($sql); $s->execute($args); return $s; }
function out(mixed $data, int $status=200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message, int $status=400): never { out(['error'=>$message],$status); }
function body(): array { $raw=file_get_contents('php://input'); if(strlen($raw)>1000000) fail('Solicitud demasiado grande.',413); $data=json_decode($raw,true); if(!is_array($data)) fail('JSON inválido.'); return $data; }
function user(bool $required=true): ?array { $u=isset($_SESSION['uid']) ? query('SELECT id,name,email,role,active FROM users WHERE id=?',[$_SESSION['uid']])->fetch() : false; if(!$u || !$u['active']) { if($required) fail('Iniciá sesión para continuar.',401); return null; } unset($u['active']); return $u; }
function admin(): array { $u=user(); if($u['role']!=='admin') fail('Acceso exclusivo de administración.',403); return $u; }
function textField(array $b,string $key,int $max=255,bool $required=true): string { $v=trim((string)($b[$key]??'')); if(($required && $v==='') || strlen($v)>$max) fail('Revisá el campo '.$key.'.'); return $v; }
function ownBusiness(int $id): array { $u=user(); $b=query('SELECT * FROM businesses WHERE id=?',[$id])->fetch(); if(!$b) fail('Comercio no encontrado.',404); if($u['role']!=='admin' && (int)$b['owner_id']!==(int)$u['id']) fail('No podés modificar este comercio.',403); return $b; }
function safeUrl(string $url): string { if($url!=='' && (!filter_var($url,FILTER_VALIDATE_URL) || !in_array(parse_url($url,PHP_URL_SCHEME),['https','http']))) fail('La URL debe comenzar con https:// o http://.'); return $url; }
