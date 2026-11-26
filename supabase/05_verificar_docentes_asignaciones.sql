-- Se esperan dos RPC invoker sin acceso anónimo y un trigger de historial.
select p.proname as funcion,p.prosecdef as security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('guardar_docente_academico','guardar_asignacion_academica') order by p.proname;
select tgname, tgenabled from pg_trigger where tgrelid='public.asignaciones_docente'::regclass and tgname='aa_docente_historial';
