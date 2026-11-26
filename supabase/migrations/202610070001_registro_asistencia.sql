-- Fase 5. Instalar después de docentes/asignaciones. No borra registros existentes.
begin;

-- Evaluar las columnas de la fila permite INSERT ... RETURNING. La función
-- ver_jornada(id), estable, no ve todavía una fila nueva en ese mismo comando.
-- Se conservan exactamente el alcance administrativo/docente y la publicación familiar.
drop policy if exists jornadas_asistencia_select on public.jornadas_asistencia;
create policy jornadas_asistencia_select on public.jornadas_asistencia for select to authenticated
 using (private.admin() or private.docente_curso(curso_id) or (estado='PUBLICADO' and private.ver_curso(curso_id)));

create or replace function public.consultar_asistencia_curso(p_curso uuid,p_fecha date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c record; j public.jornadas_asistencia; v_filas jsonb; v_bloqueo text;
begin
 if not (private.director() or private.docente_curso(p_curso)) then
  raise exception 'Tu cuenta no puede registrar asistencia en este curso' using errcode='42501'; end if;
 if p_fecha is null then raise exception 'Selecciona una fecha válida' using errcode='23514'; end if;
 select x.*,g.anio,g.activo gestion_activa into c from public.cursos x join public.gestiones g on g.id=x.gestion_id where x.id=p_curso;
 if not found then raise exception 'El curso ya no está disponible' using errcode='23514'; end if;
 select * into j from public.jornadas_asistencia where curso_id=p_curso and fecha=p_fecha;
 select coalesce(jsonb_agg(jsonb_build_object(
  'matricula_id',m.id,'matricula_version',m.updated_at,
  'nombre',concat_ws(' ',nullif(p.apellido_paterno,''),nullif(p.apellido_materno,''),p.nombres),
  'estado',a.estado,'observacion',coalesce(a.observacion,''),'asistencia_version',a.updated_at
 ) order by p.apellido_paterno,p.apellido_materno,p.nombres,m.id),'[]'::jsonb) into v_filas
 from public.matriculas m join public.estudiantes e on e.id=m.estudiante_id join public.personas p on p.id=e.persona_id
 left join public.asistencias a on a.matricula_id=m.id and a.jornada_id=j.id
 where m.curso_id=p_curso and p_fecha between m.fecha_ingreso and coalesce(m.fecha_salida,p_fecha);
 v_bloqueo:=case
  when not c.activo or not c.gestion_activa then 'El curso o su gestión están inactivos. Solo puedes consultar.'
  when extract(year from p_fecha)<>c.anio then 'La fecha debe pertenecer a la gestión del curso.'
  when p_fecha>(current_timestamp at time zone 'America/La_Paz')::date then 'No se puede registrar asistencia de una fecha futura.'
  when not exists(select 1 from public.trimestres t where t.gestion_id=c.gestion_id and t.estado='ABIERTO' and p_fecha between t.fecha_inicio and t.fecha_fin)
   then 'La fecha necesita un trimestre abierto con fechas configuradas por Dirección.'
  when jsonb_array_length(v_filas)=0 then 'No hay estudiantes con matrícula vigente en esta fecha.'
  when jsonb_array_length(v_filas)>500 then 'El curso supera el límite de 500 matrículas de esta vista. Solo puedes consultar.'
  else null end;
 return jsonb_build_object('curso',jsonb_build_object('id',c.id,'gestion_id',c.gestion_id,'grado_id',c.grado_id,'paralelo',c.paralelo,'anio',c.anio),
  'jornada',case when j.id is null then null else to_jsonb(j) end,'filas',v_filas,'bloqueo',v_bloqueo);
end $$;

create or replace function public.guardar_asistencia_curso(
 p_curso uuid,p_fecha date,p_jornada uuid,p_version timestamptz,p_filas jsonb,p_observacion text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare c record; j public.jornadas_asistencia; r record; v_version timestamptz; v_matricula_version timestamptz;
begin
 if not (private.director() or private.docente_curso(p_curso)) then
  raise exception 'Tu cuenta no puede registrar asistencia en este curso' using errcode='42501'; end if;
 if p_fecha is null or p_fecha>(current_timestamp at time zone 'America/La_Paz')::date then
  raise exception 'No se puede registrar asistencia de una fecha futura o inválida' using errcode='23514'; end if;
 if jsonb_typeof(p_filas) is distinct from 'array' or length(coalesce(p_observacion,''))>1000 then
  raise exception 'Revisa los datos de asistencia' using errcode='23514'; end if;
 if jsonb_array_length(p_filas) not between 1 and 500 then
  raise exception 'La lista debe contener entre 1 y 500 matrículas' using errcode='23514'; end if;
 select x.*,g.anio,g.activo gestion_activa into c from public.cursos x join public.gestiones g on g.id=x.gestion_id where x.id=p_curso;
 if not found or not c.activo or not c.gestion_activa then
  raise exception 'Selecciona un curso y una gestión activos' using errcode='23514'; end if;
 if extract(year from p_fecha)<>c.anio then raise exception 'La fecha debe pertenecer a la gestión del curso' using errcode='23514'; end if;
 if not exists(select 1 from public.trimestres t where t.gestion_id=c.gestion_id and t.estado='ABIERTO' and p_fecha between t.fecha_inicio and t.fecha_fin) then
  raise exception 'La fecha necesita un trimestre abierto con fechas configuradas por Dirección' using errcode='23514'; end if;
 if exists(select 1 from jsonb_to_recordset(p_filas) f(matricula_id uuid,estado text,observacion text,matricula_version timestamptz)
  where matricula_id is null or matricula_version is null or (estado is not null and estado not in ('A','F','R','L')) or length(coalesce(observacion,''))>500)
  or (select count(distinct f.matricula_id) from jsonb_to_recordset(p_filas) f(matricula_id uuid))<>jsonb_array_length(p_filas)
 then raise exception 'Revisa las marcas y matrículas de la lista' using errcode='23514'; end if;
 if exists(select 1 from jsonb_to_recordset(p_filas) f(estado text,observacion text)
   where estado is null and nullif(btrim(observacion),'') is not null) then
  raise exception 'Revisa las observaciones: selecciona una marca para guardarlas' using errcode='23514'; end if;
 -- La lista completa debe corresponder a la vigencia en la fecha, no al estado actual.
 if exists(
  (select m.id from public.matriculas m where m.curso_id=p_curso and p_fecha between m.fecha_ingreso and coalesce(m.fecha_salida,p_fecha)
   except select f.matricula_id from jsonb_to_recordset(p_filas) f(matricula_id uuid))
  union all
  (select f.matricula_id from jsonb_to_recordset(p_filas) f(matricula_id uuid)
   except select m.id from public.matriculas m where m.curso_id=p_curso and p_fecha between m.fecha_ingreso and coalesce(m.fecha_salida,p_fecha))
 ) then raise exception 'La lista de matrículas cambió. Recarga antes de guardar' using errcode='23514'; end if;
 select * into j from public.jornadas_asistencia where curso_id=p_curso and fecha=p_fecha for update;
 if found then
  if p_jornada is distinct from j.id or p_version is null or p_version is distinct from j.updated_at then
   raise exception 'Otra persona modificó la jornada. Recarga antes de guardar' using errcode='23514'; end if;
  if j.estado='PUBLICADO' then raise exception 'Despublica la jornada antes de editarla' using errcode='23514'; end if;
 else
  if p_jornada is not null or p_version is not null then raise exception 'La jornada cambió. Recarga antes de guardar' using errcode='23514'; end if;
  insert into public.jornadas_asistencia(curso_id,gestion_id,fecha) values(p_curso,c.gestion_id,p_fecha) returning * into j;
 end if;
 for r in select * from jsonb_to_recordset(p_filas) f(matricula_id uuid,estado text,observacion text,matricula_version timestamptz,asistencia_version timestamptz) order by matricula_id loop
  select updated_at into v_version from public.asistencias where jornada_id=j.id and matricula_id=r.matricula_id;
  if v_version is distinct from r.asistencia_version then raise exception 'Otra persona modificó la asistencia. Recarga antes de guardar' using errcode='23514'; end if;
  if r.estado is null then
   if v_version is not null then delete from public.asistencias where jornada_id=j.id and matricula_id=r.matricula_id; end if;
  else
   insert into public.asistencias(jornada_id,matricula_id,curso_id,gestion_id,estado,observacion)
   values(j.id,r.matricula_id,p_curso,c.gestion_id,r.estado::public.estado_asistencia,nullif(btrim(r.observacion),''))
   on conflict(jornada_id,matricula_id) do update set estado=excluded.estado,observacion=excluded.observacion;
  end if;
  -- El trigger de asistencia bloquea la matrícula; comprobar después evita perder una edición concurrente.
  select updated_at into v_matricula_version from public.matriculas where id=r.matricula_id;
  if v_matricula_version is distinct from r.matricula_version then raise exception 'La matrícula cambió. Recarga antes de guardar' using errcode='23514'; end if;
 end loop;
 update public.jornadas_asistencia set observacion=nullif(btrim(p_observacion),'') where id=j.id;
 return j.id;
end $$;

create or replace function public.cambiar_publicacion_asistencia(p_jornada uuid,p_version timestamptz,p_publicar boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.jornadas_asistencia;
begin
 select * into j from public.jornadas_asistencia where id=p_jornada for update;
 if not found or not (private.director() or private.docente_curso(j.curso_id)) then
  raise exception 'Tu cuenta no puede cambiar esta jornada' using errcode='42501'; end if;
 if p_publicar is null or p_version is null or p_version is distinct from j.updated_at then
  raise exception 'Otra persona modificó la jornada. Recarga antes de continuar' using errcode='23514'; end if;
 if not exists(select 1 from public.cursos c join public.gestiones g on g.id=c.gestion_id where c.id=j.curso_id and c.activo and g.activo)
  or j.fecha>(current_timestamp at time zone 'America/La_Paz')::date then raise exception 'Selecciona un curso y una gestión activos y una fecha no futura' using errcode='23514'; end if;
 if not exists(select 1 from public.trimestres t where t.gestion_id=j.gestion_id and t.estado='ABIERTO' and j.fecha between t.fecha_inicio and t.fecha_fin) then
  raise exception 'La fecha necesita un trimestre abierto con fechas configuradas por Dirección' using errcode='23514'; end if;
 if p_publicar and not exists(select 1 from public.matriculas m where m.curso_id=j.curso_id and j.fecha between m.fecha_ingreso and coalesce(m.fecha_salida,j.fecha)) then
  raise exception 'No hay estudiantes con matrícula vigente en esta fecha' using errcode='23514'; end if;
 if j.estado=(case when p_publicar then 'PUBLICADO' else 'BORRADOR' end)::public.estado_publicacion then
  raise exception 'La jornada ya tiene ese estado. Recarga antes de continuar' using errcode='23514'; end if;
 -- El trigger de la base exige una marca para cada matrícula y bloquea trimestres cerrados.
 update public.jornadas_asistencia set estado=(case when p_publicar then 'PUBLICADO' else 'BORRADOR' end)::public.estado_publicacion where id=j.id;
 return j.id;
end $$;

revoke all on function public.consultar_asistencia_curso(uuid,date) from public,anon;
revoke all on function public.guardar_asistencia_curso(uuid,date,uuid,timestamptz,jsonb,text) from public,anon;
revoke all on function public.cambiar_publicacion_asistencia(uuid,timestamptz,boolean) from public,anon;
grant execute on function public.consultar_asistencia_curso(uuid,date) to authenticated;
grant execute on function public.guardar_asistencia_curso(uuid,date,uuid,timestamptz,jsonb,text) to authenticated;
grant execute on function public.cambiar_publicacion_asistencia(uuid,timestamptz,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
