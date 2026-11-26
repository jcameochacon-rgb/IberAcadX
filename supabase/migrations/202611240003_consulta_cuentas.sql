begin;
create policy perfiles_gestion_select on public.perfiles for select to authenticated
 using (private.director() or (private.rol()='SECRETARIA' and rol in ('DOCENTE','PADRE','ESTUDIANTE')));
commit;
