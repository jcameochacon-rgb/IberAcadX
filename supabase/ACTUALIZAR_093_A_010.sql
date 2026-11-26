-- Ejecutar UNA VEZ sobre una instalación 0.9.3. No ejecutar de nuevo los archivos individuales.
-- IberAcad 0.10. Roles conservan sus identificadores para no romper cuentas existentes.
begin;
-- Extender solo los permisos académicos de escritura; NO ampliar private.director().
do $$ declare f record; begin
 for f in select p.oid,pg_get_functiondef(p.oid) body from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='private' and p.proname in ('editar_asignacion','editar_jornada'))
 or (n.nspname='public' and p.proname in ('consultar_asistencia_curso','guardar_asistencia_curso','cambiar_publicacion_asistencia'))
 loop execute replace(f.body,'private.director()','private.admin()'); end loop;
end $$;
drop policy jornadas_asistencia_insert on public.jornadas_asistencia;
create policy jornadas_asistencia_insert on public.jornadas_asistencia for insert to authenticated with check(private.admin() or private.docente_curso(curso_id));
drop policy jornadas_asistencia_update on public.jornadas_asistencia;
create policy jornadas_asistencia_update on public.jornadas_asistencia for update to authenticated using(private.admin() or private.docente_curso(curso_id)) with check(private.admin() or private.docente_curso(curso_id));
drop policy jornadas_asistencia_delete on public.jornadas_asistencia;
create policy jornadas_asistencia_delete on public.jornadas_asistencia for delete to authenticated using(private.admin() or private.docente_curso(curso_id));
create or replace function public.administrar_cuenta(p_id uuid,p_persona uuid,p_rol public.rol_usuario,p_activo boolean,p_eliminar boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.rol_usuario; target public.perfiles;
begin
 -- Serializar cambios de cuentas y verificar nuevamente permisos bajo el bloqueo.
 perform pg_advisory_xact_lock(40730423);
 actor:=private.rol();
 if actor is null or actor not in ('DIRECTOR','SECRETARIA') then raise exception 'Sin permiso' using errcode='42501'; end if;
 if p_id=auth.uid() then raise exception 'No puedes modificar tu propio acceso' using errcode='42501'; end if;
 select * into target from public.perfiles where id=p_id for update;
 if actor='SECRETARIA' and (p_rol in ('DIRECTOR','SECRETARIA') or target.rol in ('DIRECTOR','SECRETARIA')) then raise exception 'Cuenta protegida' using errcode='42501'; end if;
 if p_eliminar then
  if target.id is null then raise exception 'Cuenta inexistente'; end if;
  delete from public.perfiles where id=p_id;
 elsif target.id is null then
  insert into public.perfiles(id,persona_id,rol,activo) values(p_id,p_persona,p_rol,p_activo);
 else
  update public.perfiles set rol=p_rol,activo=p_activo where id=p_id;
 end if;
end $$;
revoke all on function public.administrar_cuenta(uuid,uuid,public.rol_usuario,boolean,boolean) from public,anon;
grant execute on function public.administrar_cuenta(uuid,uuid,public.rol_usuario,boolean,boolean) to authenticated;
-- Historial de reportes guardados: cada usuario administra sus propios filtros.
create table public.reportes_guardados (
 id uuid primary key default gen_random_uuid(), propietario_id uuid not null references public.perfiles(id),
 nombre text not null check(length(btrim(nombre)) between 1 and 150), parametros text not null check(length(parametros)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.reportes_guardados enable row level security;
grant select,insert,update,delete on public.reportes_guardados to authenticated;
create policy reportes_select on public.reportes_guardados for select to authenticated using(propietario_id=auth.uid());
create policy reportes_write on public.reportes_guardados for all to authenticated using(propietario_id=auth.uid() and private.admin()) with check(propietario_id=auth.uid() and private.admin());
-- Comunicados se retira de la aplicación. Las tablas se archivan sin perder datos.
create schema if not exists archivo;
revoke all on schema archivo from public,anon,authenticated;
alter table public.lecturas_comunicado set schema archivo;
alter table public.destinatarios_comunicado set schema archivo;
alter table public.comunicados set schema archivo;
commit;

begin;
create function public.eliminar_registro_academico(p_tipo text,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare c public.calificaciones_trimestrales; a public.asistencias; j public.jornadas_asistencia;
begin
 if p_tipo='calificaciones' then
 select * into c from public.calificaciones_trimestrales where id=p_id for update;
 if not found or not private.editar_asignacion(c.asignacion_docente_id) then raise exception 'Sin permiso' using errcode='42501'; end if;
 if c.estado<>'BORRADOR' then raise exception 'Retira la publicación'; end if;
 delete from public.notas_criterios where matricula_id=c.matricula_id and criterio_id in (select id from public.criterios_evaluacion where asignacion_docente_id=c.asignacion_docente_id and trimestre_id=c.trimestre_id);
 delete from public.calificaciones_trimestrales where id=c.id;
 elsif p_tipo='asistencia' then
 select * into a from public.asistencias where id=p_id;
 if not found or not private.editar_jornada(a.jornada_id) then raise exception 'Sin permiso' using errcode='42501'; end if;
 select * into j from public.jornadas_asistencia where id=a.jornada_id for update;
 if j.estado<>'BORRADOR' then raise exception 'Retira la publicación'; end if;
 delete from public.asistencias where id=p_id;
 else raise exception 'Tipo inválido'; end if;
end $$;
revoke all on function public.eliminar_registro_academico(text,uuid) from public,anon;
grant execute on function public.eliminar_registro_academico(text,uuid) to authenticated;
commit;

begin;
create policy perfiles_gestion_select on public.perfiles for select to authenticated
 using (private.director() or (private.rol()='SECRETARIA' and rol in ('DOCENTE','PADRE','ESTUDIANTE')));
commit;
