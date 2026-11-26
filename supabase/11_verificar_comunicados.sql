-- Solo lectura. Cuatro filas: security_definer=false, authenticated=true, anon=false.
select p.proname, p.prosecdef security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('consultar_comunicados','consultar_comunicado','guardar_comunicado','cambiar_estado_comunicado');
