-- Lectura solamente. Ejecutar en SQL Editor DESPUÉS de la migración.
select 'tablas_con_rls' as comprobacion,count(*) as resultado
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity;
-- En un proyecto nuevo: 28; si hay tablas ajenas puede ser mayor.
select 'grados' as catalogo,count(*) as registros from public.grados
union all select 'asignaturas',count(*) from public.asignaturas
union all select 'gestiones',count(*) from public.gestiones
union all select 'trimestres',count(*) from public.trimestres
union all select 'periodos',count(*) from public.periodos;
-- Esperado: 6, 9, 1, 3 y 6 respectivamente.
select c.relname as vista,c.reloptions as opciones
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('v_calificaciones','v_resumen_asistencia');
-- Ambas deben contener security_invoker=true.
select schemaname,tablename,policyname,cmd from pg_policies
where schemaname='public' order by tablename,cmd;
select g.anio,t.numero,t.estado,t.fecha_inicio,t.fecha_fin
from public.trimestres t join public.gestiones g on g.id=t.gestion_id order by g.anio,t.numero;
-- Inicialmente PLANIFICADO, fechas NULL. Configurar fechas reales antes de abrir.
select tablename from pg_tables where schemaname='public'
and has_table_privilege('anon',format('%I.%I',schemaname,tablename),'SELECT');
-- Debe devolver cero filas para las tablas de este sistema.
