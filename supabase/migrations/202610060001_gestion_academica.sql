-- Fase 3. Ejecutar DESPUÉS de 202610050001_base.sql.
-- RPC transaccionales con la sesión del usuario y RLS; nunca service_role.
begin;

create or replace function public.guardar_ficha_academica(
 p_tipo text, p_id uuid, p_persona jsonb, p_ficha jsonb,
 p_version timestamptz, p_persona_version timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_persona uuid; v_id uuid; v_version timestamptz; v_persona_version timestamptz;
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if p_tipo is null or p_tipo not in ('estudiantes','tutores') then raise exception 'Tipo de ficha inválido' using errcode='23514'; end if;
 if jsonb_typeof(p_persona) is distinct from 'object' or jsonb_typeof(p_ficha) is distinct from 'object'
   or nullif(btrim(p_persona->>'nombres'),'') is null or length(p_persona->>'nombres')>120
   or length(coalesce(p_persona->>'apellido_paterno',''))>120 or length(coalesce(p_persona->>'apellido_materno',''))>120
   or length(coalesce(p_persona->>'ci',''))>40 or length(coalesce(p_persona->>'telefono',''))>40
   or length(coalesce(p_persona->>'direccion',''))>500 or length(coalesce(p_ficha->>'rude',''))>40
 then raise exception 'Revisa los datos de la ficha' using errcode='23514'; end if;
 if p_id is null then
   insert into public.personas(nombres,apellido_paterno,apellido_materno,ci,telefono,direccion)
   values(btrim(p_persona->>'nombres'),btrim(coalesce(p_persona->>'apellido_paterno','')),btrim(coalesce(p_persona->>'apellido_materno','')),
     nullif(btrim(p_persona->>'ci'),''),nullif(btrim(p_persona->>'telefono'),''),nullif(btrim(p_persona->>'direccion'),'')) returning id into v_persona;
 else
   if p_tipo='estudiantes' then
     select persona_id,updated_at into v_persona,v_version from public.estudiantes where id=p_id for update;
   else
     select persona_id,updated_at into v_persona,v_version from public.tutores where id=p_id for update;
   end if;
   if v_persona is null then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
   select updated_at into v_persona_version from public.personas where id=v_persona for update;
   if p_version is null or p_persona_version is null or v_version is distinct from p_version or v_persona_version is distinct from p_persona_version then
     raise exception 'Otra persona modificó la ficha. Recarga antes de guardar' using errcode='23514';
   end if;
   update public.personas set nombres=btrim(p_persona->>'nombres'),apellido_paterno=btrim(coalesce(p_persona->>'apellido_paterno','')),
     apellido_materno=btrim(coalesce(p_persona->>'apellido_materno','')),ci=nullif(btrim(p_persona->>'ci'),''),
     telefono=nullif(btrim(p_persona->>'telefono'),''),direccion=nullif(btrim(p_persona->>'direccion'),'') where id=v_persona;
 end if;
 if p_tipo='estudiantes' then
   if p_id is null then
     insert into public.estudiantes(persona_id,rude,genero,fecha_nacimiento,activo)
     values(v_persona,nullif(btrim(p_ficha->>'rude'),''),nullif(p_ficha->>'genero',''),nullif(p_ficha->>'fecha_nacimiento','')::date,coalesce((p_ficha->>'activo')::boolean,true)) returning id into v_id;
   else
     update public.estudiantes set rude=nullif(btrim(p_ficha->>'rude'),''),genero=nullif(p_ficha->>'genero',''),fecha_nacimiento=nullif(p_ficha->>'fecha_nacimiento','')::date,
       activo=coalesce((p_ficha->>'activo')::boolean,true) where id=p_id returning id into v_id;
   end if;
 else
   if p_id is null then
     insert into public.tutores(persona_id,activo) values(v_persona,coalesce((p_ficha->>'activo')::boolean,true)) returning id into v_id;
   else
     update public.tutores set activo=coalesce((p_ficha->>'activo')::boolean,true) where id=p_id returning id into v_id;
   end if;
 end if;
 return v_id;
end $$;

create or replace function public.guardar_curso_academico(
 p_id uuid,p_gestion uuid,p_grado integer,p_paralelo text,p_activo boolean,p_version timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_curso public.cursos;
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if p_activo is null then raise exception 'Revisa el estado del curso' using errcode='23514'; end if;
 if p_id is null then
   perform 1 from public.gestiones where id=p_gestion and activo;
   if not found then raise exception 'Selecciona una gestión activa' using errcode='23514'; end if;
   insert into public.cursos(gestion_id,grado_id,paralelo,activo) values(p_gestion,p_grado,upper(btrim(p_paralelo)),p_activo) returning id into v_id;
 else
   select * into v_curso from public.cursos where id=p_id for update;
   if not found then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
   if p_version is null or v_curso.updated_at is distinct from p_version then raise exception 'Otra persona modificó la ficha. Recarga antes de guardar' using errcode='23514'; end if;
   -- Curso, grado y gestión son claves inmutables en la base inicial.
   if v_curso.gestion_id is distinct from p_gestion or v_curso.grado_id is distinct from p_grado or v_curso.paralelo is distinct from upper(btrim(p_paralelo)) then
     raise exception 'El curso conserva su gestión, grado y paralelo' using errcode='23514'; end if;
   update public.cursos set activo=p_activo where id=p_id returning id into v_id;
 end if;
 return v_id;
end $$;

create or replace function public.vincular_tutor_academico(
 p_estudiante uuid,p_tutor uuid,p_parentesco text,p_autorizado boolean,p_principal boolean
) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if nullif(btrim(p_parentesco),'') is null or length(p_parentesco)>80 or p_autorizado is null or p_principal is null then
   raise exception 'Revisa los datos del vínculo' using errcode='23514'; end if;
 -- Serializa el cambio de contacto principal para evitar dos responsables principales.
 perform 1 from public.estudiantes where id=p_estudiante and activo for update;
 if not found then raise exception 'Selecciona un estudiante activo' using errcode='23514'; end if;
 perform 1 from public.tutores where id=p_tutor and activo for share;
 if not found then raise exception 'Selecciona un tutor activo' using errcode='23514'; end if;
 if p_principal then update public.estudiante_tutor set contacto_principal=false where estudiante_id=p_estudiante and contacto_principal and tutor_id<>p_tutor; end if;
 insert into public.estudiante_tutor(estudiante_id,tutor_id,parentesco,autorizado_consulta,contacto_principal)
 values(p_estudiante,p_tutor,btrim(p_parentesco),p_autorizado,p_principal)
 on conflict(estudiante_id,tutor_id) do update set parentesco=excluded.parentesco,autorizado_consulta=excluded.autorizado_consulta,contacto_principal=excluded.contacto_principal;
end $$;

create or replace function public.guardar_matricula_academica(
 p_id uuid,p_estudiante uuid,p_curso uuid,p_ingreso date,p_salida date,p_estado text,p_version timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_gestion uuid; v_matricula public.matriculas;
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if p_ingreso is null or p_estado is null or p_estado not in ('ACTIVA','RETIRADA','FINALIZADA') then raise exception 'Revisa los datos de la matrícula' using errcode='23514'; end if;
 if p_estado='ACTIVA' and p_salida is not null then raise exception 'Revisa los datos de la matrícula: activa sin fecha de salida' using errcode='23514'; end if;
 -- Mismo orden de bloqueo que el vínculo: estudiante antes de curso/matrícula.
 perform 1 from public.estudiantes where id=p_estudiante for update;
 if not found then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
 if p_id is null then
   if p_estado<>'ACTIVA' or p_salida is not null then raise exception 'Una matrícula nueva debe estar activa' using errcode='23514'; end if;
   if not exists(select 1 from public.estudiantes where id=p_estudiante and activo) then raise exception 'Selecciona un estudiante activo' using errcode='23514'; end if;
   select c.gestion_id into v_gestion from public.cursos c join public.gestiones g on g.id=c.gestion_id where c.id=p_curso and c.activo and g.activo for share of c;
   if not found then raise exception 'Selecciona un curso de una gestión activa' using errcode='23514'; end if;
   insert into public.matriculas(estudiante_id,curso_id,gestion_id,fecha_ingreso,fecha_salida,estado)
   values(p_estudiante,p_curso,v_gestion,p_ingreso,p_salida,p_estado) returning id into v_id;
 else
   select * into v_matricula from public.matriculas where id=p_id for update;
   if not found then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
   if p_version is null or v_matricula.updated_at is distinct from p_version then raise exception 'Otra persona modificó la ficha. Recarga antes de guardar' using errcode='23514'; end if;
   if v_matricula.estudiante_id is distinct from p_estudiante or v_matricula.curso_id is distinct from p_curso then raise exception 'La matrícula conserva su estudiante y curso' using errcode='23514'; end if;
   update public.matriculas set fecha_ingreso=p_ingreso,fecha_salida=p_salida,estado=p_estado where id=p_id returning id into v_id;
 end if;
 return v_id;
end $$;

revoke all on function public.guardar_ficha_academica(text,uuid,jsonb,jsonb,timestamptz,timestamptz) from public,anon;
revoke all on function public.guardar_curso_academico(uuid,uuid,integer,text,boolean,timestamptz) from public,anon;
revoke all on function public.vincular_tutor_academico(uuid,uuid,text,boolean,boolean) from public,anon;
revoke all on function public.guardar_matricula_academica(uuid,uuid,uuid,date,date,text,timestamptz) from public,anon;
grant execute on function public.guardar_ficha_academica(text,uuid,jsonb,jsonb,timestamptz,timestamptz) to authenticated;
grant execute on function public.guardar_curso_academico(uuid,uuid,integer,text,boolean,timestamptz) to authenticated;
grant execute on function public.vincular_tutor_academico(uuid,uuid,text,boolean,boolean) to authenticated;
grant execute on function public.guardar_matricula_academica(uuid,uuid,uuid,date,date,text,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
