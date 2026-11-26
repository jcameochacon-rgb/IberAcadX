-- Fase 7: consulta semanal y administración de periodos/horarios.
-- No inventa horas ni modifica bloques existentes al instalar.
begin;
create or replace function public.consultar_horario_curso(p_curso uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c record; p jsonb; a jsonb; h jsonb;
begin
 if not coalesce(private.ver_curso(p_curso),false) then raise exception 'Tu cuenta no tiene acceso al horario de este curso' using errcode='42501'; end if;
 select x.*,g.anio,g.activo gestion_activa into c from public.cursos x join public.gestiones g on g.id=x.gestion_id where x.id=p_curso;
 if c.id is null then raise exception 'Selecciona un curso disponible' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.numero),'[]'::jsonb) into p from public.periodos x where gestion_id=c.gestion_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'nombre',s.nombre,'activo',x.activo and s.activo and coalesce(d.activo,false),'updated_at',x.updated_at,
 'docente',case when private.admin() then concat_ws(' ',pe.nombres,pe.apellido_paterno,pe.apellido_materno) else null end) order by s.nombre),'[]'::jsonb) into a
 from public.asignaciones_docente x join public.asignaturas s on s.id=x.asignatura_id
 left join public.docentes d on d.id=x.docente_id left join public.personas pe on pe.id=d.persona_id where x.curso_id=c.id;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.dia_semana,x.periodo_id),'[]'::jsonb) into h from public.horarios x where curso_id=c.id;
 return jsonb_build_object('curso',to_jsonb(c),'periodos',p,'asignaciones',a,'horarios',h,
 'puede_editar',private.admin(),'bloqueo',case when not c.activo or not c.gestion_activa then 'El curso o la gestión están inactivos. Solo puedes consultar o retirar bloques existentes.' else null end);
end $$;

create or replace function public.guardar_periodo_horario(p_id uuid,p_version timestamptz,p_inicio text,p_fin text,p_confirmar boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.periodos; inicio time; fin time;
begin
 if not coalesce(private.admin(),false) then raise exception 'Solo Dirección y Secretaría pueden configurar periodos' using errcode='42501'; end if;
 if p_inicio is null or p_fin is null or p_inicio!~'^[0-2][0-9]:[0-5][0-9]$' or p_fin!~'^[0-2][0-9]:[0-5][0-9]$'
 then raise exception 'Introduce las horas reales en formato HH:MM' using errcode='23514'; end if;
 inicio:=p_inicio::time; fin:=p_fin::time;
 if fin-inicio<>interval '40 minutes' or inicio<time '14:00' or fin>time '18:05' then raise exception 'Cada periodo debe durar 40 minutos entre 14:00 y 18:05' using errcode='23514'; end if;
 if p_confirmar is distinct from true then raise exception 'Confirma que estas horas se aplican a todos los cursos de la gestión' using errcode='23514'; end if;
 select * into p from public.periodos where id=p_id for update;
 if p.id is null or p_version is distinct from p.updated_at then raise exception 'Otra persona modificó el periodo. Recarga antes de guardar' using errcode='23514'; end if;
 if not exists(select 1 from public.gestiones where id=p.gestion_id and activo) then raise exception 'La gestión está inactiva' using errcode='23514'; end if;
 -- El trigger base serializa por gestión y rechaza superposición incluso en SQL directo.
 update public.periodos set hora_inicio=inicio,hora_fin=fin where id=p.id;
 return p.id;
end $$;

create or replace function public.guardar_bloque_horario(p_curso uuid,p_id uuid,p_version timestamptz,p_asignacion uuid,p_asignacion_version timestamptz,p_periodo uuid,p_periodo_version timestamptz,p_dia integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.cursos; a public.asignaciones_docente; p public.periodos; h public.horarios; v_id uuid;
begin
 if not coalesce(private.admin(),false) then raise exception 'Solo Dirección y Secretaría pueden gestionar horarios' using errcode='42501'; end if;
 if p_dia is null or p_dia not between 1 and 5 then raise exception 'Selecciona un día de lunes a viernes' using errcode='23514'; end if;
 select * into p from public.periodos where id=p_periodo for share;
 if p.id is null or p.hora_inicio is null then raise exception 'Configura las horas reales del periodo antes de asignarlo' using errcode='23514'; end if;
 if p_periodo_version is distinct from p.updated_at then raise exception 'Otra persona modificó el periodo. Recarga antes de guardar' using errcode='23514'; end if;
 select * into a from public.asignaciones_docente where id=p_asignacion for share;
 if a.id is null or p_asignacion_version is distinct from a.updated_at then raise exception 'Otra persona modificó la asignación. Recarga antes de guardar' using errcode='23514'; end if;
 select * into c from public.cursos where id=p_curso for share;
 if c.id is null or not c.activo or not exists(select 1 from public.gestiones where id=c.gestion_id and activo)
 then raise exception 'Selecciona un curso y una gestión activos' using errcode='23514'; end if;
 if a.curso_id<>c.id or p.gestion_id<>c.gestion_id or not a.activo then raise exception 'Selecciona una materia activa del curso y un periodo de su gestión' using errcode='23514'; end if;
 perform 1 from public.docentes where id=a.docente_id and activo for share;
 if not found then raise exception 'El docente de la asignación está inactivo' using errcode='23514'; end if;
 perform 1 from public.asignaturas where id=a.asignatura_id and activo for share;
 if not found then raise exception 'La materia de la asignación está inactiva' using errcode='23514'; end if;
 if p_id is not null then
  select * into h from public.horarios where id=p_id and curso_id=c.id for update;
  if h.id is null or p_version is distinct from h.updated_at then raise exception 'Otra persona modificó el bloque. Recarga antes de guardar' using errcode='23514'; end if;
 end if;
 -- Las claves únicas de curso/día/periodo y docente/día/periodo protegen también
 -- frente a dos transacciones concurrentes; nunca sustituirlas por un precheck.
 if p_id is null then
  insert into public.horarios(curso_id,gestion_id,asignacion_docente_id,docente_id,dia_semana,periodo_id)
  values(c.id,c.gestion_id,a.id,a.docente_id,p_dia,p.id) returning id into v_id;
 else
  update public.horarios set asignacion_docente_id=a.id,docente_id=a.docente_id,dia_semana=p_dia,periodo_id=p.id where id=h.id returning id into v_id;
 end if;
 return v_id;
end $$;

create or replace function public.retirar_bloque_horario(p_id uuid,p_version timestamptz,p_confirmar boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare h public.horarios;
begin
 if not coalesce(private.admin(),false) then raise exception 'Solo Dirección y Secretaría pueden gestionar horarios' using errcode='42501'; end if;
 if p_confirmar is distinct from true then raise exception 'Confirma que deseas retirar el bloque del horario' using errcode='23514'; end if;
 select * into h from public.horarios where id=p_id for update;
 if h.id is null or p_version is distinct from h.updated_at then raise exception 'Otra persona modificó el bloque. Recarga antes de retirarlo' using errcode='23514'; end if;
 delete from public.horarios where id=h.id;
 return h.id;
end $$;
revoke all on function public.consultar_horario_curso(uuid),public.guardar_periodo_horario(uuid,timestamptz,text,text,boolean),public.guardar_bloque_horario(uuid,uuid,timestamptz,uuid,timestamptz,uuid,timestamptz,integer),public.retirar_bloque_horario(uuid,timestamptz,boolean) from public,anon;
grant execute on function public.consultar_horario_curso(uuid),public.guardar_periodo_horario(uuid,timestamptz,text,text,boolean),public.guardar_bloque_horario(uuid,uuid,timestamptz,uuid,timestamptz,uuid,timestamptz,integer),public.retirar_bloque_horario(uuid,timestamptz,boolean) to authenticated,service_role;
commit;
