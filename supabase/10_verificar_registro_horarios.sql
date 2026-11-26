-- Solo lectura: cuatro RPC invoker, authenticated=true y anon=false.
select p.proname funcion,p.prosecdef security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('consultar_horario_curso','guardar_periodo_horario','guardar_bloque_horario','retirar_bloque_horario') order by p.proname;
select g.anio,p.numero,p.hora_inicio,p.hora_fin
from public.periodos p join public.gestiones g on g.id=p.gestion_id order by g.anio,p.numero;
