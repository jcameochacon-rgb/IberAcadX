-- SOLO después de 202610050001_base.sql, en SQL Editor como postgres.
-- Primero crear/invitar al usuario desde Authentication > Users.
-- Editar los tres campos siguientes. No pegar contraseñas ni claves aquí.
begin;
do $$
declare
 v_email text := 'CAMBIA_POR_TU_CORREO';
 v_nombres text := 'CAMBIA_POR_NOMBRES';
 v_apellidos text := 'CAMBIA_POR_APELLIDOS';
 v_usuario uuid;
 v_persona uuid;
begin
 if v_email = 'CAMBIA_POR_TU_CORREO' or v_nombres = 'CAMBIA_POR_NOMBRES'
    or v_apellidos = 'CAMBIA_POR_APELLIDOS' then
  raise exception 'Editar correo, nombres y apellidos antes de ejecutar'; end if;
 select id into v_usuario from auth.users where lower(email)=lower(btrim(v_email));
 if v_usuario is null then raise exception 'Usuario no encontrado: créalo primero en Authentication > Users'; end if;
 if exists(select 1 from public.perfiles where id=v_usuario) then
  raise exception 'La cuenta ya tiene perfil: revisar su rol sin sobrescribirlo'; end if;
 if exists(select 1 from public.perfiles where rol='DIRECTOR' and activo) then
  raise exception 'Ya existe Dirección activa: altas posteriores desde la gestión de usuarios'; end if;
 insert into public.personas(nombres,apellido_paterno) values(btrim(v_nombres),btrim(v_apellidos)) returning id into v_persona;
 insert into public.perfiles(id,persona_id,rol,activo) values(v_usuario,v_persona,'DIRECTOR',true);
end $$;
commit;
select p.id,p.rol,p.activo,s.nombres,s.apellido_paterno
from public.perfiles p join public.personas s on s.id=p.persona_id where p.rol='DIRECTOR';
