-- Solo lectura. Deben aparecer tres RPC públicas invoker (security_definer=false),
-- con authenticated=true y anon=false.
select p.proname funcion,p.prosecdef security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('consultar_registro_calificaciones','gestionar_criterio_calificacion','guardar_calificacion_estudiante')
order by p.proname;
-- Helpers privados de bloqueo: verifican autorización y no devuelven datos.
select p.proname,p.prosecdef security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.proname in ('bloquear_evaluacion','bloquear_matricula_evaluacion');
select g.anio,t.numero,t.fecha_inicio,t.fecha_fin,t.estado
from public.trimestres t join public.gestiones g on g.id=t.gestion_id
order by g.anio,t.numero;
