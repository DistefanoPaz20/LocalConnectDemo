<?php
// Dijkstra: el grafo es la fuente de verdad; las rutas accesibles excluyen escaleras.
function shortestRoute(array $nodes, array $edges, int $from, int $to, bool $accessible): array {
    $byId=[]; foreach($nodes as $n) $byId[(int)$n['id']]=$n;
    if(!isset($byId[$from],$byId[$to])) throw new InvalidArgumentException('Origen o destino inexistente.');
    $distance=[$from=>0]; $previous=[]; $visited=[];
    while(true) {
        $current=null; $best=INF;
        foreach($distance as $id=>$d) if(!isset($visited[$id]) && $d<$best) { $current=$id; $best=$d; }
        if($current===null) throw new RuntimeException('No hay un recorrido disponible con estas condiciones.');
        if($current===$to) break;
        $visited[$current]=true;
        foreach($edges as $e) {
            if(!$e['active'] || ($accessible && !$e['accessible'])) continue;
            $next=(int)$e['from_id']===$current ? (int)$e['to_id'] : ((int)$e['to_id']===$current ? (int)$e['from_id'] : null);
            if($next===null || !isset($byId[$next])) continue;
            if($accessible && ($byId[$current]['kind']==='stairs' || $byId[$next]['kind']==='stairs')) continue;
            $cost=$best+(float)$e['distance'];
            if($cost<($distance[$next]??INF)) { $distance[$next]=$cost; $previous[$next]=$current; }
        }
    }
    $path=[$to]; while($path[0]!==$from) array_unshift($path,$previous[$path[0]]);
    return ['nodes'=>array_map(fn($id)=>$byId[$id],$path),'distance'=>round($distance[$to]),'accessible'=>$accessible];
}
