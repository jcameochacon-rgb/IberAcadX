-- Consulta de verificación: no modifica datos.
select p.proname funcion,p.prosecdef security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('consultar_asistencia_curso','guardar_asistencia_curso','cambiar_publicacion_asistencia')
order by p.proname;

select g.anio,t.numero,t.fecha_inicio,t.fecha_fin,t.estado
from public.trimestres t join public.gestiones g on g.id=t.gestion_id
order by g.anio,t.numero;
