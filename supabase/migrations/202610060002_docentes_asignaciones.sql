-- Fase 4. Ejecutar después de las migraciones base y Gestión académica.
begin;

create or replace function public.guardar_docente_academico(
 p_id uuid,p_persona_id uuid,p_persona jsonb,p_especialidad text,p_activo boolean,
 p_version timestamptz,p_persona_version timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_persona uuid; v_version timestamptz; v_persona_version timestamptz;
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if p_activo is null or length(coalesce(p_especialidad,''))>200 then raise exception 'Revisa los datos del docente' using errcode='23514'; end if;
 if p_id is null and p_persona_id is not null then
   -- Reutilizar conserva los datos personales. Nunca acepta un rol o una cuenta Auth.
   select id into v_persona from public.personas where id=p_persona_id;
   if not found then raise exception 'Selecciona una ficha personal existente' using errcode='23514'; end if;
 else
   if jsonb_typeof(p_persona) is distinct from 'object' or nullif(btrim(p_persona->>'nombres'),'') is null
     or length(p_persona->>'nombres')>120 or length(coalesce(p_persona->>'apellido_paterno',''))>120
     or length(coalesce(p_persona->>'apellido_materno',''))>120 or length(coalesce(p_persona->>'ci',''))>40
     or length(coalesce(p_persona->>'telefono',''))>40 or length(coalesce(p_persona->>'direccion',''))>500
   then raise exception 'Revisa los datos de la ficha personal' using errcode='23514'; end if;
   if p_id is null then
     insert into public.personas(nombres,apellido_paterno,apellido_materno,ci,telefono,direccion)
     values(btrim(p_persona->>'nombres'),btrim(coalesce(p_persona->>'apellido_paterno','')),btrim(coalesce(p_persona->>'apellido_materno','')),
       nullif(btrim(p_persona->>'ci'),''),nullif(btrim(p_persona->>'telefono'),''),nullif(btrim(p_persona->>'direccion'),'')) returning id into v_persona;
   else
     select persona_id,updated_at into v_persona,v_version from public.docentes where id=p_id for update;
     if not found then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
     if p_persona_id is not null and p_persona_id<>v_persona then raise exception 'El docente conserva su ficha personal' using errcode='23514'; end if;
     select updated_at into v_persona_version from public.personas where id=v_persona for update;
     if not found then raise exception 'Tu cuenta no puede editar esta ficha personal' using errcode='42501'; end if;
     if p_version is null or p_persona_version is null or v_version is distinct from p_version or v_persona_version is distinct from p_persona_version then
       raise exception 'Otra persona modificó la ficha. Recarga antes de guardar' using errcode='23514'; end if;
     update public.personas set nombres=btrim(p_persona->>'nombres'),apellido_paterno=btrim(coalesce(p_persona->>'apellido_paterno','')),
       apellido_materno=btrim(coalesce(p_persona->>'apellido_materno','')),ci=nullif(btrim(p_persona->>'ci'),''),
       telefono=nullif(btrim(p_persona->>'telefono'),''),direccion=nullif(btrim(p_persona->>'direccion'),'') where id=v_persona;
   end if;
 end if;
 if p_id is null then
   insert into public.docentes(persona_id,especialidad,activo) values(v_persona,nullif(btrim(p_especialidad),''),p_activo) returning id into v_id;
 else
   update public.docentes set especialidad=nullif(btrim(p_especialidad),''),activo=p_activo where id=p_id returning id into v_id;
 end if;
 return v_id;
end $$;

-- También protege escrituras directas por Data API, no solo la RPC de esta fase.
create or replace function private.proteger_docente_asignacion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.docente_id is distinct from old.docente_id and (
   exists(select 1 from public.horarios where asignacion_docente_id=old.id) or
   exists(select 1 from public.criterios_evaluacion where asignacion_docente_id=old.id) or
   exists(select 1 from public.calificaciones_trimestrales where asignacion_docente_id=old.id) or
   exists(select 1 from public.avances_curriculares where asignacion_docente_id=old.id) or
   exists(select 1 from public.observaciones_estudiantes where asignacion_docente_id=old.id)
 ) then raise exception 'La asignación ya tiene registros académicos. Conserva el docente para proteger el historial' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.proteger_docente_asignacion() from public,anon,authenticated;
drop trigger if exists aa_docente_historial on public.asignaciones_docente;
create trigger aa_docente_historial before update on public.asignaciones_docente for each row execute function private.proteger_docente_asignacion();

create or replace function public.guardar_asignacion_academica(
 p_id uuid,p_docente uuid,p_curso uuid,p_asignatura uuid,p_activo boolean,p_version timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_gestion uuid; v_actual public.asignaciones_docente;
begin
 if not private.admin() then raise exception 'Solo Dirección y Secretaría pueden gestionar registros' using errcode='42501'; end if;
 if p_docente is null or p_curso is null or p_asignatura is null or p_activo is null then raise exception 'Revisa los datos de la asignación' using errcode='23514'; end if;
 if p_id is not null then
   select * into v_actual from public.asignaciones_docente where id=p_id for update;
   if not found then raise exception 'El registro ya no está disponible' using errcode='23514'; end if;
   if p_version is null or v_actual.updated_at is distinct from p_version then raise exception 'Otra persona modificó la ficha. Recarga antes de guardar' using errcode='23514'; end if;
   if v_actual.curso_id<>p_curso or v_actual.asignatura_id<>p_asignatura then raise exception 'La asignación conserva su curso y materia' using errcode='23514'; end if;
 end if;
 if p_id is null or p_activo or p_docente is distinct from v_actual.docente_id then
   perform 1 from public.docentes where id=p_docente and activo for share;
   if not found then raise exception 'Selecciona un docente activo' using errcode='23514'; end if;
   select c.gestion_id into v_gestion from public.cursos c join public.gestiones g on g.id=c.gestion_id
     where c.id=p_curso and c.activo and g.activo for share of c;
   if not found then raise exception 'Selecciona un curso de una gestión activa' using errcode='23514'; end if;
   perform 1 from public.asignaturas where id=p_asignatura and activo for share;
   if not found then raise exception 'Selecciona una materia activa' using errcode='23514'; end if;
 end if;
 if p_id is null then
   insert into public.asignaciones_docente(docente_id,curso_id,gestion_id,asignatura_id,activo)
     values(p_docente,p_curso,v_gestion,p_asignatura,p_activo) returning id into v_id;
 else
   update public.asignaciones_docente set docente_id=p_docente,activo=p_activo where id=p_id returning id into v_id;
 end if;
 return v_id;
end $$;

revoke all on function public.guardar_docente_academico(uuid,uuid,jsonb,text,boolean,timestamptz,timestamptz) from public,anon;
revoke all on function public.guardar_asignacion_academica(uuid,uuid,uuid,uuid,boolean,timestamptz) from public,anon;
grant execute on function public.guardar_docente_academico(uuid,uuid,jsonb,text,boolean,timestamptz,timestamptz) to authenticated;
grant execute on function public.guardar_asignacion_academica(uuid,uuid,uuid,uuid,boolean,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
