-- Fase 6: actividades y captura individual. Conserva las tablas, RLS y cálculos existentes.
begin;
-- Bloqueo autorizado en el mismo orden que validar_evaluacion. No da acceso a datos.
create or replace function private.bloquear_evaluacion(p_asignacion uuid,p_trimestre uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a public.asignaciones_docente; t public.trimestres;
begin
 if not coalesce(private.editar_asignacion(p_asignacion),false) then
  raise exception 'Tu cuenta no puede registrar calificaciones en esta materia' using errcode='42501'; end if;
 select * into t from public.trimestres where id=p_trimestre for update;
 select * into a from public.asignaciones_docente where id=p_asignacion for update;
 if not coalesce(private.editar_asignacion(p_asignacion),false) then
  raise exception 'Tu cuenta no puede registrar calificaciones en esta materia' using errcode='42501'; end if;
 if a.id is null or t.id is null or a.gestion_id<>t.gestion_id or t.estado<>'ABIERTO' or not a.activo
  or not exists(select 1 from public.cursos c join public.gestiones g on g.id=c.gestion_id where c.id=a.curso_id and c.activo and g.activo)
 then raise exception 'Selecciona una asignación activa y un trimestre abierto de su gestión' using errcode='23514'; end if;
end $$;
revoke all on function private.bloquear_evaluacion(uuid,uuid) from public,anon;
grant execute on function private.bloquear_evaluacion(uuid,uuid) to authenticated,service_role;

create or replace function public.consultar_registro_calificaciones(p_asignacion uuid,p_trimestre uuid,p_matricula uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a record; t public.trimestres; m public.matriculas; v jsonb; k jsonb; n jsonb; c jsonb; alumnos jsonb;
begin
 if not coalesce(private.editar_asignacion(p_asignacion),false) then
  raise exception 'Tu cuenta no puede registrar calificaciones en esta materia' using errcode='42501'; end if;
 select x.*,cu.activo curso_activo,g.activo gestion_activa into a from public.asignaciones_docente x
 join public.cursos cu on cu.id=x.curso_id join public.gestiones g on g.id=x.gestion_id where x.id=p_asignacion;
 select * into t from public.trimestres where id=p_trimestre and gestion_id=a.gestion_id;
 if t.id is null then raise exception 'Selecciona un trimestre de la gestión' using errcode='23514'; end if;
 if p_matricula is not null then
  select * into m from public.matriculas where id=p_matricula and curso_id=a.curso_id
   and fecha_ingreso<=t.fecha_fin and coalesce(fecha_salida,t.fecha_fin)>=t.fecha_inicio;
  if m.id is null then raise exception 'La matrícula no corresponde al curso y trimestre' using errcode='23514'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.dimension,x.orden,x.id),'[]'::jsonb) into k
 from public.criterios_evaluacion x where asignacion_docente_id=a.id and trimestre_id=t.id;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.criterio_id),'[]'::jsonb) into n
 from public.notas_criterios x join public.criterios_evaluacion cr on cr.id=x.criterio_id
 where x.matricula_id=m.id and cr.asignacion_docente_id=a.id and cr.trimestre_id=t.id;
 select to_jsonb(x) into c from public.v_calificaciones x where asignacion_docente_id=a.id and trimestre_id=t.id and matricula_id=m.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',ma.id,'nombre',concat_ws(' ',p.apellido_paterno,p.apellido_materno,p.nombres),
 'estado',coalesce(ca.estado::text,'SIN REGISTRO'),'nota_final',ca.nota_final) order by p.apellido_paterno,p.apellido_materno,p.nombres,ma.id),'[]'::jsonb) into alumnos
 from public.matriculas ma join public.estudiantes e on e.id=ma.estudiante_id join public.personas p on p.id=e.persona_id
 left join public.v_calificaciones ca on ca.matricula_id=ma.id and ca.asignacion_docente_id=a.id and ca.trimestre_id=t.id
 where ma.curso_id=a.curso_id and ma.fecha_ingreso<=t.fecha_fin and coalesce(ma.fecha_salida,t.fecha_fin)>=t.fecha_inicio;
 v:=jsonb_build_object('asignacion',to_jsonb(a),'trimestre',to_jsonb(t),'matricula',case when m.id is null then null else to_jsonb(m) end,'criterios',k,'notas',n,'calificacion',c);
 return v||jsonb_build_object('version',md5(v::text),'alumnos',alumnos,
 'criterios_bloqueados',exists(select 1 from public.calificaciones_trimestrales where asignacion_docente_id=a.id and trimestre_id=t.id and estado='PUBLICADO'),
 'bloqueo',case when not a.activo or not a.curso_activo or not a.gestion_activa or t.estado<>'ABIERTO'
 then 'La asignación, el curso y la gestión deben estar activos y el trimestre abierto.' else null end);
end $$;

create or replace function public.gestionar_criterio_calificacion(p_asignacion uuid,p_trimestre uuid,p_criterio uuid,p_version timestamptz,p_dimension text,p_nombre text,p_orden integer,p_eliminar boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.asignaciones_docente; k public.criterios_evaluacion; v_id uuid;
begin
 perform private.bloquear_evaluacion(p_asignacion,p_trimestre);
 select * into a from public.asignaciones_docente where id=p_asignacion;
 if p_criterio is not null then
  select * into k from public.criterios_evaluacion where id=p_criterio and asignacion_docente_id=a.id and trimestre_id=p_trimestre for update;
  if k.id is null or p_version is distinct from k.updated_at then
   raise exception 'Otra persona modificó la actividad. Recarga antes de guardar' using errcode='23514'; end if;
 end if;
 if p_eliminar is true then
  if k.id is null then raise exception 'Selecciona una actividad existente' using errcode='23514'; end if;
  if exists(select 1 from public.notas_criterios where criterio_id=k.id) then
   raise exception 'La actividad tiene notas. No se puede eliminar' using errcode='23514'; end if;
  delete from public.criterios_evaluacion where id=k.id;
  return k.id;
 end if;
 if p_dimension is null or p_dimension not in ('SER','SABER','HACER') or nullif(btrim(p_nombre),'') is null or length(p_nombre)>120 or p_orden is null or p_orden not between 1 and 100 then
  raise exception 'Revisa dimensión, nombre y orden de la actividad' using errcode='23514'; end if;
 if k.id is null then
  if (select count(*) from public.criterios_evaluacion where asignacion_docente_id=a.id and trimestre_id=p_trimestre)>=100 then
   raise exception 'El trimestre admite hasta 100 actividades por materia' using errcode='23514'; end if;
  insert into public.criterios_evaluacion(asignacion_docente_id,curso_id,gestion_id,trimestre_id,dimension,nombre,puntaje_maximo,orden)
   values(a.id,a.curso_id,a.gestion_id,p_trimestre,p_dimension::public.dimension_evaluacion,btrim(p_nombre),case p_dimension when 'SER' then 10 when 'SABER' then 45 else 40 end,p_orden) returning id into v_id;
 else
  if p_dimension<>k.dimension::text then raise exception 'La dimensión de una actividad existente no puede cambiar' using errcode='23514'; end if;
  update public.criterios_evaluacion set nombre=btrim(p_nombre),orden=p_orden where id=k.id returning id into v_id;
 end if;
 return v_id;
end $$;

create or replace function public.guardar_calificacion_estudiante(p_asignacion uuid,p_trimestre uuid,p_matricula uuid,p_version text,p_notas jsonb,p_autoevaluacion numeric,p_extra numeric,p_motivo text,p_accion text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.asignaciones_docente; s jsonb; r record; v_id uuid;
begin
 perform private.bloquear_evaluacion(p_asignacion,p_trimestre);
 if p_matricula is null then raise exception 'Selecciona una matrícula' using errcode='23514'; end if;
 -- La matrícula se bloquea con la misma autorización del contexto; las RLS de
 -- matrícula no dan UPDATE al docente, por eso este bloqueo vive en el helper privado.
 perform private.bloquear_matricula_evaluacion(p_asignacion,p_matricula);
 s:=public.consultar_registro_calificaciones(p_asignacion,p_trimestre,p_matricula);
 if p_version is distinct from s->>'version' then raise exception 'Otra persona modificó las notas, actividades o matrícula. Recarga antes de guardar' using errcode='23514'; end if;
 if p_accion is null or p_accion not in ('guardar','publicar','despublicar') then raise exception 'Selecciona una acción válida' using errcode='23514'; end if;
 select * into a from public.asignaciones_docente where id=p_asignacion;
 v_id:=(s->'calificacion'->>'id')::uuid;
 if p_accion='despublicar' then
  if v_id is null or s->'calificacion'->>'estado'<>'PUBLICADO' then raise exception 'La calificación no está publicada' using errcode='23514'; end if;
  update public.calificaciones_trimestrales set estado='BORRADOR' where id=v_id;
  return v_id;
 end if;
 if s->'calificacion'->>'estado'='PUBLICADO' then raise exception 'Despublica la calificación antes de corregirla' using errcode='23514'; end if;
 if p_autoevaluacion<0 or p_autoevaluacion>5 or p_autoevaluacion<>round(p_autoevaluacion,2)
  or p_extra is null or p_extra<0 or p_extra>100 or p_extra<>round(p_extra,2) or length(coalesce(p_motivo,''))>500
  or (p_extra>0 and nullif(btrim(p_motivo),'') is null) then raise exception 'Revisa autoevaluación, puntos extra y su motivo' using errcode='23514'; end if;
 if jsonb_typeof(p_notas) is distinct from 'array' then raise exception 'Revisa la lista de notas' using errcode='23514'; end if;
 if jsonb_array_length(p_notas)>100 or exists(select 1 from jsonb_to_recordset(p_notas) f(criterio_id uuid,puntaje numeric) where criterio_id is null)
 or (select count(distinct criterio_id) from jsonb_to_recordset(p_notas) f(criterio_id uuid))<>jsonb_array_length(p_notas)
 or exists(
 (select id from public.criterios_evaluacion where asignacion_docente_id=a.id and trimestre_id=p_trimestre except select criterio_id from jsonb_to_recordset(p_notas) f(criterio_id uuid))
 union all
 (select criterio_id from jsonb_to_recordset(p_notas) f(criterio_id uuid) except select id from public.criterios_evaluacion where asignacion_docente_id=a.id and trimestre_id=p_trimestre)
 ) then raise exception 'La lista de actividades cambió. Recarga antes de guardar' using errcode='23514'; end if;
 for r in select f.*,k.puntaje_maximo from jsonb_to_recordset(p_notas) f(criterio_id uuid,puntaje numeric) join public.criterios_evaluacion k on k.id=f.criterio_id loop
  if r.puntaje<0 or r.puntaje>r.puntaje_maximo or r.puntaje<>round(r.puntaje,2) then raise exception 'Revisa el puntaje: fuera de rango o más de dos decimales' using errcode='23514'; end if;
  if r.puntaje is null then
   delete from public.notas_criterios where criterio_id=r.criterio_id and matricula_id=p_matricula;
  else
   insert into public.notas_criterios(criterio_id,matricula_id,curso_id,gestion_id,puntaje) values(r.criterio_id,p_matricula,a.curso_id,a.gestion_id,r.puntaje)
   on conflict(criterio_id,matricula_id) do update set puntaje=excluded.puntaje;
  end if;
 end loop;
 if v_id is null then
  insert into public.calificaciones_trimestrales(asignacion_docente_id,matricula_id,curso_id,gestion_id,trimestre_id,autoevaluacion,puntos_extra,motivo_extra)
   values(a.id,p_matricula,a.curso_id,a.gestion_id,p_trimestre,p_autoevaluacion,p_extra,nullif(btrim(p_motivo),'')) returning id into v_id;
 else
  update public.calificaciones_trimestrales set autoevaluacion=p_autoevaluacion,puntos_extra=p_extra,motivo_extra=nullif(btrim(p_motivo),'') where id=v_id;
 end if;
 if p_accion='publicar' then update public.calificaciones_trimestrales set estado='PUBLICADO' where id=v_id; end if;
 return v_id;
end $$;

create or replace function private.bloquear_matricula_evaluacion(p_asignacion uuid,p_matricula uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(private.editar_asignacion(p_asignacion),false) then raise exception 'Tu cuenta no puede registrar calificaciones' using errcode='42501'; end if;
 perform 1 from public.matriculas m join public.asignaciones_docente a on a.curso_id=m.curso_id where a.id=p_asignacion and m.id=p_matricula for update of m;
 if not found then raise exception 'La matrícula no corresponde al curso' using errcode='23514'; end if;
end $$;
revoke all on function private.bloquear_matricula_evaluacion(uuid,uuid) from public,anon;
grant execute on function private.bloquear_matricula_evaluacion(uuid,uuid) to authenticated,service_role;
revoke all on function public.consultar_registro_calificaciones(uuid,uuid,uuid),public.gestionar_criterio_calificacion(uuid,uuid,uuid,timestamptz,text,text,integer,boolean),public.guardar_calificacion_estudiante(uuid,uuid,uuid,text,jsonb,numeric,numeric,text,text) from public,anon;
grant execute on function public.consultar_registro_calificaciones(uuid,uuid,uuid),public.gestionar_criterio_calificacion(uuid,uuid,uuid,timestamptz,text,text,integer,boolean),public.guardar_calificacion_estudiante(uuid,uuid,uuid,text,jsonb,numeric,numeric,text,text) to authenticated,service_role;
commit;
