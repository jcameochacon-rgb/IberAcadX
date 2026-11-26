-- Fase 8. No eleva privilegios ni publica avisos automáticamente.
create or replace function public.consultar_comunicados(p_pagina integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if private.rol() is null then raise exception 'Sin acceso' using errcode='42501'; end if;
 if p_pagina is null or p_pagina<1 or p_pagina>100000 then raise exception 'Página inválida' using errcode='23514'; end if;
 return jsonb_build_object('total',(select count(*) from public.comunicados),'items',coalesce((select jsonb_agg(to_jsonb(x)) from
 (select id,titulo,estado,institucional,updated_at,publicado_at from public.comunicados order by updated_at desc,id limit 20 offset (p_pagina-1)*20) x),'[]'::jsonb));
end $$;

create or replace function public.consultar_comunicado(p_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c public.comunicados;
begin
 select * into c from public.comunicados where id=p_id;
 if not found or private.rol() is null then raise exception 'Comunicado no disponible' using errcode='42501'; end if;
 return to_jsonb(c)||jsonb_build_object('puede_editar',private.editar_comunicado(c.id),'destinatarios',coalesce((select jsonb_agg(jsonb_build_object('curso_id',d.curso_id,'perfil_id',d.perfil_id,'nombre',concat(cu.grado_id,'° ',cu.paralelo,' · ',g.anio))) from public.destinatarios_comunicado d left join public.cursos cu on cu.id=d.curso_id left join public.gestiones g on g.id=cu.gestion_id where d.comunicado_id=c.id),'[]'::jsonb));
end $$;

create or replace function public.guardar_comunicado(p_id uuid,p_version timestamptz,p_titulo text,p_contenido text,p_institucional boolean,p_cursos jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare c public.comunicados; cid uuid; target uuid;
begin
 if coalesce(private.rol()::text,'') not in ('DIRECTOR','SECRETARIA','DOCENTE') then raise exception 'Sin permiso para redactar' using errcode='42501'; end if;
 if p_institucional is null or (p_institucional and not private.admin()) then raise exception 'Solo administración puede crear avisos institucionales' using errcode='42501'; end if;
 if p_titulo is null or length(btrim(p_titulo)) not between 1 and 160 or p_contenido is null or length(btrim(p_contenido)) not between 1 and 10000 then raise exception 'Título de 1 a 160 caracteres y contenido de 1 a 10000' using errcode='23514'; end if;
 if p_cursos is null or jsonb_typeof(p_cursos)<>'array' then raise exception 'Selecciona los cursos' using errcode='23514'; end if;
 if jsonb_array_length(p_cursos)>100 or (p_institucional and jsonb_array_length(p_cursos)>0) or (not p_institucional and jsonb_array_length(p_cursos)=0) then raise exception 'Elige entre 1 y 100 cursos o un aviso institucional' using errcode='23514'; end if;
 for target in select distinct value::uuid from jsonb_array_elements_text(p_cursos) loop
  perform 1 from public.cursos cu join public.gestiones g on g.id=cu.gestion_id where cu.id=target and cu.activo and g.activo and (private.admin() or private.docente_curso(cu.id));
  if not found then raise exception 'Curso inactivo o sin permiso' using errcode='42501'; end if;
 end loop;
 if p_id is not null then
  select * into c from public.comunicados where id=p_id for update;
  if not found or not private.editar_comunicado(p_id) then raise exception 'Sin permiso para editar' using errcode='42501'; end if;
  if c.updated_at is distinct from p_version then raise exception 'Otra persona modificó este aviso. Recarga antes de guardar.' using errcode='23514'; end if;
  if c.estado<>'BORRADOR' then raise exception 'Retira la publicación antes de editar' using errcode='23514'; end if;
  if exists(select 1 from public.destinatarios_comunicado where comunicado_id=p_id and perfil_id is not null) then raise exception 'Este aviso tiene destinatarios individuales; esta pantalla no permite cambiarlos.' using errcode='23514'; end if;
  update public.comunicados set titulo=btrim(p_titulo),contenido=btrim(p_contenido),institucional=p_institucional where id=p_id;
  delete from public.destinatarios_comunicado where comunicado_id=p_id;
  if exists(select 1 from public.destinatarios_comunicado where comunicado_id=p_id) then raise exception 'Ya no puedes modificar todos los destinatarios' using errcode='42501'; end if;
  cid:=p_id;
 else
  cid:=gen_random_uuid();
  insert into public.comunicados(id,autor_id,titulo,contenido,institucional) values(cid,auth.uid(),btrim(p_titulo),btrim(p_contenido),p_institucional);
 end if;
 insert into public.destinatarios_comunicado(comunicado_id,curso_id) select cid,value::uuid from jsonb_array_elements_text(p_cursos) group by value::uuid;
 return cid;
end $$;

create or replace function public.cambiar_estado_comunicado(p_id uuid,p_version timestamptz,p_publicar boolean,p_confirmar boolean) returns uuid
language plpgsql security invoker set search_path='' as $$
declare c public.comunicados;
begin
 if p_confirmar is distinct from true or p_publicar is null then raise exception 'Confirma la acción' using errcode='23514'; end if;
 select * into c from public.comunicados where id=p_id for update;
 if not found or not private.editar_comunicado(p_id) then raise exception 'Sin permiso para publicar' using errcode='42501'; end if;
 if c.updated_at is distinct from p_version then raise exception 'Otra persona modificó este aviso. Recarga antes de guardar.' using errcode='23514'; end if;
 if (p_publicar and c.estado<>'BORRADOR') or (not p_publicar and c.estado<>'PUBLICADO') then raise exception 'El estado del aviso cambió. Recarga.' using errcode='23514'; end if;
 if p_publicar and not c.institucional then
  if not exists(select 1 from public.destinatarios_comunicado where comunicado_id=p_id) then raise exception 'Selecciona destinatarios' using errcode='23514'; end if;
  if exists(select 1 from public.destinatarios_comunicado d left join public.cursos cu on cu.id=d.curso_id left join public.gestiones g on g.id=cu.gestion_id where d.comunicado_id=p_id and (d.perfil_id is not null or cu.id is null or not cu.activo or not g.activo or (not private.admin() and not private.docente_curso(cu.id)))) then raise exception 'Revisa los cursos y tus permisos antes de publicar' using errcode='23514'; end if;
 end if;
 update public.comunicados set estado=case when p_publicar then 'PUBLICADO'::public.estado_publicacion else 'BORRADOR'::public.estado_publicacion end where id=p_id;
 return p_id;
end $$;
revoke all on function public.consultar_comunicados(integer),public.consultar_comunicado(uuid),public.guardar_comunicado(uuid,timestamptz,text,text,boolean,jsonb),public.cambiar_estado_comunicado(uuid,timestamptz,boolean,boolean) from public,anon;
grant execute on function public.consultar_comunicados(integer),public.consultar_comunicado(uuid),public.guardar_comunicado(uuid,timestamptz,text,text,boolean,jsonb),public.cambiar_estado_comunicado(uuid,timestamptz,boolean,boolean) to authenticated,service_role;
