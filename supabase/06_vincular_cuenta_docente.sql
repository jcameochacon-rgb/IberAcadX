-- Ejecutar desde SQL Editor tras crear al usuario en Authentication > Users.
-- Cambia SOLO las dos asignaciones al principio; conserva los valores de validación.
-- UUID docente: el valor de ?id= en la URL de su ficha en Gestión académica.
begin;
do $$
declare
 v_correo text := 'CAMBIA_POR_CORREO_DOCENTE';
 v_docente text := 'CAMBIA_POR_UUID_DOCENTE';
 v_usuario uuid; v_persona uuid;
begin
 if v_correo='CAMBIA_POR_CORREO_DOCENTE' or v_docente='CAMBIA_POR_UUID_DOCENTE' then raise exception 'Edita correo y UUID docente antes de ejecutar'; end if;
 select id into v_usuario from auth.users where lower(email)=lower(btrim(v_correo));
 if v_usuario is null then raise exception 'Crea primero la cuenta en Authentication > Users'; end if;
 select persona_id into v_persona from public.docentes where id=v_docente::uuid and activo;
 if v_persona is null then raise exception 'No se encontró un docente activo con ese UUID'; end if;
 if exists(select 1 from public.perfiles where id=v_usuario or persona_id=v_persona) then
   raise exception 'La cuenta o la persona ya tiene perfil. Revisa su vínculo y rol sin sobrescribirlos'; end if;
 insert into public.perfiles(id,persona_id,rol,activo) values(v_usuario,v_persona,'DOCENTE',true);
end $$;
commit;
