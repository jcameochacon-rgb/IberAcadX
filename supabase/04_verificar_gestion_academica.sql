-- Solo lectura. Se esperan cuatro filas; ninguna función debe elevar privilegios.
select p.proname as funcion,p.prosecdef as security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('guardar_ficha_academica','guardar_curso_academico','vincular_tutor_academico','guardar_matricula_academica')
order by p.proname;
